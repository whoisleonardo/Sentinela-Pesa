import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { api, EsgProjectionPoint, RiskScore } from '../api/client';
import { Panel, RiskBadge, CategoryChip, EmptyState } from '../components/ui';
import { RiskGauge } from '../components/RiskGauge';

const DOC_TYPES: { key: string; label: string }[] = [
  { key: 'minuta_contrato', label: 'Minuta de Contrato' },
  { key: 'checklist_auditoria', label: 'Checklist de Auditoria' },
  { key: 'comunicado_compliance', label: 'Comunicado de Compliance' },
];

export function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.suppliers.detail>> | null>(null);
  const [esg, setEsg] = useState<{ history: any[]; projection: EsgProjectionPoint[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState<string | null>(null);
  const [genContent, setGenContent] = useState<{ type: string; content: string } | null>(null);

  const load = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([api.suppliers.detail(id), api.esg.forSupplier(id).catch(() => null)])
      .then(([d, e]) => {
        setData(d);
        setEsg(e);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleRefresh = async () => {
    if (!id) return;
    await api.suppliers.refresh(id);
    setTimeout(load, 1500);
  };

  const handleGenerate = async (docType: string) => {
    if (!id) return;
    setGenLoading(docType);
    try {
      const r = await api.documents.generate(id, docType);
      setGenContent({ type: docType, content: r.content });
    } catch (e: any) {
      setGenContent({ type: docType, content: `Erro ao gerar documento: ${e.message}` });
    } finally {
      setGenLoading(null);
    }
  };

  if (loading) return <EmptyState title="Carregando fornecedor..." />;
  if (error || !data) return <EmptyState title="Erro ao carregar fornecedor" detail={error ?? ''} />;

  const { supplier, riskHistory, documents } = data;
  const latestRisk: RiskScore | undefined = riskHistory[0];

  const esgChartData = esg
    ? [
        ...esg.history.map((h) => ({
          label: new Date(h.reference_month).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          real: h.score,
          projetado: null as number | null,
        })),
        ...esg.projection.map((p) => ({
          label: `+${p.month}m`,
          real: null as number | null,
          projetado: p.score,
        })),
      ]
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 600 }}>
            Ficha do fornecedor
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 500, margin: '4px 0 6px' }}>{supplier.name}</h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{supplier.document_id}</span>
            <CategoryChip category={supplier.category} />
            <span style={{ textTransform: 'capitalize' }}>{supplier.status.replace('_', ' ')}</span>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          style={{
            background: 'transparent',
            border: '1px solid var(--hairline-strong)',
            color: 'var(--text-secondary)',
            borderRadius: 3,
            padding: '9px 16px',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          ↻ Recalcular
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, alignItems: 'stretch' }}>
        <Panel eyebrow="IA Preditiva de Risco" title="Score atual" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {latestRisk ? (
            <>
              <RiskGauge score={Number(latestRisk.score)} level={latestRisk.risk_level} size={190} />
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 8 }}>
                {latestRisk.recommendation}
              </p>
            </>
          ) : (
            <EmptyState title="Sem score calculado" detail="Clique em recalcular." />
          )}
        </Panel>

        <Panel eyebrow="Explicabilidade" title="Fatores que compõem o score">
          {latestRisk?.drivers?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {latestRisk.drivers.map((d, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-primary)' }}>{d.factor}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{d.detail}</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--bg-panel-raised)', borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, d.contribution * 3)}%`,
                        height: '100%',
                        background: 'var(--accent)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Sem detalhamento disponível" />
          )}
        </Panel>
      </div>

      <Panel eyebrow="ESG Preditivo" title="Trajetória do score ESG — realizado e projeção (12 meses)">
        {esgChartData.length ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={esgChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-secondary)', fontSize: 11.5 }} axisLine={{ stroke: 'var(--hairline)' }} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-panel-raised)', border: '1px solid var(--hairline-strong)', fontSize: 13 }}
                labelStyle={{ color: 'var(--text-primary)' }}
                itemStyle={{ color: 'var(--text-secondary)' }}
              />
              <Legend wrapperStyle={{ fontSize: 12.5 }} />
              <ReferenceLine y={85} stroke="var(--accent-dim)" strokeDasharray="4 4" label={{ value: 'Meta', fill: 'var(--accent)', fontSize: 11 }} />
              <Line type="monotone" dataKey="real" name="Realizado" stroke="var(--risk-medio)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
              <Line type="monotone" dataKey="projetado" name="Projeção" stroke="var(--accent)" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState title="Sem histórico ESG ainda" />
        )}
      </Panel>

      <Panel eyebrow="Automação Generativa" title="Gerar documento">
        <div style={{ display: 'flex', gap: 10, marginBottom: genContent ? 16 : 0, flexWrap: 'wrap' }}>
          {DOC_TYPES.map((d) => (
            <button
              key={d.key}
              onClick={() => handleGenerate(d.key)}
              disabled={genLoading === d.key}
              style={{
                background: genLoading === d.key ? 'var(--bg-panel-hover)' : 'var(--accent)',
                color: genLoading === d.key ? 'var(--text-secondary)' : '#17181b',
                border: 'none',
                borderRadius: 3,
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: genLoading === d.key ? 'default' : 'pointer',
              }}
            >
              {genLoading === d.key ? 'Gerando...' : `+ ${d.label}`}
            </button>
          ))}
        </div>
        {genContent && (
          <pre
            style={{
              background: 'var(--bg-panel-raised)',
              border: '1px solid var(--hairline)',
              borderRadius: 3,
              padding: 16,
              fontSize: 12.5,
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'pre-wrap',
              maxHeight: 340,
              overflowY: 'auto',
              color: 'var(--text-secondary)',
            }}
          >
            {genContent.content}
          </pre>
        )}
        {documents.length > 0 && (
          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)' }}>
            {documents.length} documento(s) gerado(s) anteriormente para este fornecedor.
          </div>
        )}
      </Panel>
    </div>
  );
}
