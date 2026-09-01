import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Visão Geral', icon: '◈', end: true },
  { to: '/fornecedores', label: 'Fornecedores', icon: '▤' },
  { to: '/comparativo', label: 'Comparativo', icon: '⇄' },
  { to: '/grafo', label: 'Grafo de Vínculos', icon: '⬡' },
  { to: '/precificacao', label: 'Precificação', icon: '฿' },
  { to: '/alertas', label: 'Alertas', icon: '▲' },
];

export function Layout({ connected }: { connected: boolean }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: 'var(--sidebar-w)',
          flexShrink: 0,
          borderRight: '1px solid var(--hairline)',
          background: 'var(--bg-panel)',
          padding: '22px 16px',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px', marginBottom: 30 }}>
          <div
            style={{
              width: 32,
              height: 32,
              display: 'grid',
              placeItems: 'center',
              background: 'var(--accent)',
              color: '#17181b',
              fontWeight: 700,
              borderRadius: 3,
              fontFamily: 'var(--font-display)',
            }}
          >
            S
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, letterSpacing: '0.02em' }}>
              SENTINELA
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>PESA · CATERPILLAR</div>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 3,
                fontSize: 13.5,
                fontWeight: 500,
                textDecoration: 'none',
                color: isActive ? 'var(--bg-base)' : 'var(--text-secondary)',
                background: isActive ? 'var(--accent)' : 'transparent',
                transition: 'background 120ms ease',
              })}
            >
              <span style={{ fontSize: 14, width: 16, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div
          style={{
            position: 'absolute',
            bottom: 22,
            left: 16,
            right: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            border: '1px solid var(--hairline)',
            borderRadius: 3,
            fontSize: 11.5,
            color: 'var(--text-muted)',
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: connected ? 'var(--risk-baixo)' : 'var(--risk-critico)',
              boxShadow: connected ? '0 0 6px var(--risk-baixo)' : 'none',
            }}
          />
          {connected ? 'Stream de alertas ativo' : 'Stream desconectado'}
        </div>
      </aside>

      <main style={{ flex: 1, padding: '28px 36px', maxWidth: 1320 }}>
        <Outlet />
      </main>
    </div>
  );
}
