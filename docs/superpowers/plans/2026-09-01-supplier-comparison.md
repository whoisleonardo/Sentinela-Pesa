# Comparativo entre fornecedores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nova tela `/comparativo` que compara até 4 fornecedores lado a lado (risco, ESG, categoria, segmento, status), com seleção persistida na URL.

**Architecture:** Página React nova (`Compare.tsx`) que reaproveita `api.suppliers.list()` (já existente, sem mudança de backend) e os componentes `RiskGauge`/`RiskBadge`/`CategoryChip`/`Panel`/`EmptyState` já usados no resto do app. Seleção de fornecedores fica em `?ids=` da URL via `useSearchParams` do react-router-dom.

**Tech Stack:** React 18 + TypeScript + react-router-dom 6 (já em uso). Sem dependência nova.

**Spec:** `docs/superpowers/specs/2026-09-01-supplier-comparison-design.md`

## Global Constraints

- Sem mudança de backend — usar só `GET /api/suppliers` (via `api.suppliers.list()`).
- Máximo 4 fornecedores selecionados por vez.
- Seleção sincronizada com a URL (`?ids=id1,id2,id3`).
- Destaque automático do melhor valor em Risco (menor score), ESG (maior score) e Categoria (A > B > C); Segmento/Status sem destaque. Empate = nenhum destacado.
- Projeto não tem framework de testes automatizados (confirmado em `frontend/package.json` — sem vitest/jest). Verificação de cada tarefa é `npm run typecheck` (ou `npm run build`) + checagem visual manual no navegador, mesmo padrão já usado no resto do projeto.

---

### Task 1: Rota, item de menu e página stub

**Files:**
- Create: `frontend/src/pages/Compare.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Layout.tsx`

**Interfaces:**
- Produces: `export function Compare()` — componente de página sem props, montado na rota `/comparativo`. Tarefas 2 e 3 substituem o corpo desta função, mas a assinatura/export não muda.

- [ ] **Step 1: Criar a página stub**

Criar `frontend/src/pages/Compare.tsx`:

```tsx
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
```

- [ ] **Step 2: Adicionar a rota em App.tsx**

Em `frontend/src/App.tsx`, adicionar o import:

```tsx
import { Compare } from './pages/Compare';
```

E a rota, dentro do `<Route element={<Layout .../>}>`, logo depois da rota `/fornecedores/:id`:

```tsx
<Route path="/comparativo" element={<Compare />} />
```

- [ ] **Step 3: Adicionar o item de menu em Layout.tsx**

Em `frontend/src/components/Layout.tsx`, no array `navItems`, adicionar uma entrada entre `Fornecedores` e `Grafo de Vínculos`:

```tsx
{ to: '/comparativo', label: 'Comparativo', icon: '⇄' },
```

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: sem erros.

- [ ] **Step 5: Checagem visual manual**

Rodar `npm run dev` (ou usar o container já rodando) e abrir `/comparativo` — deve aparecer o item "Comparativo" na barra lateral, destacado quando ativo, levando pra uma página com o título e o estado "Em construção".

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Compare.tsx frontend/src/App.tsx frontend/src/components/Layout.tsx
git commit -m "feat: rota e navegação do comparativo de fornecedores"
```

---

### Task 2: Seleção de fornecedores sincronizada com a URL

**Files:**
- Modify: `frontend/src/pages/Compare.tsx`

**Interfaces:**
- Consumes: `api.suppliers.list(): Promise<{ suppliers: Supplier[] }>` de `frontend/src/api/client.ts` (já existe). `Supplier` já tem `id: string`, `name: string`.
- Produces: dentro do componente, `selectedIds: string[]` (derivado de `?ids=` da URL) e `suppliers: Supplier[]` (lista completa) — a Task 3 consome os dois pra montar a tabela.

- [ ] **Step 1: Implementar carregamento da lista + estado de seleção via URL**

Substituir o conteúdo de `frontend/src/pages/Compare.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, Supplier } from '../api/client';
import { EmptyState, Panel } from '../components/ui';

const MAX_SLOTS = 4;

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

      {selectedIds.length === 0 && (
        <Panel>
          <EmptyState title="Nenhum fornecedor selecionado" detail="Escolha ao menos um fornecedor acima pra comparar." />
        </Panel>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: sem erros.

- [ ] **Step 3: Checagem visual manual**

Em `/comparativo`: escolher 2 fornecedores nos slots, confirmar que a URL vira `?ids=<id1>,<id2>`, que um terceiro slot vazio aparece automaticamente, que o "×" remove um fornecedor e atualiza a URL, e que dar refresh na página mantém a seleção (lida da URL).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Compare.tsx
git commit -m "feat: seleção de fornecedores no comparativo, sincronizada com a URL"
```

---

### Task 3: Tabela comparativa com gauge de risco e destaque do melhor valor

**Files:**
- Modify: `frontend/src/pages/Compare.tsx`

**Interfaces:**
- Consumes: `RiskGauge` de `frontend/src/components/RiskGauge.tsx` (props `score: number`, `level: 'baixo'|'medio'|'alto'|'critico'`, `size?: number`). `RiskBadge`, `CategoryChip` de `frontend/src/components/ui.tsx`. `selectedIds`/`suppliers` da Task 2.
- Produces: nada consumido por outra tarefa — esta é a última tarefa do plano.

- [ ] **Step 1: Adicionar cálculo dos melhores valores e a tabela comparativa**

No topo de `frontend/src/pages/Compare.tsx`, adicionar os imports que faltam:

```tsx
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { CategoryChip, EmptyState, Panel } from '../components/ui';
import { RiskGauge } from '../components/RiskGauge';
```

(mantendo os imports já existentes de `react-router-dom` e `../api/client`).

Logo abaixo de `const MAX_SLOTS = 4;`, adicionar:

```tsx
const CATEGORY_RANK: Record<string, number> = { A: 3, B: 2, C: 1 };
```

Dentro do componente, depois da declaração de `slots`, adicionar:

```tsx
  const selected = selectedIds
    .map((id) => suppliers.find((s) => s.id === id))
    .filter((s): s is Supplier => !!s);

  const bestId = (getValue: (s: Supplier) => number | null, pickMax: boolean): string | null => {
    const withValue = selected
      .map((s) => ({ id: s.id, value: getValue(s) }))
      .filter((v): v is { id: string; value: number } => v.value != null);
    if (withValue.length < 2) return null;
    const target = pickMax
      ? Math.max(...withValue.map((v) => v.value))
      : Math.min(...withValue.map((v) => v.value));
    const winners = withValue.filter((v) => v.value === target);
    return winners.length === 1 ? winners[0].id : null;
  };

  const bestRiskId = bestId((s) => (s.risk_score != null ? Number(s.risk_score) : null), false);
  const bestEsgId = bestId((s) => (s.esg_score != null ? Number(s.esg_score) : null), true);
  const bestCategoryId = bestId((s) => CATEGORY_RANK[s.category] ?? null, true);
```

Substituir o bloco final do JSX (a partir de `{selectedIds.length === 0 && (`) por:

```tsx
      {selected.length === 0 ? (
        <Panel>
          <EmptyState title="Nenhum fornecedor selecionado" detail="Escolha ao menos um fornecedor acima pra comparar." />
        </Panel>
      ) : (
        <Panel title="Comparativo">
          <div style={{ display: 'flex', gap: 24, marginBottom: 20, overflowX: 'auto' }}>
            {selected.map((s) => (
              <div key={s.id} style={{ minWidth: 180, flex: 1, textAlign: 'center' }}>
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
```

No fim do arquivo (fora da função `Compare`), adicionar o componente auxiliar da tabela:

```tsx
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
```

Remover a variável `bestRiskId` do JSX explícito se não usada diretamente numa célula de tabela (o risco já é mostrado pelo `RiskGauge` — usar `bestRiskId` pra dar um contorno de destaque no gauge do vencedor):

No bloco que renderiza os gauges, envolver o `RiskGauge` do vencedor com destaque visual — ajustar o `div` de cada coluna:

```tsx
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
```

(substitui o `<div key={s.id} style={{ minWidth: 180, flex: 1, textAlign: 'center' }}>` do Step 1 acima por este).

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: sem erros.

- [ ] **Step 3: Build**

Run: `cd frontend && npm run build`
Expected: build limpo, sem warnings novos além do aviso pré-existente de chunk size.

- [ ] **Step 4: Checagem visual manual**

Selecionar 3-4 fornecedores com scores bem diferentes (ex.: um categoria A/risco baixo e um categoria C/risco alto). Confirmar:
- Gauge de risco aparece por coluna, com o de menor risco destacado com borda.
- Linha ESG destaca em amarelo o maior score.
- Linha Categoria destaca a melhor categoria (A antes de B antes de C).
- Segmento/Status aparecem sem destaque, capitalizados.
- Com 1 fornecedor só selecionado, nada fica destacado (precisa de 2+ pra comparar).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Compare.tsx
git commit -m "feat: tabela comparativa com gauge de risco e destaque do melhor valor"
```

---

## Self-Review

- **Cobertura do spec:** rota+menu (Task 1), seleção com até 4 slots + URL (Task 2), tabela com Risco/ESG/Categoria/Segmento/Status + gauge + destaque automático + estados vazio/1-selecionado (Task 3). Sem mudança de backend em nenhuma tarefa — confirmado, todas usam `api.suppliers.list()` existente.
- **Placeholders:** nenhum "TBD"/"implementar depois" — todo código é completo e colável.
- **Consistência de tipos:** `Supplier` (de `api/client.ts`) usado com os mesmos campos (`id`, `name`, `category`, `segment`, `status`, `risk_score`, `risk_level`, `esg_score`) nas três tarefas. `RiskGauge` usado com a assinatura existente (`score`, `level`, `size`). `ComparisonRow` definida e consumida só dentro da Task 3, sem uso externo.
