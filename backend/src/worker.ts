import 'dotenv/config';
import { createConsumer, publishEvent, TOPICS } from './lib/kafka';
import { connectRedis, redis, cacheKeys, CHANNELS } from './lib/redis';
import { query } from './lib/db';
import { computeRiskScore } from './services/riskEngine';
import { computeEsgScore } from './services/esgEngine';
import { detectSanctionedSharedParties } from './services/graphEngine';

/**
 * Worker de eventos — Sentinela
 * ------------------------------------------------------------------
 * Consome sentinela.supplier.events e executa, para cada fornecedor:
 *   1) IA Preditiva de Risco  -> grava risk_scores, cacheia em Redis
 *   2) ESG Preditivo          -> grava esg_scores (score atual)
 *   3) Grafo de Relacionamento-> varre sócios sancionados
 * Emite alertas (Postgres + Redis pub/sub) quando risco/ESG cruzam
 * limiares críticos, replicando o cenário do slide "bloqueio
 * preventivo acionado automaticamente".
 */

async function raiseAlert(params: {
  supplierId: string | null;
  source: string;
  severity: 'info' | 'atencao' | 'critico';
  title: string;
  message: string;
}) {
  const result = await query(
    `INSERT INTO alerts (supplier_id, source, severity, title, message)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [params.supplierId, params.source, params.severity, params.title, params.message],
  );
  const alert = result.rows[0];
  await redis.publish(CHANNELS.ALERTS, JSON.stringify(alert));
  console.log(`[worker] alerta emitido (${params.severity}): ${params.title}`);
}

async function processSupplierEvent(supplierId: string) {
  const supplierRes = await query('SELECT * FROM suppliers WHERE id = $1', [supplierId]);
  if (supplierRes.rowCount === 0) {
    console.warn(`[worker] fornecedor ${supplierId} não encontrado — ignorando evento`);
    return;
  }
  const supplier = supplierRes.rows[0];

  // -------- 1) IA Preditiva de Risco --------
  const risk = computeRiskScore({
    paymentDelayDaysAvg: Number(supplier.payment_delay_days_avg),
    fiscalEvents90d: Number(supplier.fiscal_events_90d),
    ownershipChanges180d: Number(supplier.ownership_changes_180d),
    marketSignalScore: Number(supplier.market_signal_score),
    creditRatingScore: Number(supplier.credit_rating_score),
  });

  const riskInsert = await query(
    `INSERT INTO risk_scores (supplier_id, score, risk_level, horizon_days, drivers, recommendation)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [supplierId, risk.score, risk.level, risk.horizonDays, JSON.stringify(risk.drivers), risk.recommendation],
  );
  await redis.set(cacheKeys.riskScore(supplierId), JSON.stringify(riskInsert.rows[0]), { EX: 300 });
  await publishEvent(TOPICS.RISK_COMPUTED, supplierId, { supplierId, score: risk.score, level: risk.level });

  if (risk.level === 'critico' || risk.level === 'alto') {
    await raiseAlert({
      supplierId,
      source: 'risk_engine',
      severity: risk.level === 'critico' ? 'critico' : 'atencao',
      title: `Risco ${risk.level} detectado: ${supplier.name}`,
      message: risk.recommendation,
    });
  }

  // -------- 2) ESG Preditivo --------
  const esg = computeEsgScore({
    emissionsIndex: Number(supplier.esg_emissions_index),
    wasteIndex: Number(supplier.esg_waste_index),
    turnoverRate: Number(supplier.esg_turnover_rate),
    envFines12m: Number(supplier.esg_env_fines_12m),
  });

  await query(
    `INSERT INTO esg_scores (supplier_id, score, category, projected, reference_month)
     VALUES ($1,$2,$3,false, date_trunc('month', now()))
     ON CONFLICT (supplier_id, reference_month, projected)
     DO UPDATE SET score = EXCLUDED.score, category = EXCLUDED.category, computed_at = now()`,
    [supplierId, esg.score, esg.category],
  );
  await redis.set(cacheKeys.esgLatest(supplierId), JSON.stringify(esg), { EX: 300 });
  await publishEvent(TOPICS.ESG_COMPUTED, supplierId, { supplierId, score: esg.score, category: esg.category });

  if (esg.score < 40) {
    await raiseAlert({
      supplierId,
      source: 'esg_engine',
      severity: 'atencao',
      title: `Score ESG baixo: ${supplier.name}`,
      message: `Score ESG atual de ${esg.score}/100 (categoria ${esg.category}). Recomenda-se plano de melhoria.`,
    });
  }

  // -------- 3) Grafo de Relacionamento (varredura de sanções) --------
  const hitsForThisSupplier = await detectSanctionedSharedParties(supplierId);
  for (const hit of hitsForThisSupplier) {
    await query(
      `UPDATE suppliers SET status = 'em_revisao' WHERE id = $1 AND status = 'ativo'`,
      [supplierId],
    );
    await raiseAlert({
      supplierId,
      source: 'graph_engine',
      severity: 'critico',
      title: `Vínculo com parte sancionada: ${supplier.name}`,
      message: `Sócio/parte "${hit.party_name}" consta na base de sanções (${hit.sanction_type}). Bloqueio preventivo recomendado.`,
    });
    await publishEvent(TOPICS.GRAPH_ALERT, supplierId, { supplierId, partyName: hit.party_name });
  }

  // Invalida caches agregados que dependem deste fornecedor
  await redis.del(cacheKeys.dashboardKpis());
  await redis.del(cacheKeys.supplierGraph());

  console.log(
    `[worker] fornecedor processado: ${supplier.name} | risco=${risk.score} (${risk.level}) | esg=${esg.score} (${esg.category})`,
  );
}

async function main() {
  await connectRedis();
  const consumer = createConsumer('sentinela-worker-group');
  await consumer.connect();
  await consumer.subscribe({ topic: TOPICS.SUPPLIER_EVENTS, fromBeginning: true });

  console.log('[worker] Sentinela worker ativo — aguardando eventos...');

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const raw = message.value?.toString() ?? '{}';
      let event: any;
      try {
        event = JSON.parse(raw);
      } catch (err) {
        // "Poison pill": a mensagem nunca vai virar JSON válido em uma nova
        // tentativa, então logamos e seguimos (não faz sentido travar o
        // consumer group tentando reprocessar o mesmo payload inválido).
        console.error('[worker] mensagem descartada — payload não é JSON válido', err);
        return;
      }

      // Erros a partir daqui (Postgres/Redis indisponível, etc.) são
      // propagados de propósito: o KafkaJS não comita o offset e reentrega
      // a mensagem seguindo a política de retry já configurada em
      // lib/kafka.ts, em vez de perder o evento silenciosamente.
      await query(`INSERT INTO event_log (topic, event_type, payload) VALUES ($1,$2,$3)`, [
        topic,
        event.eventType ?? 'unknown',
        raw,
      ]);

      if (event.supplierId) {
        await processSupplierEvent(event.supplierId);
      }
    },
  });
}

main().catch((err) => {
  console.error('[worker] falha fatal', err);
  process.exit(1);
});
