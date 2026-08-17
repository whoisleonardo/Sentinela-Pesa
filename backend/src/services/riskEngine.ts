/**
 * Motor de IA Preditiva de Risco
 * ------------------------------------------------------------------
 * Implementação de referência: um scoring determinístico e explicável
 * por combinação ponderada de sinais (o "drivers" abaixo já é a
 * explicabilidade do modelo). Em produção este módulo é o ponto de
 * substituição pelo pipeline real (LSTM / Random Forest) citado no
 * roadmap — a interface pública (computeRiskScore) não muda.
 */

export interface SupplierSignals {
  paymentDelayDaysAvg: number; // média de atraso em dias
  fiscalEvents90d: number; // eventos fiscais (autuações, pendências) nos últimos 90 dias
  ownershipChanges180d: number; // mudanças societárias nos últimos 180 dias
  marketSignalScore: number; // 0-100, sinais externos de mercado (quanto maior, pior)
  creditRatingScore: number; // 0-100, quanto maior melhor
}

export interface RiskResult {
  score: number; // 0-100 (probabilidade de deterioração em `horizonDays`)
  level: 'baixo' | 'medio' | 'alto' | 'critico';
  horizonDays: number;
  drivers: { factor: string; contribution: number; detail: string }[];
  recommendation: string;
}

const WEIGHTS = {
  paymentDelay: 0.28,
  fiscalEvents: 0.24,
  ownershipChanges: 0.16,
  marketSignal: 0.17,
  creditRating: 0.15,
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export function computeRiskScore(signals: SupplierSignals): RiskResult {
  const paymentComponent = clamp((signals.paymentDelayDaysAvg / 30) * 100); // 30d atraso = 100
  const fiscalComponent = clamp(signals.fiscalEvents90d * 20); // cada evento fiscal pesa 20 pts
  const ownershipComponent = clamp(signals.ownershipChanges180d * 25);
  const marketComponent = clamp(signals.marketSignalScore);
  const creditComponent = clamp(100 - signals.creditRatingScore); // inverte: rating baixo = risco alto

  const rawScore =
    paymentComponent * WEIGHTS.paymentDelay +
    fiscalComponent * WEIGHTS.fiscalEvents +
    ownershipComponent * WEIGHTS.ownershipChanges +
    marketComponent * WEIGHTS.marketSignal +
    creditComponent * WEIGHTS.creditRating;

  const score = Math.round(clamp(rawScore) * 10) / 10;

  let level: RiskResult['level'] = 'baixo';
  if (score >= 75) level = 'critico';
  else if (score >= 50) level = 'alto';
  else if (score >= 25) level = 'medio';

  const drivers = [
    {
      factor: 'Atraso de pagamento',
      contribution: Math.round(paymentComponent * WEIGHTS.paymentDelay * 10) / 10,
      detail: `Média de ${signals.paymentDelayDaysAvg.toFixed(1)} dias de atraso`,
    },
    {
      factor: 'Eventos fiscais (90d)',
      contribution: Math.round(fiscalComponent * WEIGHTS.fiscalEvents * 10) / 10,
      detail: `${signals.fiscalEvents90d} evento(s) fiscal(is) recente(s)`,
    },
    {
      factor: 'Mudanças societárias (180d)',
      contribution: Math.round(ownershipComponent * WEIGHTS.ownershipChanges * 10) / 10,
      detail: `${signals.ownershipChanges180d} alteração(ões) societária(s)`,
    },
    {
      factor: 'Sinais externos de mercado',
      contribution: Math.round(marketComponent * WEIGHTS.marketSignal * 10) / 10,
      detail: `Índice de sinal de mercado em ${signals.marketSignalScore.toFixed(0)}/100`,
    },
    {
      factor: 'Rating de crédito',
      contribution: Math.round(creditComponent * WEIGHTS.creditRating * 10) / 10,
      detail: `Rating atual: ${signals.creditRatingScore.toFixed(0)}/100`,
    },
  ].sort((a, b) => b.contribution - a.contribution);

  const recommendation = buildRecommendation(level, drivers[0].factor);

  return { score, level, horizonDays: 90, drivers, recommendation };
}

function buildRecommendation(level: RiskResult['level'], topDriver: string): string {
  switch (level) {
    case 'critico':
      return `Ação imediata recomendada: revisar contrato e acionar plano de mitigação. Principal fator: ${topDriver}.`;
    case 'alto':
      return `Monitoramento reforçado nos próximos 30 dias. Priorizar investigação de: ${topDriver}.`;
    case 'medio':
      return `Acompanhar na próxima revisão trimestral. Observar evolução de: ${topDriver}.`;
    default:
      return 'Fornecedor dentro dos parâmetros esperados. Nenhuma ação adicional necessária.';
  }
}
