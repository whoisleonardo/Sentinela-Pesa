-- ============================================================
-- Sentinela — Schema inicial
-- Homologação Inteligente de Fornecedores (PESA / Caterpillar)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- Fornecedores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  document_id     TEXT NOT NULL UNIQUE, -- CNPJ
  category        TEXT NOT NULL DEFAULT 'C' CHECK (category IN ('A','B','C')),
  segment         TEXT NOT NULL DEFAULT 'não_produtivo',
  status          TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','em_revisao','bloqueado','inativo')),
  onboarded_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- sinais brutos usados pelos motores de score (simulam os "dados de entrada" do modelo)
  payment_delay_days_avg   NUMERIC NOT NULL DEFAULT 0,
  fiscal_events_90d        INTEGER NOT NULL DEFAULT 0,
  ownership_changes_180d   INTEGER NOT NULL DEFAULT 0,
  market_signal_score      NUMERIC NOT NULL DEFAULT 50, -- 0-100, quanto maior pior
  esg_emissions_index      NUMERIC NOT NULL DEFAULT 50,
  esg_waste_index          NUMERIC NOT NULL DEFAULT 50,
  esg_turnover_rate        NUMERIC NOT NULL DEFAULT 15,
  esg_env_fines_12m        INTEGER NOT NULL DEFAULT 0,
  credit_rating_score      NUMERIC NOT NULL DEFAULT 70, -- 0-100, quanto maior melhor
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Histórico de Score de Risco (IA Preditiva de Risco)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS risk_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id     UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  score           NUMERIC NOT NULL,          -- 0-100 (probabilidade de deterioração em 90d)
  risk_level      TEXT NOT NULL CHECK (risk_level IN ('baixo','medio','alto','critico')),
  horizon_days    INTEGER NOT NULL DEFAULT 90,
  drivers         JSONB NOT NULL DEFAULT '[]', -- principais fatores que explicam o score
  recommendation  TEXT,
  model_version   TEXT NOT NULL DEFAULT 'sentinela-risk-v1',
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_risk_scores_supplier ON risk_scores(supplier_id, computed_at DESC);

-- ------------------------------------------------------------
-- Histórico e Projeção de Score ESG (ESG Preditivo)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS esg_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id     UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  score           NUMERIC NOT NULL,          -- 0-100
  category        TEXT NOT NULL CHECK (category IN ('A','B','C')),
  projected       BOOLEAN NOT NULL DEFAULT false,
  reference_month DATE NOT NULL,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, reference_month, projected)
);
CREATE INDEX IF NOT EXISTS idx_esg_scores_supplier ON esg_scores(supplier_id, reference_month);

-- ------------------------------------------------------------
-- Grafo de Relacionamento entre Fornecedores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supplier_relationships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_a_id   UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_b_id   UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  relation_type   TEXT NOT NULL DEFAULT 'socio_comum', -- socio_comum | mesmo_endereco | mesmo_representante
  detail          TEXT,
  risk_flag       TEXT CHECK (risk_flag IN ('info','atencao','critico')) DEFAULT 'info',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (supplier_a_id <> supplier_b_id)
);

-- Sanções / entidades externas usadas na detecção de vínculos críticos (ex.: CEIS)
CREATE TABLE IF NOT EXISTS sanctioned_entities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_name     TEXT NOT NULL,
  document_id     TEXT,
  sanction_type   TEXT NOT NULL,
  source          TEXT NOT NULL DEFAULT 'CEIS',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_shared_parties (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id       UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  party_name        TEXT NOT NULL,
  party_document_id TEXT,
  role              TEXT NOT NULL DEFAULT 'socio'
);

-- ------------------------------------------------------------
-- Documentos gerados (Automação Generativa)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS generated_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id     UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  doc_type        TEXT NOT NULL CHECK (doc_type IN ('minuta_contrato','checklist_auditoria','comunicado_compliance')),
  content         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'gerado' CHECK (status IN ('gerado','em_revisao','aprovado')),
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Inteligência de Precificação
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pricing_benchmarks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_category   TEXT NOT NULL,
  market_avg      NUMERIC NOT NULL,
  market_p25      NUMERIC NOT NULL,
  market_p75      NUMERIC NOT NULL,
  unit            TEXT NOT NULL DEFAULT 'R$/un',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id     UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  item_category   TEXT NOT NULL,
  quoted_price    NUMERIC NOT NULL,
  quoted_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Alertas (consumidos pelo worker, exibidos em tempo real no frontend)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id     UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  source          TEXT NOT NULL, -- risk_engine | esg_engine | graph_engine | pricing_engine
  severity        TEXT NOT NULL CHECK (severity IN ('info','atencao','critico')),
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  acknowledged    BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC);

-- ------------------------------------------------------------
-- Eventos de auditoria (todo evento processado via Kafka é logado aqui)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic           TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
