import { Router } from 'express';
import { query } from '../lib/db';
import { redis, cacheKeys } from '../lib/redis';
import { asyncHandler } from '../lib/asyncHandler';

export const analyticsRouter = Router();

// GET /api/analytics/kpis — cards do dashboard (Analytics Avançado & BI Embarcado)
analyticsRouter.get('/kpis', asyncHandler(async (_req, res) => {
  const cacheKey = cacheKeys.dashboardKpis();
  const cached = await redis.get(cacheKey);
  if (cached) return res.json({ ...JSON.parse(cached), cached: true });

  const [totalSuppliers, conformityRate, riskDistribution, categoryDistribution, blockedValue] =
    await Promise.all([
      query('SELECT COUNT(*)::int AS total FROM suppliers'),
      query(`
        SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'ativo') / GREATEST(COUNT(*),1), 1) AS rate
        FROM suppliers
      `),
      query(`
        SELECT rs.risk_level, COUNT(*)::int AS total
        FROM suppliers s
        JOIN LATERAL (
          SELECT risk_level FROM risk_scores WHERE supplier_id = s.id ORDER BY computed_at DESC LIMIT 1
        ) rs ON true
        GROUP BY rs.risk_level
      `),
      query(`SELECT category, COUNT(*)::int AS total FROM suppliers GROUP BY category ORDER BY category`),
      // Soma apenas as cotações que de fato ficaram fora da faixa de benchmark
      // (join direto por categoria de item, não por fornecedor — evitar
      // duplicar cotações que caem dentro da faixa via um join fan-out
      // com alertas não relacionados do mesmo fornecedor).
      query(`
        SELECT COALESCE(SUM(sq.quoted_price), 0)::numeric AS total
        FROM supplier_quotes sq
        JOIN pricing_benchmarks pb ON pb.item_category = sq.item_category
        WHERE sq.quoted_price > pb.market_p75 OR sq.quoted_price < pb.market_p25
      `),
    ]);

  const payload = {
    totalSuppliers: totalSuppliers.rows[0].total,
    conformityRatePct: Number(conformityRate.rows[0].rate),
    riskDistribution: riskDistribution.rows,
    categoryDistribution: categoryDistribution.rows,
    riskValueBlocked: Number(blockedValue.rows[0].total),
  };

  await redis.set(cacheKey, JSON.stringify(payload), { EX: 60 });
  res.json({ ...payload, cached: false });
}));

// GET /api/analytics/category-evolution — série trimestral (mock estrutural, baseado em dados atuais)
analyticsRouter.get('/category-evolution', asyncHandler(async (_req, res) => {
  const result = await query(`SELECT category, COUNT(*)::int AS total FROM suppliers GROUP BY category`);
  res.json({ current: result.rows });
}));
