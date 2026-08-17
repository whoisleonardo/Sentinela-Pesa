import { Router } from 'express';
import { z } from 'zod';
import { query } from '../lib/db';
import { evaluateQuote } from '../services/pricingEngine';
import { asyncHandler } from '../lib/asyncHandler';

export const pricingRouter = Router();

// GET /api/pricing/benchmarks
pricingRouter.get('/benchmarks', asyncHandler(async (_req, res) => {
  const result = await query('SELECT * FROM pricing_benchmarks ORDER BY item_category');
  res.json({ benchmarks: result.rows });
}));

const updateBenchmarkSchema = z
  .object({
    marketAvg: z.number().positive(),
    marketP25: z.number().positive(),
    marketP75: z.number().positive(),
    unit: z.string().min(1),
  })
  .refine((d) => d.marketP25 <= d.marketAvg && d.marketAvg <= d.marketP75, {
    message: 'A faixa precisa respeitar P25 ≤ Média ≤ P75',
  });

// PATCH /api/pricing/benchmarks/:id — atualiza a faixa de mercado de uma categoria
pricingRouter.patch('/benchmarks/:id', asyncHandler(async (req, res) => {
  const parsed = updateBenchmarkSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Payload inválido', details: parsed.error.flatten() });
  }
  const { marketAvg, marketP25, marketP75, unit } = parsed.data;

  const result = await query(
    `UPDATE pricing_benchmarks
     SET market_avg = $1, market_p25 = $2, market_p75 = $3, unit = $4, updated_at = now()
     WHERE id = $5
     RETURNING *`,
    [marketAvg, marketP25, marketP75, unit, req.params.id],
  );
  if (result.rowCount === 0) return res.status(404).json({ error: 'Benchmark não encontrado' });

  res.json({ benchmark: result.rows[0] });
}));

const quoteSchema = z.object({
  supplierId: z.string().uuid(),
  itemCategory: z.string(),
  quotedPrice: z.number().positive(),
});

// POST /api/pricing/quotes — registra cotação e avalia contra benchmark
pricingRouter.post('/quotes', asyncHandler(async (req, res) => {
  const parsed = quoteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Payload inválido', details: parsed.error.flatten() });
  }
  const { supplierId, itemCategory, quotedPrice } = parsed.data;

  const benchmarkRes = await query(
    'SELECT market_avg, market_p25, market_p75 FROM pricing_benchmarks WHERE item_category = $1',
    [itemCategory],
  );
  if (benchmarkRes.rowCount === 0) {
    return res.status(404).json({ error: `Sem benchmark cadastrado para a categoria "${itemCategory}"` });
  }
  const b = benchmarkRes.rows[0];

  const evaluation = evaluateQuote(quotedPrice, {
    marketAvg: Number(b.market_avg),
    marketP25: Number(b.market_p25),
    marketP75: Number(b.market_p75),
  });

  await query(
    'INSERT INTO supplier_quotes (supplier_id, item_category, quoted_price) VALUES ($1,$2,$3)',
    [supplierId, itemCategory, quotedPrice],
  );

  if (evaluation.flag !== 'dentro_da_faixa') {
    await query(
      `INSERT INTO alerts (supplier_id, source, severity, title, message)
       VALUES ($1, 'pricing_engine', 'atencao', $2, $3)`,
      [supplierId, `Desvio de preço: ${itemCategory}`, evaluation.suggestion],
    );
  }

  res.status(201).json({ evaluation });
}));
