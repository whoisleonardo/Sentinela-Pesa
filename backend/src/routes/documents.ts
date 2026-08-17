import { Router } from 'express';
import { z } from 'zod';
import { query } from '../lib/db';
import { generateDocument, DocType } from '../services/docGenerator';
import { asyncHandler } from '../lib/asyncHandler';

export const documentsRouter = Router();

const generateSchema = z.object({
  docType: z.enum(['minuta_contrato', 'checklist_auditoria', 'comunicado_compliance']),
});

// POST /api/documents/:supplierId/generate
documentsRouter.post('/:supplierId/generate', asyncHandler(async (req, res) => {
  const { supplierId } = req.params;
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Payload inválido', details: parsed.error.flatten() });
  }

  const supplierRes = await query('SELECT * FROM suppliers WHERE id = $1', [supplierId]);
  if (supplierRes.rowCount === 0) return res.status(404).json({ error: 'Fornecedor não encontrado' });
  const supplier = supplierRes.rows[0];

  const riskRes = await query(
    'SELECT risk_level FROM risk_scores WHERE supplier_id = $1 ORDER BY computed_at DESC LIMIT 1',
    [supplierId],
  );
  const esgRes = await query(
    'SELECT score FROM esg_scores WHERE supplier_id = $1 AND projected = false ORDER BY reference_month DESC LIMIT 1',
    [supplierId],
  );

  const content = generateDocument(parsed.data.docType as DocType, {
    supplierName: supplier.name,
    documentId: supplier.document_id,
    category: supplier.category,
    riskLevel: (riskRes.rows[0]?.risk_level ?? 'baixo') as any,
    esgScore: Number(esgRes.rows[0]?.score ?? 60),
  });

  const insertRes = await query(
    `INSERT INTO generated_documents (supplier_id, doc_type, content) VALUES ($1,$2,$3) RETURNING id, doc_type, status, generated_at`,
    [supplierId, parsed.data.docType, content],
  );

  res.status(201).json({ document: insertRes.rows[0], content });
}));

// GET /api/documents/:id
documentsRouter.get('/item/:id', asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM generated_documents WHERE id = $1', [req.params.id]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Documento não encontrado' });
  res.json({ document: result.rows[0] });
}));
