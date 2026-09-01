# Comparativo entre fornecedores — design

## Objetivo

Nova tela que deixa comparar até 4 fornecedores lado a lado pelos indicadores
essenciais (risco, ESG, categoria, segmento, status), respondendo à pergunta
"quem está melhor?" sem precisar abrir a ficha de cada um separadamente.

## Escopo

- Rota nova `/comparativo`, item novo no menu lateral.
- Seleção via até 4 `<select>` de fornecedor ("slots"), com botão "+
  adicionar fornecedor" até o limite e "×" pra remover cada slot.
- Seleção sincronizada com a URL (`?ids=id1,id2,id3`) via
  `useSearchParams` — compartilhável, sobrevive a refresh.
- Tabela comparativa: colunas = fornecedores, linhas = Risco, ESG,
  Categoria, Segmento, Status.
- `RiskGauge` compacto no topo de cada coluna.
- Destaque automático (cor de acento) do melhor valor entre os
  selecionados em Risco (menor score), ESG (maior score) e Categoria
  (A > B > C). Segmento e Status ficam neutros (sem ordem natural).
- **Sem mudança de backend**: `GET /api/suppliers` já devolve todos os
  campos necessários (risk_score, risk_level, esg_score, category,
  segment, status) — a tela reaproveita `api.suppliers.list()`, já usado
  em Fornecedores e Precificação, e filtra pelos IDs selecionados no
  cliente.

## Fora de escopo

- Sinais brutos (atraso de pagamento, eventos fiscais etc.) e drivers de
  risco — não pedidos, ficam de fora por ora.
- Mais de 4 fornecedores simultâneos.
- Persistência da seleção além da URL (ex.: comparativos salvos).

## Componentes afetados

- **Novo**: `frontend/src/pages/Compare.tsx` — página principal.
- `frontend/src/App.tsx` — nova rota.
- `frontend/src/components/Layout.tsx` — novo item de menu.
- Reaproveita `api.suppliers.list()`, `RiskGauge`, `RiskBadge`,
  `CategoryChip`, `Panel`, `EmptyState` já existentes — nenhum
  componente de UI genérico precisa mudar.

## Estados

- **Vazio** (`ids` ausente ou vazio): `EmptyState` convidando a
  adicionar o primeiro fornecedor.
- **1 selecionado**: tabela com uma coluna só, sem destaque (não há o
  que comparar) — funciona, mas sem "melhor valor" já que precisa de
  2+.
- **2–4 selecionados**: tabela completa com destaque automático.
- **Erro ao carregar lista de fornecedores**: mesmo padrão de erro já
  usado nas outras páginas (`EmptyState` com detalhe do erro).

## Ordem de "melhor valor" por métrica

- Risco: menor `risk_score` vence (ausência de score não entra na
  comparação de destaque).
- ESG: maior `esg_score` vence.
- Categoria: A > B > C.
- Empate: nenhum dos empatados é destacado (evita destaque enganoso).
