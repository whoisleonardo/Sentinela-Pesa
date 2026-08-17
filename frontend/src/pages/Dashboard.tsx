import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api, Alert, DashboardKpis } from '../api/client';
import { KpiCard, Panel, EmptyState, SeverityDot } from '../components/ui';
import { levelColor, levelLabel, severityColor } from '../components/riskColors';
import { useAlertStream } from '../hooks/useAlertStream';

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)}d`;
}

export function Dashboard() {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { liveAlerts } = useAlertStream();

  useEffect(() => {
    Promise.all([api.analytics.kpis(), api.alerts.list(8)])
      .then(([k, a]) => {
        setKpis(k);
        setAlerts(a.alerts);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const mergedAlerts = [...liveAlerts.filter((la) => !alerts.some((a) => a.id === la.id)), ...alerts].slice(0, 8);

  if (loading) return <EmptyState title="Carregando painel..." />;
  if (error)
    return (
      <EmptyState
        title="Não foi possível carregar o painel"
        detail={`${error} — verifique se a API, o Postgres e o Redis estão de pé (docker compose up).`}
      />
    );

  const riskChartData = ['baixo', 'medio', 'alto', 'critico'].map((level) => ({
    level,
    label: levelLabel(level),
    total: kpis?.riskDistribution.find((r) => r.risk_level === level)?.total ?? 0,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 600 }}>
          Fase 2 · IA como motor da homologação
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 500, margin: '4px 0 0' }}>
          Visão Geral
        </h1>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <KpiCard value={kpis?.totalSuppliers ?? 0} label="Fornecedores monitorados" accent />
        <KpiCard value={`${kpis?.conformityRatePct ?? 0}%`} label="Taxa de conformidade" />
        <KpiCard
          value={`R$ ${(kpis?.riskValueBlocked ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}
          label="Valor de risco sinalizado"
          sublabel="cotações fora da faixa de mercado"
        />
        <KpiCard
          value={kpis?.riskDistribution.find((r) => r.risk_level === 'critico')?.total ?? 0}
          label="Fornecedores em risco crítico"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, alignItems: 'start' }}>
        <Panel eyebrow="IA Preditiva de Risco" title="Distribuição de risco na base">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={riskChartData} barSize={54}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-secondary)', fontSize: 12.5 }} axisLine={{ stroke: 'var(--hairline)' }} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-panel-raised)', border: '1px solid var(--hairline-strong)', fontSize: 13 }}
                labelStyle={{ color: 'var(--text-primary)' }}
                itemStyle={{ color: 'var(--text-secondary)' }}
                cursor={{ fill: 'var(--bg-panel-hover)' }}
              />
              <Bar dataKey="total" radius={[3, 3, 0, 0]}>
                {riskChartData.map((entry) => (
                  <Cell key={entry.level} fill={levelColor(entry.level)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel eyebrow="Tempo real" title="Alertas recentes" action={<Link to="/alertas" style={{ fontSize: 12.5, color: 'var(--accent)' }}>ver todos →</Link>}>
          {mergedAlerts.length === 0 ? (
            <EmptyState title="Nenhum alerta ainda" detail="Assim que o worker processar eventos, alertas aparecem aqui em tempo real." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 260, overflowY: 'auto' }}>
              {mergedAlerts.map((a) => (
                <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ marginTop: 5 }}>
                    <SeverityDot severity={a.severity} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(a.created_at)} · {a.source.replace('_engine', '')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel eyebrow="ESG Preditivo" title="Distribuição por categoria de homologação">
        <div style={{ display: 'flex', gap: 14 }}>
          {kpis?.categoryDistribution.map((c) => (
            <div
              key={c.category}
              style={{
                flex: 1,
                border: '1px solid var(--hairline)',
                borderRadius: 3,
                padding: '14px 16px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 600 }}>{c.total}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Categoria {c.category}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
