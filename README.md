# Sentinela

**Homologação Inteligente de Fornecedores — IA como motor da Fase 2**
PESA Paraná Equipamentos S.A. · Caterpillar Brasil

Sentinela é a implementação de referência das 6 frentes de IA descritas na
apresentação da Fase 2: IA Preditiva de Risco, Automação Generativa,
Analytics Avançado, ESG Preditivo, Grafo de Relacionamento e Inteligência
de Precificação — rodando como uma arquitetura orientada a eventos de
verdade, não como um mockup.

> **Sobre os "modelos de IA":** cada motor (`backend/src/services/*Engine.ts`)
> é implementado como um algoritmo determinístico e explicável (scoring por
> features ponderadas, projeção de trajetória, template-based generation).
> Isso é proposital: dá um sistema 100% funcional e auditável sem precisar
> de um dataset de treino. Cada motor tem uma interface pública estável —
> é o ponto exato onde se pluga um modelo real (LSTM/Random Forest para
> risco, um LLM via API para geração de documentos, etc.) sem tocar no
> resto do sistema.

## Arquitetura

```
                    ┌─────────────┐
                    │   Frontend   │  React + Vite, servido por Nginx
                    │  (porta 8080)│  proxy /api -> backend, SSE sem buffer
                    └──────┬───────┘
                           │ REST + SSE
                    ┌──────▼───────┐
                    │   Backend    │  Express + TypeScript
   ┌───────────────►│  API (4000)  │◄───────────────┐
   │                └──────┬───────┘                 │
   │                       │ publica evento           │ lê / grava
   │                       ▼                          │
   │                ┌──────────────┐                  │
   │                │ Kafka/Redpanda│                 │
   │                │ (tópicos por  │                 │
   │                │  domínio)     │                 │
   │                └──────┬───────┘                  │
   │                       │ consome                  │
   │                ┌──────▼───────┐                  │
   │                │    Worker     │──────────────────┘
   │                │ (risco, ESG,  │  Postgres (fonte da verdade)
   │                │  grafo)       │
   │                └──────┬───────┘
   │                       │ cacheia score + publica alerta
   │                ┌──────▼───────┐
   └────────────────┤    Redis     │  cache-aside + pub/sub de alertas
        SSE em tempo real (canal sentinela:alerts)
```

**Fluxo de um fornecedor novo:** `POST /api/suppliers` grava no Postgres e
publica em `sentinela.supplier.events` → o **worker** consome, roda os
motores de risco e ESG, varre o grafo de sócios contra a base de sanções,
grava tudo no Postgres, cacheia no Redis e — se algo cruzar um limiar —
grava um alerta e publica no canal Redis `sentinela:alerts` → a API expõe
isso via **Server-Sent Events** (`/api/alerts/stream`) → o frontend atualiza
a tela sem polling.

## Subindo o projeto

Pré-requisitos: Docker e Docker Compose.

```bash
# 1. Build + sobe tudo (postgres, redis, kafka, api, worker, frontend)
docker compose up --build -d

# 2. Popula o banco com 18 fornecedores de demonstração
#    (inclui o cenário do slide: sócio comum sancionado entre dois fornecedores)
docker compose --profile seed run --rm seed

# 3. Acesse
#    Frontend:  http://localhost:8080
#    API:       http://localhost:4000/health
```

O worker processa os eventos do seed em alguns segundos — atualize o
dashboard e os scores de risco/ESG já devem aparecer preenchidos.

Para acompanhar os logs do pipeline em ação:
```bash
docker compose logs -f worker
```

Para parar tudo (mantendo os dados):
```bash
docker compose down
```

Para resetar tudo (apaga o volume do Postgres):
```bash
docker compose down -v
```

## Desenvolvimento local (sem Docker)

Precisa de Postgres, Redis e um broker Kafka rodando localmente (ou use
`docker compose up postgres redis redpanda -d` e rode o resto direto no host).

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run dev            # API com hot-reload
npm run dev:worker      # em outro terminal

# Seed (uma vez, com API/worker no ar)
npm run build && npm run start:seed

# Frontend
cd ../frontend
npm install
npm run dev             # http://localhost:5173, proxy para localhost:4000
```

## Estrutura do projeto

```
sentinela/
├── db/init.sql                  # schema Postgres completo
├── backend/
│   ├── src/
│   │   ├── index.ts             # servidor Express (API)
│   │   ├── worker.ts            # consumidor Kafka (orquestra os motores)
│   │   ├── seed.ts              # dados de demonstração
│   │   ├── lib/                 # clientes: db, redis, kafka
│   │   ├── services/            # os 6 motores de IA (risk/esg/graph/doc/pricing)
│   │   └── routes/               # endpoints REST por domínio
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/                # Dashboard, Fornecedores, Grafo, Precificação, Alertas
│   │   ├── components/            # RiskGauge (elemento de assinatura), Layout, UI base
│   │   └── hooks/useAlertStream.ts
│   ├── nginx.conf                # proxy /api + SSE sem buffering
│   └── Dockerfile
└── docker-compose.yml
```

## Módulos de IA implementados

| Frente (do slide original) | Onde vive | Endpoint principal |
|---|---|---|
| IA Preditiva de Risco | `services/riskEngine.ts` | `GET /api/risk/:supplierId` |
| Automação Generativa | `services/docGenerator.ts` | `POST /api/documents/:supplierId/generate` |
| Analytics Avançado & BI | `routes/analytics.ts` | `GET /api/analytics/kpis` |
| ESG Preditivo | `services/esgEngine.ts` | `GET /api/esg/:supplierId` |
| Grafo de Relacionamento | `services/graphEngine.ts` | `GET /api/graph` |
| Inteligência de Precificação | `services/pricingEngine.ts` | `POST /api/pricing/quotes` |

## Próximos passos reais de produção

- Trocar os motores heurísticos por modelos treinados (o contrato de
  cada função em `services/` já isola essa troca).
  `docGenerator.ts` já está desenhado para virar uma chamada de LLM real.
- Adicionar autenticação (hoje a API é aberta — ok para demo, não para produção).
- Métricas/observabilidade (OpenTelemetry) nos consumidores Kafka.
- Testes automatizados (o scaffold prioriza arquitetura funcional ponta-a-ponta).
