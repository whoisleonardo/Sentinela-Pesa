import { query } from '../lib/db';

/**
 * Motor de Grafo de Relacionamento
 * ------------------------------------------------------------------
 * Constrói a rede de vínculos entre fornecedores a partir de sócios
 * compartilhados (supplier_shared_parties) e cruza com a base de
 * sanções (sanctioned_entities) para detectar risco de rede — o mesmo
 * cenário do slide "Fornecedor E e Fornecedor E compartilham sócio
 * com sanção CEIS".
 */

export interface GraphNode {
  id: string;
  name: string;
  riskLevel: 'baixo' | 'medio' | 'alto' | 'critico';
  category: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  relationType: string;
  riskFlag: 'info' | 'atencao' | 'critico';
  detail: string;
}

export async function buildRelationshipGraph() {
  const suppliersRes = await query<{
    id: string;
    name: string;
    category: string;
    latest_risk_level: string | null;
  }>(`
    SELECT s.id, s.name, s.category,
      (SELECT risk_level FROM risk_scores rs WHERE rs.supplier_id = s.id ORDER BY computed_at DESC LIMIT 1) AS latest_risk_level
    FROM suppliers s
  `);

  const explicitEdgesRes = await query<{
    supplier_a_id: string;
    supplier_b_id: string;
    relation_type: string;
    risk_flag: 'info' | 'atencao' | 'critico';
    detail: string | null;
  }>(`SELECT supplier_a_id, supplier_b_id, relation_type, risk_flag, detail FROM supplier_relationships`);

  const nodes: GraphNode[] = suppliersRes.rows.map((s) => ({
    id: s.id,
    name: s.name,
    riskLevel: (s.latest_risk_level as GraphNode['riskLevel']) ?? 'baixo',
    category: s.category,
  }));

  const edges: GraphEdge[] = explicitEdgesRes.rows.map((e) => ({
    source: e.supplier_a_id,
    target: e.supplier_b_id,
    relationType: e.relation_type,
    riskFlag: e.risk_flag,
    detail: e.detail ?? '',
  }));

  return { nodes, edges };
}

/**
 * Varredura que cruza sócios de fornecedores com a base de sanções e
 * gera arestas críticas + alertas quando encontra coincidência.
 * Passe `supplierId` para escopar a varredura a um único fornecedor
 * (usado pelo worker a cada evento, evitando reescanear a base inteira).
 */
export async function detectSanctionedSharedParties(supplierId?: string) {
  const res = await query<{
    supplier_id: string;
    supplier_name: string;
    party_name: string;
    party_document_id: string | null;
    sanction_type: string | null;
  }>(
    `
    SELECT ssp.supplier_id, s.name AS supplier_name, ssp.party_name, ssp.party_document_id,
           se.sanction_type
    FROM supplier_shared_parties ssp
    JOIN suppliers s ON s.id = ssp.supplier_id
    JOIN sanctioned_entities se
      ON lower(se.entity_name) = lower(ssp.party_name)
      OR (ssp.party_document_id IS NOT NULL AND se.document_id = ssp.party_document_id)
    ${supplierId ? 'WHERE ssp.supplier_id = $1' : ''}
  `,
    supplierId ? [supplierId] : [],
  );
  return res.rows;
}
