import { createClient, RedisClientType } from 'redis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

// Cliente principal (comandos gerais: GET/SET/cache de scores)
export const redis: RedisClientType = createClient({ url: REDIS_URL });

// Cliente dedicado para SUBSCRIBE (Redis exige conexão isolada para pub/sub)
export const redisSub: RedisClientType = createClient({ url: REDIS_URL });

let connected = false;

export async function connectRedis() {
  if (connected) return;
  await redis.connect();
  await redisSub.connect();
  connected = true;
  console.log('[redis] conectado em', REDIS_URL);
}

// Canais de pub/sub usados para levar alertas em tempo real até o frontend (via SSE)
export const CHANNELS = {
  ALERTS: 'sentinela:alerts',
} as const;

// Chaves de cache
export const cacheKeys = {
  riskScore: (supplierId: string) => `sentinela:risk:${supplierId}`,
  esgLatest: (supplierId: string) => `sentinela:esg:${supplierId}`,
  dashboardKpis: () => 'sentinela:dashboard:kpis',
  supplierGraph: () => 'sentinela:graph:full',
};
