import { useEffect, useMemo, useState } from 'react';
import { api, GraphEdge, GraphNode } from '../api/client';
import { Panel, EmptyState, RiskBadge, CategoryChip } from '../components/ui';
import { levelColor } from '../components/riskColors';

const RISK_FLAG_COLOR: Record<string, string> = {
  info: 'var(--hairline-strong)',
  atencao: 'var(--risk-alto)',
  critico: 'var(--risk-critico)',
};

export function Graph() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    api.graph
      .full()
      .then((r) => {
        setNodes(r.nodes);
        setEdges(r.edges);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Canvas fixo até ~24 fornecedores; só cresce além disso, quando o nº de
  // nós realmente exigir mais espaço. O raio dos nós fica bem menor que
  // metade do canvas de propósito: o rótulo de cada nó é desenhado
  // radialmente para FORA do círculo (não para baixo — ver positions
  // abaixo), então essa margem é o que evita o texto ser cortado na borda.
  const size = nodes.length > 24 ? 880 + (nodes.length - 24) * 26 : 880;
  const center = size / 2;
  const radius = size * 0.28;

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number; labelX: number; labelY: number; anchor: 'start' | 'middle' | 'end' }>();
    nodes.forEach((n, i) => {
      const angle = (i / Math.max(nodes.length, 1)) * 2 * Math.PI - Math.PI / 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      // O rótulo fica numa órbita mais externa que os nós, na MESMA direção
      // radial de cada nó — assim ele sempre aponta pra fora do miolo do
      // grafo (onde estão os outros nós) em vez de cair sobre o vizinho.
      const labelRadius = radius + 46;
      map.set(n.id, {
        x: center + radius * cos,
        y: center + radius * sin,
        labelX: center + labelRadius * cos,
        labelY: center + labelRadius * sin,
        anchor: cos > 0.35 ? 'start' : cos < -0.35 ? 'end' : 'middle',
      });
    });
    return map;
  }, [nodes, size]);

  if (loading) return <EmptyState title="Carregando grafo..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 600 }}>
          Grafo de Relacionamento
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 500, margin: '4px 0 0' }}>
          Vínculos entre fornecedores
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        <Panel>
          {error ? (
            <EmptyState title="Erro ao carregar grafo" detail={error} />
          ) : nodes.length === 0 ? (
            <EmptyState title="Nenhum fornecedor cadastrado ainda" />
          ) : (
            <svg width="100%" viewBox={`0 0 ${size} ${size}`} style={{ maxHeight: 600 }}>
              {edges.map((e, i) => {
                const s = positions.get(e.source);
                const t = positions.get(e.target);
                if (!s || !t) return null;
                const isHovered = hovered === e.source || hovered === e.target;
                return (
                  <line
                    key={i}
                    x1={s.x}
                    y1={s.y}
                    x2={t.x}
                    y2={t.y}
                    stroke={RISK_FLAG_COLOR[e.riskFlag]}
                    strokeWidth={e.riskFlag === 'critico' ? 2.5 : 1.3}
                    strokeDasharray={e.riskFlag === 'info' ? '4 3' : undefined}
                    opacity={isHovered || !hovered ? 1 : 0.15}
                  />
                );
              })}
              {nodes.map((n) => {
                const p = positions.get(n.id);
                if (!p) return null;
                const isHoveredNode = hovered === n.id;
                const isConnected = edges.some(
                  (e) => (e.source === n.id || e.target === n.id) && (e.source === hovered || e.target === hovered),
                );
                const dim = hovered && !isHoveredNode && !isConnected;
                return (
                  <g
                    key={n.id}
                    onMouseEnter={() => setHovered(n.id)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ cursor: 'pointer' }}
                    opacity={dim ? 0.35 : 1}
                  >
                    {/* tooltip nativo do navegador — mostra o nome completo ao passar o mouse */}
                    <title>{n.name}</title>
                    <circle cx={p.x} cy={p.y} r={26} fill="var(--bg-panel-raised)" stroke={levelColor(n.riskLevel)} strokeWidth={2.5} />
                    <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={11} fontFamily="var(--font-mono)" fill={levelColor(n.riskLevel)} fontWeight={600}>
                      {n.category}
                    </text>
                    <text x={p.labelX} y={p.labelY} textAnchor={p.anchor} fontSize={11} fill="var(--text-secondary)">
                      {n.name.length > 22 ? `${n.name.slice(0, 20)}…` : n.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </Panel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Panel title="Fornecedor">
            {(() => {
              const n = nodes.find((x) => x.id === hovered);
              if (!n) {
                return <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Passe o mouse sobre um nó pra ver o nome completo.</div>;
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{n.name}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <CategoryChip category={n.category} />
                    <RiskBadge level={n.riskLevel} />
                  </div>
                </div>
              );
            })()}
          </Panel>

          <Panel title="Legenda">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
              {['baixo', 'medio', 'alto', 'critico'].map((lvl) => (
                <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${levelColor(lvl)}` }} />
                  <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>Risco {lvl}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Vínculos críticos" eyebrow="Atenção">
            {edges.filter((e) => e.riskFlag === 'critico').length === 0 ? (
              <EmptyState title="Nenhum vínculo crítico" detail="Nenhuma coincidência com base de sanções." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {edges
                  .filter((e) => e.riskFlag === 'critico')
                  .map((e, i) => (
                    <div key={i} style={{ fontSize: 12.5, color: 'var(--text-secondary)', borderLeft: '2px solid var(--risk-critico)', paddingLeft: 10 }}>
                      {e.detail}
                    </div>
                  ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
