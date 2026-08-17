import { ReactNode } from 'react';
import { levelBg, levelColor, levelLabel, severityColor } from './riskColors';

export function Panel({
  title,
  eyebrow,
  action,
  children,
  style,
}: {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <section
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--radius-md)',
        padding: 20,
        ...style,
      }}
    >
      {(title || eyebrow) && (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            {eyebrow && (
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--accent)',
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                {eyebrow}
              </div>
            )}
            {title && (
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 19, letterSpacing: '0.01em' }}>
                {title}
              </h2>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function RiskBadge({ level }: { level: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 9px',
        borderRadius: 2,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        color: levelColor(level),
        background: levelBg(level),
        border: `1px solid ${levelColor(level)}33`,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: levelColor(level) }} />
      {levelLabel(level)}
    </span>
  );
}

export function SeverityDot({ severity }: { severity: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: severityColor(severity),
        flexShrink: 0,
      }}
    />
  );
}

export function KpiCard({
  value,
  label,
  sublabel,
  accent = false,
}: {
  value: ReactNode;
  label: string;
  sublabel?: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--hairline)',
        borderTop: accent ? '2px solid var(--accent)' : '1px solid var(--hairline)',
        borderRadius: 'var(--radius-md)',
        padding: '18px 20px',
        flex: 1,
        minWidth: 160,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 30,
          fontWeight: 600,
          color: accent ? 'var(--accent)' : 'var(--text-primary)',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>{label}</div>
      {sublabel && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{sublabel}</div>}
    </div>
  );
}

export function CategoryChip({ category }: { category: string }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        fontWeight: 600,
        border: '1px solid var(--hairline-strong)',
        borderRadius: 2,
        padding: '2px 6px',
        color: 'var(--text-secondary)',
      }}
    >
      CAT {category}
    </span>
  );
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div style={{ padding: '32px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--text-secondary)', marginBottom: 4 }}>
        {title}
      </div>
      {detail && <div style={{ fontSize: 13 }}>{detail}</div>}
    </div>
  );
}
