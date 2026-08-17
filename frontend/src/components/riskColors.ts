export type RiskLevel = 'baixo' | 'medio' | 'alto' | 'critico';

export function levelColor(level: string): string {
  switch (level) {
    case 'critico':
      return 'var(--risk-critico)';
    case 'alto':
      return 'var(--risk-alto)';
    case 'medio':
      return 'var(--risk-medio)';
    default:
      return 'var(--risk-baixo)';
  }
}

export function levelBg(level: string): string {
  switch (level) {
    case 'critico':
      return 'var(--risk-critico-bg)';
    case 'alto':
      return 'var(--risk-alto-bg)';
    case 'medio':
      return 'var(--risk-medio-bg)';
    default:
      return 'var(--risk-baixo-bg)';
  }
}

export function levelLabel(level: string): string {
  switch (level) {
    case 'critico':
      return 'Crítico';
    case 'alto':
      return 'Alto';
    case 'medio':
      return 'Médio';
    case 'baixo':
      return 'Baixo';
    default:
      return level;
  }
}

export function severityColor(severity: string): string {
  switch (severity) {
    case 'critico':
      return 'var(--risk-critico)';
    case 'atencao':
      return 'var(--risk-alto)';
    default:
      return 'var(--risk-medio)';
  }
}
