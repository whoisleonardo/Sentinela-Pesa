import { Kafka, logLevel, Producer, Consumer } from 'kafkajs';

const BROKERS = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');

export const kafka = new Kafka({
  clientId: 'sentinela',
  brokers: BROKERS,
  logLevel: logLevel.NOTHING,
  retry: {
    initialRetryTime: 300,
    retries: 10,
  },
});

// Tópicos do domínio — cada frente de IA publica/consome no seu próprio tópico
export const TOPICS = {
  SUPPLIER_EVENTS: 'sentinela.supplier.events', // criação/atualização de fornecedor -> dispara pipelines
  RISK_COMPUTED: 'sentinela.risk.computed', // saída do motor de IA Preditiva de Risco
  ESG_COMPUTED: 'sentinela.esg.computed', // saída do motor ESG Preditivo
  GRAPH_ALERT: 'sentinela.graph.alert', // alerta do Grafo de Relacionamento
  PRICING_ALERT: 'sentinela.pricing.alert', // alerta da IA de Precificação
  ALERTS: 'sentinela.alerts', // canal unificado de alertas para consumo externo
} as const;

let producer: Producer | null = null;

export async function getProducer(): Promise<Producer> {
  if (producer) return producer;
  producer = kafka.producer({ allowAutoTopicCreation: true });
  await producer.connect();
  console.log('[kafka] producer conectado em', BROKERS.join(','));
  return producer;
}

export async function publishEvent(topic: string, key: string, value: object) {
  const p = await getProducer();
  await p.send({
    topic,
    messages: [{ key, value: JSON.stringify(value), headers: { 'x-source': 'sentinela-api' } }],
  });
}

export function createConsumer(groupId: string): Consumer {
  return kafka.consumer({ groupId, allowAutoTopicCreation: true });
}
