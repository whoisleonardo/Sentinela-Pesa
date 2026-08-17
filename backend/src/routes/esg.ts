import { Router } from 'express';
import { query } from '../lib/db';
import { projectEsgTrajectory } from '../services/esgEngine';
import { asyncHandler } from '../lib/asyncHandler';

export const esgRouter = Router();

// GET /api/esg/:supplierId — histórico real + projeção futura (o gráfico do slide original)
esgRouter.get('/:supplierId', asyncHandler(async (req, res) => {
  const { supplierId } = req.params;

  const historyRes = await query(
    `SELECT score, category, reference_month FROM esg_scores
     WHERE supplier_id = $1 AND projected = false ORDER BY reference_month ASC`,
    [supplierId],
  );

  if (historyRes.rowCount === 0) {
    return res.status(404).json({ error: 'Nenhum score ESG calculado ainda para este fornecedor' });
  }

  const latest = historyRes.rows[historyRes.rowCount - 1];
  const projection = projectEsgTrajectory(Number(latest.score));

  res.json({
    history: historyRes.rows,
    projection,
    currentCategory: latest.category,
  });
}));

// GET /api/esg — visão consolidada por categoria (usado no dashboard)
esgRouter.get('/', asyncHandler(async (_req, res) => {
  const result = await query(`
    SELECT s.category AS supplier_category, COUNT(*) AS total,
      ROUND(AVG(es.score)::numeric, 1) AS avg_esg_score
    FROM suppliers s
    JOIN LATERAL (
      SELECT score FROM esg_scores WHERE supplier_id = s.id AND projected = false
      ORDER BY reference_month DESC LIMIT 1
    ) es ON true
    GROUP BY s.category
    ORDER BY s.category
  `);
  res.json({ breakdown: result.rows });
}));
