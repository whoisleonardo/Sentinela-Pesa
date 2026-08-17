import { Router } from 'express';
import { buildRelationshipGraph } from '../services/graphEngine';
import { redis, cacheKeys } from '../lib/redis';
import { asyncHandler } from '../lib/asyncHandler';

export const graphRouter = Router();

// GET /api/graph — grafo completo de relacionamento entre fornecedores
graphRouter.get('/', asyncHandler(async (_req, res) => {
  const cacheKey = cacheKeys.supplierGraph();
  const cached = await redis.get(cacheKey);
  if (cached) {
    return res.json({ ...JSON.parse(cached), cached: true });
  }

  const graph = await buildRelationshipGraph();
  await redis.set(cacheKey, JSON.stringify(graph), { EX: 120 });
  res.json({ ...graph, cached: false });
}));
