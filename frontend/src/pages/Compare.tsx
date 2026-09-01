import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, Supplier } from '../api/client';
import { CategoryChip, EmptyState, Panel } from '../components/ui';
import { RiskGauge } from '../components/RiskGauge';

const MAX_SLOTS = 4;
const CATEGORY_RANK: Record<string, number> = { A: 3, B: 2, C: 1 };

const selectStyle: React.CSSProperties = {
  background: 'var(--bg-panel-raised)',
  border: '1px solid var(--hairline)',
  borderRadius: 3,
  padding: '9px 12px',
  color: 'var(--text-primary)',
  fontSize: 13,
  minWidth: 220,
};

export function Compare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.suppliers
      .list()
      .then((r) => setSuppliers(r.suppliers))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const selectedIds = useMemo(
    () => (searchParams.get('ids') ?? '').split(',').filter(Boolean),
    [searchParams],
  );

  const setIds = (ids: string[]) => {
    const clean = ids.filter(Boolean);
    setSearchParams(clean.length ? { ids: clean.join(',') } : {});
  };

  const updateSlot = (index: number, id: string) => {
    const next = [...selectedIds];
    if (id) next[index] = id;
    else next.splice(index, 1);
    setIds(next);
  };

  const removeSlot = (index: number) => {
    const next = [...selectedIds];
    next.splice(index, 1);
    setIds(next);
  };

  // sempre mostra um slot vazio extra pra escolher o próximo, até o limite
  const slots = selectedIds.length < MAX_SLOTS ? [...selectedIds, ''] : selectedIds;

  const selected = selectedIds
    .map((id) => suppliers.find((s) => s.id === id))
    .filter((s): s is Supplier => !!s);

  const bestId = (getValue: (s: Supplier) => number | null, pickMax: boolean): string | null => {
    const withValue = selected
      .map((s) => ({ id: s.id, value: getValue(s) }))
      .filter((v): v is { id: string; value: number } => v.value != null);
    if (withValue.length < 2) return null;
    const target = pickMax ? Math.max(...withValue.map((v) => v.value)) : Math.min(...withValue.map((v) => v.value));
    const winners = withValue.filter((v) => v.value === target);
    return winners.length === 1 ? winners[0].id : null;
  };

  const bestRiskId = bestId((s) => (s.risk_score != null ? Number(s.risk_score) : null), false);
  const bestEsgId = bestId((s) => (s.esg_score != null ? Number(s.esg_score) : null), true);
  const bestCategoryId = bestId((s) => CATEGORY_RANK[s.category] ?? null, true);

  if (loading) return <EmptyState title="Carregando fornecedores..." />;
  if (error) return <EmptyState title="Erro ao carregar fornecedores" detail={error} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 600 }}>
          Comparativo
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 500, margin: '4px 0 0' }}>
          Comparar fornecedores
        </h1>
      </div>

      <Panel title="Selecionar fornecedores">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {slots.map((id, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {!id && <span style={{ color: 'var(--text-muted)', fontSize: 15 }}>+</span>}
              <select value={id} onChange={(e) => updateSlot(i, e.target.value)} style={selectStyle}>
                <option value="">Fornecedor...</option>
                {suppliers
                  .filter((s) => s.id === id || !selectedIds.includes(s.id))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
              {id && (
                <button
                  onClick={() => removeSlot(i)}
                  aria-label="Remover"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--hairline-strong)',
                    color: 'var(--text-secondary)',
                    borderRadius: 3,
                    width: 28,
                    height: 28,
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </Panel>

      {selected.length === 0 ? (
        <Panel>
          <EmptyState title="Nenhum fornecedor selecionado" detail="Escolha ao menos um fornecedor acima pra comparar." />
        </Panel>
      ) : (
        <Panel title="Comparativo">
          <div style={{ display: 'flex', gap: 24, marginBottom: 20, overflowX: 'auto' }}>
            {selected.map((s) => (
              <div
                key={s.id}
                style={{
                  minWidth: 180,
                  flex: 1,
                  textAlign: 'center',
                  ...(s.id === bestRiskId
                    ? { border: '1px solid var(--accent)', borderRadius: 6, padding: 10 }
                    : { padding: 10 }),
                }}
              >
                <div style={{ fontWeight: 500, marginBottom: 10, fontSize: 13.5 }}>{s.name}</div>
                {s.risk_score != null && s.risk_level ? (
                  <RiskGauge score={Number(s.risk_score)} level={s.risk_level} size={120} />
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Sem score de risco</div>
                )}
              </div>
            ))}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <tbody>
              <ComparisonRow
                label="ESG"
                cells={selected.map((s) => ({
                  id: s.id,
                  content: s.esg_score != null ? Number(s.esg_score).toFixed(0) : '—',
                  best: s.id === bestEsgId,
                }))}
              />
              <ComparisonRow
                label="Categoria"
                cells={selected.map((s) => ({
                  id: s.id,
                  content: <CategoryChip category={s.category} />,
                  best: s.id === bestCategoryId,
                }))}
              />
              <ComparisonRow
                label="Segmento"
                cells={selected.map((s) => ({ id: s.id, content: s.segment.replace(/_/g, ' '), best: false }))}
                capitalize
              />
              <ComparisonRow
                label="Status"
                cells={selected.map((s) => ({ id: s.id, content: s.status.replace('_', ' '), best: false }))}
                capitalize
              />
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}

function ComparisonRow({
  label,
  cells,
  capitalize,
}: {
  label: string;
  cells: { id: string; content: ReactNode; best: boolean }[];
  capitalize?: boolean;
}) {
  return (
    <tr style={{ borderTop: '1px solid var(--hairline)' }}>
      <td
        style={{
          padding: '10px 12px 10px 0',
          color: 'var(--text-muted)',
          fontSize: 11.5,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </td>
      {cells.map((c) => (
        <td
          key={c.id}
          style={{
            padding: '10px 12px',
            textAlign: 'center',
            color: c.best ? 'var(--accent)' : 'var(--text-primary)',
            fontWeight: c.best ? 600 : 400,
            textTransform: capitalize ? 'capitalize' : undefined,
          }}
        >
          {c.content}
        </td>
      ))}
    </tr>
  );
}
