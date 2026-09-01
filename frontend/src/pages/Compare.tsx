import { EmptyState, Panel } from '../components/ui';

export function Compare() {
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

      <Panel>
        <EmptyState title="Em construção" detail="Seleção de fornecedores chega na próxima tarefa." />
      </Panel>
    </div>
  );
}
