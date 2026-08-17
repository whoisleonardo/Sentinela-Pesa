import { Router } from 'express';
import { z } from 'zod';
import { query } from '../lib/db';
import { publishEvent, TOPICS } from '../lib/kafka';
import { redis, cacheKeys } from '../lib/redis';
import { asyncHandler } from '../lib/asyncHandler';

export const suppliersRouter = Router();

const createSupplierSchema = z.object({
  name: z.string().min(2),
  documentId: z.string().min(11),
  category: z.enum(['A', 'B', 'C']).default('C'),
  segment: z.string().default('não_produtivo'),
  paymentDelayDaysAvg: z.number().default(0),
  fiscalEvents90d: z.number().int().default(0),
  ownershipChanges180d: z.number().int().default(0),
  marketSignalScore: z.number().min(0).max(100).default(50),
  esgEmissionsIndex: z.number().min(0).max(100).default(50),
  esgWasteIndex: z.number().min(0).max(100).default(50),
  esgTurnoverRate: z.number().min(0).default(15),
  esgEnvFines12m: z.number().int().default(0),
  creditRatingScore: z.number().min(0).max(100).default(70),
});

// GET /api/suppliers — lista com score de risco e ESG mais recentes
suppliersRouter.get('/', asyncHandler(async (req, res) => {
  const { status, category, search } = req.query as Record<string, string | undefined>;

  const filters: string[] = [];
  const params: any[] = [];

  if (status) {
    params.push(status);
    filters.push(`s.status = $${params.length}`);
  }
  if (category) {
    params.push(category);
    filters.push(`s.category = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    filters.push(`(s.name ILIKE $${params.length} OR s.document_id ILIKE $${params.length})`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const result = await query(
    `
    SELECT
      s.id, s.name, s.document_id, s.category, s.segment, s.status, s.onboarded_at,
      (SELECT score FROM risk_scores rs WHERE rs.supplier_id = s.id ORDER BY computed_at DESC LIMIT 1) AS risk_score,
      (SELECT risk_level FROM risk_scores rs WHERE rs.supplier_id = s.id ORDER BY computed_at DESC LIMIT 1) AS risk_level,
      (SELECT score FROM esg_scores es WHERE es.supplier_id = s.id AND es.projected = false ORDER BY reference_month DESC LIMIT 1) AS esg_score
    FROM suppliers s
    ${whereClause}
    ORDER BY s.name ASC
    `,
    params,
  );

  res.json({ suppliers: result.rows });
}));

// GET /api/suppliers/:id — detalhe completo
suppliersRouter.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const supplierRes = await query('SELECT * FROM suppliers WHERE id = $1', [id]);
  if (supplierRes.rowCount === 0) {
    return res.status(404).json({ error: 'Fornecedor não encontrado' });
  }

  const [riskHistory, esgHistory, documents, quotes] = await Promise.all([
    query('SELECT * FROM risk_scores WHERE supplier_id = $1 ORDER BY computed_at DESC LIMIT 10', [id]),
    query('SELECT * FROM esg_scores WHERE supplier_id = $1 ORDER BY reference_month ASC', [id]),
    query('SELECT id, doc_type, status, generated_at FROM generated_documents WHERE supplier_id = $1 ORDER BY generated_at DESC LIMIT 10', [id]),
    query('SELECT * FROM supplier_quotes WHERE supplier_id = $1 ORDER BY quoted_at DESC LIMIT 10', [id]),
  ]);

  res.json({
    supplier: supplierRes.rows[0],
    riskHistory: riskHistory.rows,
    esgHistory: esgHistory.rows,
    documents: documents.rows,
    quotes: quotes.rows,
  });
}));

// POST /api/suppliers — cria fornecedor e publica evento (worker computa risco/ESG/grafo)
suppliersRouter.post('/', asyncHandler(async (req, res) => {
  const parsed = createSupplierSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Payload inválido', details: parsed.error.flatten() });
  }
  const d = parsed.data;

  const insertRes = await query(
    `
    INSERT INTO suppliers (
      name, document_id, category, segment,
      payment_delay_days_avg, fiscal_events_90d, ownership_changes_180d, market_signal_score,
      esg_emissions_index, esg_waste_index, esg_turnover_rate, esg_env_fines_12m, credit_rating_score
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING *
    `,
    [
      d.name,
      d.documentId,
      d.category,
      d.segment,
      d.paymentDelayDaysAvg,
      d.fiscalEvents90d,
      d.ownershipChanges180d,
      d.marketSignalScore,
      d.esgEmissionsIndex,
      d.esgWasteIndex,
      d.esgTurnoverRate,
      d.esgEnvFines12m,
      d.creditRatingScore,
    ],
  );

  const supplier = insertRes.rows[0];

  // Dispara o pipeline assíncrono (worker escuta este tópico e computa risco + ESG + grafo)
  await publishEvent(TOPICS.SUPPLIER_EVENTS, supplier.id, {
    eventType: 'supplier.created',
    supplierId: supplier.id,
  });

  res.status(201).json({ supplier });
}));

// POST /api/suppliers/:id/refresh — força recomputo (ex.: após atualização cadastral)
suppliersRouter.post('/:id/refresh', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const exists = await query('SELECT id FROM suppliers WHERE id = $1', [id]);
  if (exists.rowCount === 0) return res.status(404).json({ error: 'Fornecedor não encontrado' });

  await redis.del(cacheKeys.riskScore(id));
  await redis.del(cacheKeys.esgLatest(id));

  await publishEvent(TOPICS.SUPPLIER_EVENTS, id, {
    eventType: 'supplier.refresh_requested',
    supplierId: id,
  });

  res.json({ status: 'refresh_enfileirado' });
}));
