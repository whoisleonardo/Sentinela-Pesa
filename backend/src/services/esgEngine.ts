/**
 * Motor ESG Preditivo
 * ------------------------------------------------------------------
 * Calcula o score ESG atual a partir de indicadores brutos e projeta
 * a trajetória para os próximos 12 meses. A projeção usa uma curva de
 * convergência (aproximação exponencial) em direção ao benchmark da
 * categoria-alvo — mesma lógica de "meta" usada no slide original,
 * mas parametrizável e substituível por um modelo de série temporal real.
 */

export interface EsgSignals {
  emissionsIndex: number; // 0-100, quanto maior pior
  wasteIndex: number; // 0-100, quanto maior pior
  turnoverRate: number; // % de rotatividade de colaboradores
  envFines12m: number; // autuações ambientais nos últimos 12 meses
}

export interface EsgResult {
  score: number; // 0-100, quanto maior melhor
  category: 'A' | 'B' | 'C';
  variables: { name: string; value: number; weight: number }[];
}

export function computeEsgScore(signals: EsgSignals): EsgResult {
  const emissionsScore = 100 - signals.emissionsIndex;
  const wasteScore = 100 - signals.wasteIndex;
  const turnoverScore = Math.max(0, 100 - signals.turnoverRate * 2.5);
  const finesScore = Math.max(0, 100 - signals.envFines12m * 15);

  const weights = { emissions: 0.3, waste: 0.25, turnover: 0.2, fines: 0.25 };

  const raw =
    emissionsScore * weights.emissions +
    wasteScore * weights.waste +
    turnoverScore * weights.turnover +
    finesScore * weights.fines;

  const score = Math.round(Math.max(0, Math.min(100, raw)) * 10) / 10;

  let category: EsgResult['category'] = 'C';
  if (score >= 75) category = 'A';
  else if (score >= 55) category = 'B';

  return {
    score,
    category,
    variables: [
      { name: 'Emissões', value: signals.emissionsIndex, weight: weights.emissions },
      { name: 'Gestão de resíduos', value: signals.wasteIndex, weight: weights.waste },
      { name: 'Turnover', value: signals.turnoverRate, weight: weights.turnover },
      { name: 'Autuações ambientais (12m)', value: signals.envFines12m, weight: weights.fines },
    ],
  };
}

/**
 * Projeta os próximos `months` meses de score ESG assumindo uma
 * convergência gradual em direção ao benchmark de categoria (85, por
 * padrão — meta usada na apresentação original).
 */
export function projectEsgTrajectory(
  currentScore: number,
  months = 12,
  benchmarkTarget = 85,
  convergenceRate = 0.18,
): { month: number; score: number }[] {
  const trajectory: { month: number; score: number }[] = [];
  let score = currentScore;
  for (let m = 1; m <= months; m++) {
    score = score + (benchmarkTarget - score) * convergenceRate;
    trajectory.push({ month: m, score: Math.round(score * 10) / 10 });
  }
  return trajectory;
}
