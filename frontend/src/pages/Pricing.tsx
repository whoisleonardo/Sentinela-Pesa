import { useEffect, useState } from 'react';
import { api, Supplier } from '../api/client';
import { Panel, EmptyState } from '../components/ui';

const editInputStyle: React.CSSProperties = {
  width: 84,
  background: 'var(--bg-panel)',
  border: '1px solid var(--hairline-strong)',
  borderRadius: 3,
  padding: '5px 7px',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
};

export function Pricing() {
  const [benchmarks, setBenchmarks] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [price, setPrice] = useState('');
  const [result, setResult] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ p25: '', avg: '', p75: '', unit: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadBenchmarks = () => api.pricing.benchmarks().then((r) => setBenchmarks(r.benchmarks));

  useEffect(() => {
    loadBenchmarks();
    api.suppliers.list().then((r) => setSuppliers(r.suppliers));
  }, []);

  const startEdit = (b: any) => {
    setEditingId(b.id);
    setEditError(null);
    setEditValues({
      p25: String(b.market_p25),
      avg: String(b.market_avg),
      p75: String(b.market_p75),
      unit: b.unit,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const saveEdit = async (id: string) => {
    setSavingEdit(true);
    setEditError(null);
    try {
      await api.pricing.updateBenchmark(id, {
        marketP25: Number(editValues.p25),
        marketAvg: Number(editValues.avg),
        marketP75: Number(editValues.p75),
        unit: editValues.unit,
      });
      setEditingId(null);
      await loadBenchmarks();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !itemCategory || !price) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.pricing.evaluateQuote({
        supplierId,
        itemCategory,
        quotedPrice: Number(price),
      });
      setResult(r.evaluation);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const flagColor = (flag: string) =>
    flag === 'acima_mercado' ? 'var(--risk-alto)' : flag === 'abaixo_mercado' ? 'var(--risk-medio)' : 'var(--risk-baixo)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 600 }}>
          Inteligência de Precificação
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 500, margin: '4px 0 0' }}>
          Benchmark de Mercado
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>
        <Panel title="Benchmarks por categoria">
          {benchmarks.length === 0 ? (
            <EmptyState title="Sem benchmarks cadastrados" />
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: 11.5, textTransform: 'uppercase' }}>
                    <th style={{ padding: '0 0 10px', fontWeight: 500 }}>Categoria</th>
                    <th style={{ padding: '0 0 10px', fontWeight: 500 }}>P25</th>
                    <th style={{ padding: '0 0 10px', fontWeight: 500 }}>Média</th>
                    <th style={{ padding: '0 0 10px', fontWeight: 500 }}>P75</th>
                    <th style={{ padding: '0 0 10px', fontWeight: 500 }}>Unidade</th>
                    <th style={{ padding: '0 0 10px', fontWeight: 500 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarks.map((b) => {
                    const isEditing = editingId === b.id;
                    return (
                      <tr key={b.item_category} style={{ borderTop: '1px solid var(--hairline)' }}>
                        <td style={{ padding: '10px 0', textTransform: 'capitalize' }}>{b.item_category.replace(/_/g, ' ')}</td>
                        {isEditing ? (
                          <>
                            <td>
                              <input style={editInputStyle} type="number" step="0.01" value={editValues.p25} onChange={(e) => setEditValues((v) => ({ ...v, p25: e.target.value }))} />
                            </td>
                            <td>
                              <input style={editInputStyle} type="number" step="0.01" value={editValues.avg} onChange={(e) => setEditValues((v) => ({ ...v, avg: e.target.value }))} />
                            </td>
                            <td>
                              <input style={editInputStyle} type="number" step="0.01" value={editValues.p75} onChange={(e) => setEditValues((v) => ({ ...v, p75: e.target.value }))} />
                            </td>
                            <td>
                              <input style={{ ...editInputStyle, width: 70 }} value={editValues.unit} onChange={(e) => setEditValues((v) => ({ ...v, unit: e.target.value }))} />
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <button
                                onClick={() => saveEdit(b.id)}
                                disabled={savingEdit}
                                style={{ background: 'var(--accent)', color: '#17181b', border: 'none', borderRadius: 3, padding: '5px 9px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', marginRight: 6 }}
                              >
                                {savingEdit ? '...' : 'salvar'}
                              </button>
                              <button
                                onClick={cancelEdit}
                                disabled={savingEdit}
                                style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--hairline-strong)', borderRadius: 3, padding: '5px 9px', fontSize: 11.5, cursor: 'pointer' }}
                              >
                                cancelar
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ fontFamily: 'var(--font-mono)' }}>{Number(b.market_p25).toLocaleString('pt-BR')}</td>
                            <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{Number(b.market_avg).toLocaleString('pt-BR')}</td>
                            <td style={{ fontFamily: 'var(--font-mono)' }}>{Number(b.market_p75).toLocaleString('pt-BR')}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{b.unit}</td>
                            <td>
                              <button
                                onClick={() => startEdit(b)}
                                style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--hairline-strong)', borderRadius: 3, padding: '5px 9px', fontSize: 11.5, cursor: 'pointer' }}
                              >
                                editar
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {editError && <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--risk-critico)' }}>{editError}</div>}
            </>
          )}
        </Panel>

        <Panel title="Avaliar cotação">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
              style={{ background: 'var(--bg-panel-raised)', border: '1px solid var(--hairline)', borderRadius: 3, padding: '9px 12px', color: 'var(--text-primary)', fontSize: 13 }}
            >
              <option value="">Fornecedor...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select
              value={itemCategory}
              onChange={(e) => setItemCategory(e.target.value)}
              required
              style={{ background: 'var(--bg-panel-raised)', border: '1px solid var(--hairline)', borderRadius: 3, padding: '9px 12px', color: 'var(--text-primary)', fontSize: 13 }}
            >
              <option value="">Categoria do item...</option>
              {benchmarks.map((b) => (
                <option key={b.item_category} value={b.item_category}>{b.item_category.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Preço cotado (R$)"
              required
              style={{ background: 'var(--bg-panel-raised)', border: '1px solid var(--hairline)', borderRadius: 3, padding: '9px 12px', color: 'var(--text-primary)', fontSize: 13 }}
            />
            <button
              type="submit"
              disabled={submitting}
              style={{ background: 'var(--accent)', color: '#17181b', border: 'none', borderRadius: 3, padding: '10px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            >
              {submitting ? 'Avaliando...' : 'Avaliar contra benchmark'}
            </button>
          </form>

          {error && <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--risk-critico)' }}>{error}</div>}

          {result && (
            <div style={{ marginTop: 16, padding: 14, borderRadius: 3, border: `1px solid ${flagColor(result.flag)}55`, background: `${flagColor(result.flag)}15` }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, color: flagColor(result.flag) }}>
                {result.deviationPct > 0 ? '+' : ''}{result.deviationPct}%
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>{result.suggestion}</div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
