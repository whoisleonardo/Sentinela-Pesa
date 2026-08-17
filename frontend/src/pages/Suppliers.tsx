import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Supplier } from '../api/client';
import { Panel, RiskBadge, CategoryChip, EmptyState } from '../components/ui';

const SEGMENT_OPTIONS = [
  { value: 'peças_fundidas', label: 'Peças fundidas' },
  { value: 'peças_hidráulicas', label: 'Peças hidráulicas' },
  { value: 'pneus', label: 'Pneus' },
  { value: 'insumos', label: 'Insumos' },
  { value: 'serviços_técnicos', label: 'Serviços técnicos' },
  { value: 'logística', label: 'Logística' },
  { value: 'aço_e_metais', label: 'Aço e metais' },
  { value: 'não_produtivo', label: 'Não produtivo' },
];

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-panel-raised)',
  border: '1px solid var(--hairline)',
  borderRadius: 3,
  padding: '9px 12px',
  color: 'var(--text-primary)',
  fontSize: 13,
  width: '100%',
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 11.5,
  color: 'var(--text-muted)',
  marginBottom: 5,
  display: 'block',
};

const emptyForm = {
  name: '',
  documentId: '',
  category: 'C',
  segment: 'não_produtivo',
  paymentDelayDaysAvg: 0,
  fiscalEvents90d: 0,
  ownershipChanges180d: 0,
  marketSignalScore: 50,
  creditRatingScore: 70,
  esgEmissionsIndex: 50,
  esgWasteIndex: 50,
  esgTurnoverRate: 15,
  esgEnvFines12m: 0,
};

export function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.suppliers
      .list({ search: search || undefined, category: category || undefined })
      .then((r) => setSuppliers(r.suppliers))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category]);

  const setField = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const raw = e.target.value;
    setForm((f) => ({ ...f, [key]: e.target.type === 'number' ? Number(raw) : raw }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      await api.suppliers.create(form);
      setShowForm(false);
      setForm(emptyForm);
      load();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 600 }}>
            Base homologada
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 500, margin: '4px 0 0' }}>Fornecedores</h1>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            background: showForm ? 'transparent' : 'var(--accent)',
            color: showForm ? 'var(--text-secondary)' : '#17181b',
            border: showForm ? '1px solid var(--hairline-strong)' : 'none',
            borderRadius: 3,
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {showForm ? 'Cancelar' : '+ Novo fornecedor'}
        </button>
      </div>

      {showForm && (
        <Panel title="Cadastrar fornecedor">
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={fieldLabelStyle}>Nome *</label>
                <input style={inputStyle} value={form.name} onChange={setField('name')} required minLength={2} placeholder="Razão social" />
              </div>
              <div>
                <label style={fieldLabelStyle}>CNPJ *</label>
                <input style={inputStyle} value={form.documentId} onChange={setField('documentId')} required minLength={11} placeholder="Somente números" />
              </div>
              <div>
                <label style={fieldLabelStyle}>Categoria</label>
                <select style={inputStyle} value={form.category} onChange={setField('category')}>
                  <option value="A">Categoria A</option>
                  <option value="B">Categoria B</option>
                  <option value="C">Categoria C</option>
                </select>
              </div>
            </div>

            <div style={{ maxWidth: 320 }}>
              <label style={fieldLabelStyle}>Segmento</label>
              <select style={inputStyle} value={form.segment} onChange={setField('segment')}>
                {SEGMENT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <details>
              <summary style={{ fontSize: 12.5, color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                Sinais avançados (opcional — usados pela IA de risco e ESG)
              </summary>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12 }}>
                <div>
                  <label style={fieldLabelStyle}>Atraso médio de pagamento (dias)</label>
                  <input style={inputStyle} type="number" value={form.paymentDelayDaysAvg} onChange={setField('paymentDelayDaysAvg')} min={0} />
                </div>
                <div>
                  <label style={fieldLabelStyle}>Eventos fiscais (90d)</label>
                  <input style={inputStyle} type="number" value={form.fiscalEvents90d} onChange={setField('fiscalEvents90d')} min={0} />
                </div>
                <div>
                  <label style={fieldLabelStyle}>Mudanças societárias (180d)</label>
                  <input style={inputStyle} type="number" value={form.ownershipChanges180d} onChange={setField('ownershipChanges180d')} min={0} />
                </div>
                <div>
                  <label style={fieldLabelStyle}>Sinal de mercado (0-100, maior = pior)</label>
                  <input style={inputStyle} type="number" value={form.marketSignalScore} onChange={setField('marketSignalScore')} min={0} max={100} />
                </div>
                <div>
                  <label style={fieldLabelStyle}>Rating de crédito (0-100, maior = melhor)</label>
                  <input style={inputStyle} type="number" value={form.creditRatingScore} onChange={setField('creditRatingScore')} min={0} max={100} />
                </div>
                <div>
                  <label style={fieldLabelStyle}>Índice de emissões (0-100)</label>
                  <input style={inputStyle} type="number" value={form.esgEmissionsIndex} onChange={setField('esgEmissionsIndex')} min={0} max={100} />
                </div>
                <div>
                  <label style={fieldLabelStyle}>Índice de resíduos (0-100)</label>
                  <input style={inputStyle} type="number" value={form.esgWasteIndex} onChange={setField('esgWasteIndex')} min={0} max={100} />
                </div>
                <div>
                  <label style={fieldLabelStyle}>Turnover de colaboradores (%)</label>
                  <input style={inputStyle} type="number" value={form.esgTurnoverRate} onChange={setField('esgTurnoverRate')} min={0} />
                </div>
                <div>
                  <label style={fieldLabelStyle}>Autuações ambientais (12m)</label>
                  <input style={inputStyle} type="number" value={form.esgEnvFines12m} onChange={setField('esgEnvFines12m')} min={0} />
                </div>
              </div>
            </details>

            {createError && <div style={{ fontSize: 12.5, color: 'var(--risk-critico)' }}>{createError}</div>}

            <div>
              <button
                type="submit"
                disabled={creating}
                style={{
                  background: 'var(--accent)',
                  color: '#17181b',
                  border: 'none',
                  borderRadius: 3,
                  padding: '10px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: creating ? 'default' : 'pointer',
                }}
              >
                {creating ? 'Cadastrando...' : 'Cadastrar fornecedor'}
              </button>
            </div>
          </form>
        </Panel>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou CNPJ..."
          style={{
            flex: 1,
            background: 'var(--bg-panel)',
            border: '1px solid var(--hairline)',
            borderRadius: 3,
            padding: '10px 14px',
            color: 'var(--text-primary)',
            fontSize: 13.5,
          }}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--hairline)',
            borderRadius: 3,
            padding: '10px 14px',
            color: 'var(--text-primary)',
            fontSize: 13.5,
          }}
        >
          <option value="">Todas as categorias</option>
          <option value="A">Categoria A</option>
          <option value="B">Categoria B</option>
          <option value="C">Categoria C</option>
        </select>
      </div>

      <Panel>
        {loading ? (
          <EmptyState title="Carregando fornecedores..." />
        ) : error ? (
          <EmptyState title="Erro ao carregar" detail={error} />
        ) : suppliers.length === 0 ? (
          <EmptyState title="Nenhum fornecedor encontrado" detail="Ajuste os filtros ou cadastre um novo fornecedor." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0 0 10px', fontWeight: 500 }}>Fornecedor</th>
                <th style={{ padding: '0 0 10px', fontWeight: 500 }}>Segmento</th>
                <th style={{ padding: '0 0 10px', fontWeight: 500 }}>Categoria</th>
                <th style={{ padding: '0 0 10px', fontWeight: 500 }}>Risco</th>
                <th style={{ padding: '0 0 10px', fontWeight: 500 }}>ESG</th>
                <th style={{ padding: '0 0 10px', fontWeight: 500 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} style={{ borderTop: '1px solid var(--hairline)' }}>
                  <td style={{ padding: '12px 0' }}>
                    <Link to={`/fornecedores/${s.id}`} style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {s.name}
                    </Link>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{s.document_id}</div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{s.segment.replace(/_/g, ' ')}</td>
                  <td><CategoryChip category={s.category} /></td>
                  <td>{s.risk_level ? <RiskBadge level={s.risk_level} /> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{s.esg_score != null ? Number(s.esg_score).toFixed(0) : '—'}</td>
                  <td style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{s.status.replace('_', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
