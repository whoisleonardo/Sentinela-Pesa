import { Router } from 'express';
import { query } from '../lib/db';
import { redis, cacheKeys } from '../lib/redis';
import { asyncHandler } from '../lib/asyncHandler';

export const riskRouter = Router();

// GET /api/risk/:supplierId — cache-aside: tenta Redis, cai pro Postgres
riskRouter.get('/:supplierId', asyncHandler(async (req, res) => {
  const { supplierId } = req.params;
  const cacheKey = cacheKeys.riskScore(supplierId);

  const cached = await redis.get(cacheKey);
  if (cached) {
    return res.json({ ...JSON.parse(cached), cached: true });
  }

  const result = await query(
    'SELECT * FROM risk_scores WHERE supplier_id = $1 ORDER BY computed_at DESC LIMIT 1',
    [supplierId],
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Nenhum score de risco calculado ainda para este fornecedor' });
  }

  const payload = result.rows[0];
  await redis.set(cacheKey, JSON.stringify(payload), { EX: 300 });
  res.json({ ...payload, cached: false });
}));

// GET /api/risk/:supplierId/history
riskRouter.get('/:supplierId/history', asyncHandler(async (req, res) => {
  const { supplierId } = req.params;
  const result = await query(
    'SELECT score, risk_level, computed_at FROM risk_scores WHERE supplier_id = $1 ORDER BY computed_at ASC',
    [supplierId],
  );
  res.json({ history: result.rows });
}));

// GET /api/risk — ranking geral (top fornecedores em risco)
riskRouter.get('/', asyncHandler(async (_req, res) => {
  const result = await query(`
    SELECT s.id, s.name, rs.score, rs.risk_level, rs.computed_at
    FROM suppliers s
    JOIN LATERAL (
      SELECT score, risk_level, computed_at FROM risk_scores
      WHERE supplier_id = s.id ORDER BY computed_at DESC LIMIT 1
    ) rs ON true
    ORDER BY rs.score DESC
    LIMIT 50
  `);
  res.json({ ranking: result.rows });
}));
