/**
 * Motor de Inteligência de Precificação
 * ------------------------------------------------------------------
 * Compara a cotação de um fornecedor com o benchmark de mercado da
 * categoria de item e sinaliza desvios relevantes (acima do p75 ou
 * abaixo do p25 sugerem negociação ou risco de dumping).
 */

export interface PricingBenchmark {
  marketAvg: number;
  marketP25: number;
  marketP75: number;
}

export interface PricingEvaluation {
  deviationPct: number;
  flag: 'dentro_da_faixa' | 'acima_mercado' | 'abaixo_mercado';
  suggestion: string;
}

export function evaluateQuote(quotedPrice: number, benchmark: PricingBenchmark): PricingEvaluation {
  const deviationPct = Math.round(((quotedPrice - benchmark.marketAvg) / benchmark.marketAvg) * 1000) / 10;

  if (quotedPrice > benchmark.marketP75) {
    return {
      deviationPct,
      flag: 'acima_mercado',
      suggestion: `Cotação ${deviationPct}% acima da média de mercado. Sugerir renegociação com base no benchmark (P75: ${benchmark.marketP75.toFixed(2)}).`,
    };
  }

  if (quotedPrice < benchmark.marketP25) {
    return {
      deviationPct,
      flag: 'abaixo_mercado',
      suggestion: `Cotação ${Math.abs(deviationPct)}% abaixo da média de mercado. Validar viabilidade técnica/qualidade — risco de dumping ou insumo inferior.`,
    };
  }

  return {
    deviationPct,
    flag: 'dentro_da_faixa',
    suggestion: 'Cotação dentro da faixa esperada de mercado.',
  };
}
