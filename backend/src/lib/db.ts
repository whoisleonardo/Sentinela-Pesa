import { Pool } from 'pg';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgres://sentinela:sentinela@localhost:5432/sentinela',
  max: 10,
});

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[db] erro inesperado no pool do Postgres', err);
});

export async function query<T = any>(text: string, params: any[] = []) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const durationMs = Date.now() - start;
  if (durationMs > 200) {
    console.warn(`[db] query lenta (${durationMs}ms): ${text.slice(0, 80)}...`);
  }
  return res as unknown as { rows: T[]; rowCount: number };
}

export default pool;
