/**
 * Motor de Automação Generativa de Documentos
 * ------------------------------------------------------------------
 * Gera minutas de contrato, checklists de auditoria e comunicados de
 * compliance a partir de templates contextualizados pelo score do
 * fornecedor. Esta é uma implementação template-based determinística;
 * o ponto de extensão para plugar um LLM real (ex.: Claude via API,
 * como descrito em anthropic_api_in_artifacts) é a função
 * `generateDocument` — troque o corpo por uma chamada de completion
 * mantendo a mesma assinatura.
 */

export type DocType = 'minuta_contrato' | 'checklist_auditoria' | 'comunicado_compliance';

interface DocContext {
  supplierName: string;
  documentId: string;
  category: 'A' | 'B' | 'C';
  riskLevel: 'baixo' | 'medio' | 'alto' | 'critico';
  esgScore: number;
}

export function generateDocument(docType: DocType, ctx: DocContext): string {
  switch (docType) {
    case 'minuta_contrato':
      return contractTemplate(ctx);
    case 'checklist_auditoria':
      return checklistTemplate(ctx);
    case 'comunicado_compliance':
      return complianceTemplate(ctx);
    default:
      throw new Error(`Tipo de documento desconhecido: ${docType}`);
  }
}

function contractTemplate(ctx: DocContext): string {
  const clausulaRisco =
    ctx.riskLevel === 'alto' || ctx.riskLevel === 'critico'
      ? `\n7. CLÁUSULA DE MONITORAMENTO REFORÇADO\nDado o nível de risco atual (${ctx.riskLevel}), a CONTRATANTE se reserva o direito de auditorias trimestrais não programadas e revisão de SLA a cada 60 (sessenta) dias.`
      : '';
  return `MINUTA DE CONTRATO DE FORNECIMENTO
Fornecedor: ${ctx.supplierName} (CNPJ: ${ctx.documentId})
Categoria de homologação: ${ctx.category}

1. OBJETO
O presente instrumento tem por objeto a prestação de serviços/fornecimento de materiais pela CONTRATADA à CONTRATANTE, nas condições estabelecidas neste contrato.

2. PRAZO
Vigência de 12 (doze) meses, renovável mediante avaliação de desempenho e manutenção da categoria de homologação.

3. OBRIGAÇÕES DA CONTRATADA
3.1. Manter regularidade fiscal e trabalhista durante toda a vigência.
3.2. Reportar imediatamente qualquer alteração societária relevante.
3.3. Atender aos critérios ESG mínimos da categoria ${ctx.category} (score atual: ${ctx.esgScore}).

4. OBRIGAÇÕES DA CONTRATANTE
4.1. Efetuar pagamentos conforme condições comerciais acordadas.
4.2. Comunicar formalmente qualquer não conformidade identificada.

5. COMPLIANCE E AUDITORIA
A CONTRATADA se compromete a permitir auditorias periódicas e fornecer documentação comprobatória de conformidade regulatória.

6. RESCISÃO
O descumprimento de cláusulas essenciais, especialmente as relativas a compliance e ESG, autoriza rescisão unilateral motivada.
${clausulaRisco}

[Documento gerado automaticamente — revisão jurídica obrigatória antes de assinatura]`;
}

function checklistTemplate(ctx: DocContext): string {
  const itensBase = [
    'Certidões negativas de débitos federais, estaduais e municipais',
    'Regularidade no FGTS e INSS',
    'Contrato social e última alteração consolidada',
    'Comprovante de endereço atualizado',
    'Certificações técnicas aplicáveis ao segmento',
  ];
  const itensRisco =
    ctx.riskLevel === 'alto' || ctx.riskLevel === 'critico'
      ? [
          'Justificativa formal para variação de score de risco recente',
          'Plano de mitigação assinado pelo responsável do fornecedor',
          'Confirmação de ausência de vínculo com entidades sancionadas (CEIS/CNEP)',
        ]
      : [];
  const itensEsg =
    ctx.esgScore < 55
      ? ['Plano de melhoria ESG com cronograma de 90 dias']
      : [];

  const todos = [...itensBase, ...itensRisco, ...itensEsg];
  return `CHECKLIST DE AUDITORIA — ${ctx.supplierName}
Categoria: ${ctx.category} · Nível de risco: ${ctx.riskLevel} · Score ESG: ${ctx.esgScore}

${todos.map((item, i) => `[ ] ${i + 1}. ${item}`).join('\n')}

Gerado automaticamente com base no score e categoria atuais do fornecedor.`;
}

function complianceTemplate(ctx: DocContext): string {
  const tom =
    ctx.riskLevel === 'critico'
      ? 'URGENTE'
      : ctx.riskLevel === 'alto'
      ? 'PRIORITÁRIO'
      : 'INFORMATIVO';
  return `COMUNICADO DE COMPLIANCE [${tom}]
Para: ${ctx.supplierName} (CNPJ: ${ctx.documentId})

Prezados,

Este comunicado tem caráter ${tom.toLowerCase()} e refere-se ao acompanhamento periódico de homologação de fornecedores.

Situação atual:
- Categoria de homologação: ${ctx.category}
- Nível de risco identificado: ${ctx.riskLevel}
- Score ESG: ${ctx.esgScore}/100

${
  ctx.riskLevel === 'alto' || ctx.riskLevel === 'critico'
    ? 'Solicitamos manifestação formal em até 5 (cinco) dias úteis com plano de ação para os pontos identificados, sob pena de suspensão temporária da homologação.'
    : 'Não há pendências que exijam ação imediata. Este comunicado é enviado como parte do monitoramento contínuo.'
}

Atenciosamente,
Equipe de Homologação de Fornecedores — Sentinela`;
}
