import 'dotenv/config';
import { query } from './lib/db';
import { publishEvent, TOPICS, getProducer } from './lib/kafka';

interface SeedSupplier {
  name: string;
  documentId: string;
  category: 'A' | 'B' | 'C';
  segment: string;
  paymentDelayDaysAvg: number;
  fiscalEvents90d: number;
  ownershipChanges180d: number;
  marketSignalScore: number;
  esgEmissionsIndex: number;
  esgWasteIndex: number;
  esgTurnoverRate: number;
  esgEnvFines12m: number;
  creditRatingScore: number;
}

const suppliers: SeedSupplier[] = [
  { name: 'Metalúrgica Vale Forte Ltda', documentId: '12345678000101', category: 'A', segment: 'peças_fundidas', paymentDelayDaysAvg: 1, fiscalEvents90d: 0, ownershipChanges180d: 0, marketSignalScore: 12, esgEmissionsIndex: 20, esgWasteIndex: 18, esgTurnoverRate: 6, esgEnvFines12m: 0, creditRatingScore: 92 },
  { name: 'Transportes Rota Sul S.A.', documentId: '23456789000112', category: 'B', segment: 'logística', paymentDelayDaysAvg: 5, fiscalEvents90d: 1, ownershipChanges180d: 0, marketSignalScore: 30, esgEmissionsIndex: 55, esgWasteIndex: 40, esgTurnoverRate: 22, esgEnvFines12m: 0, creditRatingScore: 74 },
  { name: 'Hidráulica Serra Azul Ltda', documentId: '34567890000123', category: 'B', segment: 'peças_hidráulicas', paymentDelayDaysAvg: 8, fiscalEvents90d: 1, ownershipChanges180d: 1, marketSignalScore: 42, esgEmissionsIndex: 48, esgWasteIndex: 51, esgTurnoverRate: 18, esgEnvFines12m: 1, creditRatingScore: 66 },
  { name: 'Fundição Central do Paraná', documentId: '45678901000134', category: 'C', segment: 'peças_fundidas', paymentDelayDaysAvg: 18, fiscalEvents90d: 2, ownershipChanges180d: 1, marketSignalScore: 61, esgEmissionsIndex: 72, esgWasteIndex: 68, esgTurnoverRate: 35, esgEnvFines12m: 2, creditRatingScore: 48 },
  { name: 'Lubrificantes Rio Verde Ltda', documentId: '56789012000145', category: 'B', segment: 'insumos', paymentDelayDaysAvg: 4, fiscalEvents90d: 0, ownershipChanges180d: 0, marketSignalScore: 25, esgEmissionsIndex: 44, esgWasteIndex: 39, esgTurnoverRate: 14, esgEnvFines12m: 0, creditRatingScore: 78 },
  { name: 'Pneus Continental Rodovias ME', documentId: '67890123000156', category: 'C', segment: 'pneus', paymentDelayDaysAvg: 22, fiscalEvents90d: 3, ownershipChanges180d: 2, marketSignalScore: 70, esgEmissionsIndex: 58, esgWasteIndex: 62, esgTurnoverRate: 41, esgEnvFines12m: 1, creditRatingScore: 39 },
  { name: 'Aço Norte Industrial S.A.', documentId: '78901234000167', category: 'A', segment: 'aço_e_metais', paymentDelayDaysAvg: 2, fiscalEvents90d: 0, ownershipChanges180d: 0, marketSignalScore: 15, esgEmissionsIndex: 30, esgWasteIndex: 22, esgTurnoverRate: 9, esgEnvFines12m: 0, creditRatingScore: 88 },
  { name: 'Serviços Técnicos Cataratas Ltda', documentId: '89012345000178', category: 'B', segment: 'serviços_técnicos', paymentDelayDaysAvg: 6, fiscalEvents90d: 1, ownershipChanges180d: 0, marketSignalScore: 33, esgEmissionsIndex: 35, esgWasteIndex: 30, esgTurnoverRate: 20, esgEnvFines12m: 0, creditRatingScore: 71 },
  { name: 'Distribuidora Guairaçá EPP', documentId: '90123456000189', category: 'C', segment: 'insumos', paymentDelayDaysAvg: 27, fiscalEvents90d: 4, ownershipChanges180d: 1, marketSignalScore: 78, esgEmissionsIndex: 64, esgWasteIndex: 70, esgTurnoverRate: 38, esgEnvFines12m: 3, creditRatingScore: 33 },
  { name: 'Componentes Cascavel Ltda', documentId: '01234567000190', category: 'B', segment: 'peças_hidráulicas', paymentDelayDaysAvg: 7, fiscalEvents90d: 0, ownershipChanges180d: 0, marketSignalScore: 28, esgEmissionsIndex: 41, esgWasteIndex: 37, esgTurnoverRate: 17, esgEnvFines12m: 0, creditRatingScore: 76 },
  { name: 'Retífica Motores Iguaçu', documentId: '11223344000101', category: 'C', segment: 'serviços_técnicos', paymentDelayDaysAvg: 15, fiscalEvents90d: 2, ownershipChanges180d: 0, marketSignalScore: 55, esgEmissionsIndex: 60, esgWasteIndex: 57, esgTurnoverRate: 29, esgEnvFines12m: 1, creditRatingScore: 52 },
  { name: 'Borrachas e Vedações Maringá', documentId: '22334455000112', category: 'A', segment: 'peças_fundidas', paymentDelayDaysAvg: 1, fiscalEvents90d: 0, ownershipChanges180d: 0, marketSignalScore: 10, esgEmissionsIndex: 25, esgWasteIndex: 19, esgTurnoverRate: 8, esgEnvFines12m: 0, creditRatingScore: 90 },
  { name: 'Ferragens União Ltda', documentId: '33445566000123', category: 'C', segment: 'insumos', paymentDelayDaysAvg: 20, fiscalEvents90d: 3, ownershipChanges180d: 2, marketSignalScore: 66, esgEmissionsIndex: 55, esgWasteIndex: 60, esgTurnoverRate: 33, esgEnvFines12m: 2, creditRatingScore: 41 },
  { name: 'Elétrica Industrial Londrina', documentId: '44556677000134', category: 'B', segment: 'serviços_técnicos', paymentDelayDaysAvg: 5, fiscalEvents90d: 0, ownershipChanges180d: 0, marketSignalScore: 22, esgEmissionsIndex: 33, esgWasteIndex: 28, esgTurnoverRate: 15, esgEnvFines12m: 0, creditRatingScore: 80 },
  { name: 'Insumos Agroindustriais PR', documentId: '55667788000145', category: 'C', segment: 'insumos', paymentDelayDaysAvg: 25, fiscalEvents90d: 3, ownershipChanges180d: 1, marketSignalScore: 73, esgEmissionsIndex: 69, esgWasteIndex: 65, esgTurnoverRate: 36, esgEnvFines12m: 2, creditRatingScore: 37 },
  { name: 'Precisão Mecânica Toledo', documentId: '66778899000156', category: 'A', segment: 'peças_hidráulicas', paymentDelayDaysAvg: 2, fiscalEvents90d: 0, ownershipChanges180d: 0, marketSignalScore: 14, esgEmissionsIndex: 27, esgWasteIndex: 24, esgTurnoverRate: 10, esgEnvFines12m: 0, creditRatingScore: 86 },
  // Fornecedor E — replica o cenário do slide: vínculo societário com parte sancionada
  { name: 'Fornecedor E Comércio e Serviços Ltda', documentId: '77889900000167', category: 'C', segment: 'insumos', paymentDelayDaysAvg: 19, fiscalEvents90d: 2, ownershipChanges180d: 3, marketSignalScore: 68, esgEmissionsIndex: 62, esgWasteIndex: 59, esgTurnoverRate: 30, esgEnvFines12m: 1, creditRatingScore: 44 },
  { name: 'Fornecedor F Peças Ltda', documentId: '88990011000178', category: 'B', segment: 'peças_fundidas', paymentDelayDaysAvg: 6, fiscalEvents90d: 0, ownershipChanges180d: 0, marketSignalScore: 24, esgEmissionsIndex: 38, esgWasteIndex: 34, esgTurnoverRate: 16, esgEnvFines12m: 0, creditRatingScore: 75 },
];

const pricingBenchmarks = [
  { itemCategory: 'peças_fundidas', marketAvg: 4200, marketP25: 3700, marketP75: 4800, unit: 'R$/lote' },
  { itemCategory: 'peças_hidráulicas', marketAvg: 2850, marketP25: 2400, marketP75: 3300, unit: 'R$/un' },
  { itemCategory: 'pneus', marketAvg: 3100, marketP25: 2700, marketP75: 3500, unit: 'R$/un' },
  { itemCategory: 'insumos', marketAvg: 980, marketP25: 800, marketP75: 1150, unit: 'R$/lote' },
  { itemCategory: 'serviços_técnicos', marketAvg: 6200, marketP25: 5200, marketP75: 7400, unit: 'R$/OS' },
  { itemCategory: 'logística', marketAvg: 15800, marketP25: 13500, marketP75: 18200, unit: 'R$/rota' },
  { itemCategory: 'aço_e_metais', marketAvg: 5400, marketP25: 4900, marketP75: 6100, unit: 'R$/ton' },
];

async function seed() {
  console.log('[seed] iniciando...');

  await query('DELETE FROM alerts');
  await query('DELETE FROM event_log');
  await query('DELETE FROM supplier_quotes');
  await query('DELETE FROM generated_documents');
  await query('DELETE FROM esg_scores');
  await query('DELETE FROM risk_scores');
  await query('DELETE FROM supplier_shared_parties');
  await query('DELETE FROM supplier_relationships');
  await query('DELETE FROM sanctioned_entities');
  await query('DELETE FROM pricing_benchmarks');
  await query('DELETE FROM suppliers');

  const idByName: Record<string, string> = {};

  for (const s of suppliers) {
    const result = await query(
      `INSERT INTO suppliers (
        name, document_id, category, segment,
        payment_delay_days_avg, fiscal_events_90d, ownership_changes_180d, market_signal_score,
        esg_emissions_index, esg_waste_index, esg_turnover_rate, esg_env_fines_12m, credit_rating_score
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [
        s.name, s.documentId, s.category, s.segment,
        s.paymentDelayDaysAvg, s.fiscalEvents90d, s.ownershipChanges180d, s.marketSignalScore,
        s.esgEmissionsIndex, s.esgWasteIndex, s.esgTurnoverRate, s.esgEnvFines12m, s.creditRatingScore,
      ],
    );
    idByName[s.name] = result.rows[0].id;
  }
  console.log(`[seed] ${suppliers.length} fornecedores inseridos`);

  // Benchmarks de precificação
  for (const b of pricingBenchmarks) {
    await query(
      `INSERT INTO pricing_benchmarks (item_category, market_avg, market_p25, market_p75, unit)
       VALUES ($1,$2,$3,$4,$5)`,
      [b.itemCategory, b.marketAvg, b.marketP25, b.marketP75, b.unit],
    );
  }
  console.log(`[seed] ${pricingBenchmarks.length} benchmarks de precificação inseridos`);

  // Entidade sancionada (base CEIS simulada)
  await query(
    `INSERT INTO sanctioned_entities (entity_name, document_id, sanction_type, source)
     VALUES ('José Roberto Almeida Souza', '11122233344', 'Inidoneidade (CEIS)', 'CEIS')`,
  );

  // Sócio comum entre Fornecedor E e Fornecedor F (replica o slide do grafo)
  await query(
    `INSERT INTO supplier_shared_parties (supplier_id, party_name, party_document_id, role)
     VALUES ($1, 'José Roberto Almeida Souza', '11122233344', 'sócio')`,
    [idByName['Fornecedor E Comércio e Serviços Ltda']],
  );

  // Arestas explícitas do grafo (para visualização, incluindo o vínculo crítico)
  const rel = async (a: string, b: string, type: string, riskFlag: string, detail: string) =>
    query(
      `INSERT INTO supplier_relationships (supplier_a_id, supplier_b_id, relation_type, risk_flag, detail)
       VALUES ($1,$2,$3,$4,$5)`,
      [idByName[a], idByName[b], type, riskFlag, detail],
    );

  await rel('Metalúrgica Vale Forte Ltda', 'Aço Norte Industrial S.A.', 'mesmo_endereco', 'info', 'Compartilham parque industrial em Curitiba');
  await rel('Hidráulica Serra Azul Ltda', 'Componentes Cascavel Ltda', 'socio_comum', 'atencao', 'Sócio minoritário em comum (participação < 10%)');
  await rel(
    'Fornecedor E Comércio e Serviços Ltda',
    'Fornecedor F Peças Ltda',
    'socio_comum',
    'critico',
    'Compartilham sócio (José Roberto Almeida Souza) constante na base CEIS',
  );

  console.log('[seed] relacionamentos e sanções inseridos');

  // Dispara o pipeline de eventos para cada fornecedor (worker computa risco/ESG/grafo)
  await getProducer();
  for (const name of Object.keys(idByName)) {
    await publishEvent(TOPICS.SUPPLIER_EVENTS, idByName[name], {
      eventType: 'supplier.created',
      supplierId: idByName[name],
    });
  }
  console.log('[seed] eventos publicados no Kafka — inicie/mantenha o worker rodando para processá-los');
  console.log('[seed] concluído.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] falha', err);
  process.exit(1);
});
