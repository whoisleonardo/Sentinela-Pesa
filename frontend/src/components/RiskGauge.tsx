import { levelColor, levelLabel } from './riskColors';

interface RiskGaugeProps {
  score: number; // 0-100
  level: 'baixo' | 'medio' | 'alto' | 'critico';
  size?: number;
  label?: string;
}

/**
 * Mostrador radial inspirado em painéis de instrumento de máquinas
 * pesadas (tacômetro) — elemento de assinatura visual do Sentinela.
 */
export function RiskGauge({ score, level, size = 168, label = 'Score de risco' }: RiskGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const startAngle = -120;
  const endAngle = 120;
  const angle = startAngle + (clamped / 100) * (endAngle - startAngle);
  const color = levelColor(level);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;

  const toXY = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };

  const [needleX, needleY] = toXY(angle);

  const arcPath = (from: number, to: number, radius: number) => {
    const [x1, y1] = toXY(from);
    const [x2, y2] = toXY(to);
    const largeArc = to - from > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const ticks = Array.from({ length: 11 }, (_, i) => startAngle + (i / 10) * (endAngle - startAngle));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={size} height={size * 0.72} viewBox={`0 0 ${size} ${size * 0.62}`}>
        {/* trilha de fundo */}
        <path
          d={arcPath(startAngle, endAngle, r)}
          fill="none"
          stroke="var(--hairline)"
          strokeWidth={8}
          strokeLinecap="round"
        />
        {/* trilha colorida até o valor atual */}
        <path
          d={arcPath(startAngle, angle, r)}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
        />
        {/* ticks */}
        {ticks.map((t, i) => {
          const [x1, y1] = toXY(t);
          const rad = ((t - 90) * Math.PI) / 180;
          const x2 = cx + (r + 10) * Math.cos(rad);
          const y2 = cy + (r + 10) * Math.sin(rad);
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--hairline-strong)" strokeWidth={1.5} />
          );
        })}
        {/* ponteiro */}
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={5} fill={color} />
        <text
          x={cx}
          y={cy - r * 0.35}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={size * 0.155}
          fontWeight={600}
          fill="var(--text-primary)"
        >
          {clamped.toFixed(0)}
        </text>
      </svg>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {label}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 14,
            fontWeight: 600,
            color,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {levelLabel(level)}
        </div>
      </div>
    </div>
  );
}
