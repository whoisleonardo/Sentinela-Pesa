import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectRedis } from './lib/redis';
import { getProducer } from './lib/kafka';

import { suppliersRouter } from './routes/suppliers';
import { riskRouter } from './routes/risk';
import { esgRouter } from './routes/esg';
import { graphRouter } from './routes/graph';
import { documentsRouter } from './routes/documents';
import { pricingRouter } from './routes/pricing';
import { analyticsRouter } from './routes/analytics';
import { alertsRouter } from './routes/alerts';

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use((req, _res, next) => {
  console.log(`[api] ${req.method} ${req.path}`);
  next();
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'sentinela-api' }));

app.use('/api/suppliers', suppliersRouter);
app.use('/api/risk', riskRouter);
app.use('/api/esg', esgRouter);
app.use('/api/graph', graphRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/pricing', pricingRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/alerts', alertsRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[api] erro não tratado', err);
  res.status(500).json({ error: 'Erro interno', detail: err?.message });
});

async function bootstrap() {
  await connectRedis();
  await getProducer(); // conecta ao Kafka de forma eager para falhar rápido se indisponível
  app.listen(PORT, () => {
    console.log(`[api] Sentinela API ouvindo na porta ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[api] falha ao inicializar', err);
  process.exit(1);
});
