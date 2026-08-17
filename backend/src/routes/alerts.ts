import { Router } from 'express';
import { query } from '../lib/db';
import { redisSub, CHANNELS } from '../lib/redis';
import { asyncHandler } from '../lib/asyncHandler';

export const alertsRouter = Router();

// GET /api/alerts — histórico paginado
alertsRouter.get('/', asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const result = await query(
    `SELECT a.*, s.name AS supplier_name FROM alerts a
     LEFT JOIN suppliers s ON s.id = a.supplier_id
     ORDER BY a.created_at DESC LIMIT $1`,
    [limit],
  );
  res.json({ alerts: result.rows });
}));

// PATCH /api/alerts/:id/ack
alertsRouter.patch('/:id/ack', asyncHandler(async (req, res) => {
  const result = await query(
    'UPDATE alerts SET acknowledged = true WHERE id = $1 RETURNING *',
    [req.params.id],
  );
  if (result.rowCount === 0) return res.status(404).json({ error: 'Alerta não encontrado' });
  res.json({ alert: result.rows[0] });
}));

// GET /api/alerts/stream — Server-Sent Events, alimentado pelo pub/sub do Redis
// (o worker publica no canal sentinela:alerts sempre que grava um alerta novo)
alertsRouter.get('/stream', asyncHandler(async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('retry: 3000\n\n');

  const onMessage = (message: string) => {
    res.write(`data: ${message}\n\n`);
  };

  await redisSub.subscribe(CHANNELS.ALERTS, onMessage);

  const heartbeat = setInterval(() => res.write(':\n\n'), 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    // Passa o mesmo listener para remover só esta conexão — sem ele, o
    // node-redis derruba TODOS os listeners do canal (todas as outras
    // abas/streams conectadas param de receber alertas em tempo real).
    redisSub.unsubscribe(CHANNELS.ALERTS, onMessage).catch(() => {});
  });
}));
