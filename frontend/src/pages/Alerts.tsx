import { useEffect, useState } from 'react';
import { api, Alert } from '../api/client';
import { Panel, EmptyState, SeverityDot } from '../components/ui';
import { useAlertStream } from '../hooks/useAlertStream';

export function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.alerts.list(100).then((r) => setAlerts(r.alerts)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  useAlertStream((incoming) => {
    setAlerts((prev) => (prev.some((a) => a.id === incoming.id) ? prev : [incoming, ...prev]));
  });

  const handleAck = async (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
    await api.alerts.ack(id).catch(load);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 600 }}>
          Monitoramento contínuo
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 500, margin: '4px 0 0' }}>Alertas</h1>
      </div>

      <Panel>
        {loading ? (
          <EmptyState title="Carregando alertas..." />
        ) : alerts.length === 0 ? (
          <EmptyState title="Nenhum alerta registrado" detail="O worker publica aqui assim que detectar risco, ESG baixo ou vínculo com sanção." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {alerts.map((a) => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '14px 4px',
                  borderTop: '1px solid var(--hairline)',
                  opacity: a.acknowledged ? 0.55 : 1,
                }}
              >
                <div style={{ marginTop: 5 }}>
                  <SeverityDot severity={a.severity} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 500 }}>{a.title}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                      {new Date(a.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 3 }}>{a.message}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    fonte: {a.source} {a.supplier_name ? `· ${a.supplier_name}` : ''}
                  </div>
                </div>
                {!a.acknowledged && (
                  <button
                    onClick={() => handleAck(a.id)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--hairline-strong)',
                      color: 'var(--text-secondary)',
                      borderRadius: 3,
                      padding: '5px 10px',
                      fontSize: 11.5,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    reconhecer
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
