import { Link } from 'react-router-dom';
import { Panel } from '../components/ui';

const modules = [
  {
    number: '01',
    title: 'Visão Geral',
    description: 'Comece aqui para acompanhar os indicadores da base, a distribuição de risco e os alertas mais recentes.',
    to: '/',
    action: 'Abrir visão geral',
  },
  {
    number: '02',
    title: 'Fornecedores',
    description: 'Consulte a base, abra o cadastro de um fornecedor e analise os dados usados na homologação.',
    to: '/fornecedores',
    action: 'Ver fornecedores',
  },
  {
    number: '03',
    title: 'Comparativo',
    description: 'Selecione até quatro fornecedores para comparar risco, ESG, categoria, segmento e status lado a lado.',
    to: '/comparativo',
    action: 'Comparar fornecedores',
  },
  {
    number: '04',
    title: 'Grafo de Vínculos',
    description: 'Investigue relações entre fornecedores, sócios e empresas. Use a visualização para identificar conexões relevantes.',
    to: '/grafo',
    action: 'Abrir grafo',
  },
  {
    number: '05',
    title: 'Precificação e Alertas',
    description: 'Use a precificação para avaliar cotações e acompanhe os alertas para priorizar verificações e decisões.',
    to: '/alertas',
    action: 'Ver alertas',
  },
];

const steps = [
  ['Consulte a base', 'Abra Fornecedores e use os filtros para localizar a empresa que deseja analisar.'],
  ['Avalie o risco', 'Na página do fornecedor, confira o score, a classificação de risco, os dados ESG e os vínculos identificados.'],
  ['Compare alternativas', 'Em Comparativo, escolha dois ou mais fornecedores. Os destaques indicam o melhor resultado em cada critério.'],
  ['Acompanhe exceções', 'Verifique Alertas com frequência. Eventos críticos ou de alto risco merecem validação antes da homologação.'],
];

export function SupportMaterial() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1050 }}>
      <div>
        <div style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 600 }}>
          Central de ajuda
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 500, margin: '4px 0 8px' }}>
          Material de Apoio
        </h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, maxWidth: 720 }}>
          Um guia rápido para usar o Sentinela na análise, comparação e acompanhamento de fornecedores.
        </p>
      </div>

      <Panel eyebrow="Fluxo recomendado" title="Como usar o sistema">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
          {steps.map(([title, description], index) => (
            <div key={title} style={{ padding: '14px 14px 12px', border: '1px solid var(--hairline)', borderRadius: 3, background: 'var(--bg-panel-raised)' }}>
              <div style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 12, marginBottom: 10 }}>
                {String(index + 1).padStart(2, '0')}
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{title}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.5 }}>{description}</div>
            </div>
          ))}
        </div>
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        {modules.map((module) => (
          <Panel key={module.title}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
              <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{module.number}</span>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 20 }}>{module.title}</h2>
            </div>
            <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.55, minHeight: 60 }}>
              {module.description}
            </p>
            <Link to={module.to} style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              {module.action} →
            </Link>
          </Panel>
        ))}
      </div>

      <Panel eyebrow="Leitura dos indicadores" title="O que considerar antes de decidir">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.55 }}>
          <div><strong style={{ color: 'var(--text-primary)' }}>Risco:</strong> quanto menor o score, menor a exposição estimada. Avalie também a classificação exibida.</div>
          <div><strong style={{ color: 'var(--text-primary)' }}>ESG:</strong> quanto maior o score, melhor o desempenho nos critérios ambientais, sociais e de governança.</div>
          <div><strong style={{ color: 'var(--text-primary)' }}>Alertas e vínculos:</strong> use-os como sinal de investigação. Confirme o contexto antes de tomar uma decisão de homologação.</div>
        </div>
      </Panel>
    </div>
  );
}
