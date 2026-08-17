const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Erro ${res.status} ao chamar ${path}`);
  }
  return res.json() as Promise<T>;
}

// ----- Tipos -----
export interface Supplier {
  id: string;
  name: string;
  document_id: string;
  category: 'A' | 'B' | 'C';
  segment: string;
  status: string;
  onboarded_at: string;
  risk_score?: number | null;
  risk_level?: 'baixo' | 'medio' | 'alto' | 'critico' | null;
  esg_score?: number | null;
}

export interface RiskDriver { factor: string; contribution: number; detail: string }
export interface RiskScore {
  id: string;
  supplier_id: string;
  score: number;
  risk_level: 'baixo' | 'medio' | 'alto' | 'critico';
  horizon_days: number;
  drivers: RiskDriver[];
  recommendation: string;
  computed_at: string;
}

export interface EsgHistoryPoint { score: number; category: string; reference_month: string }
export interface EsgProjectionPoint { month: number; score: number }

export interface GraphNode { id: string; name: string; riskLevel: string; category: string }
export interface GraphEdge { source: string; target: string; relationType: string; riskFlag: 'info' | 'atencao' | 'critico'; detail: string }

export interface Alert {
  id: string;
  supplier_id: string | null;
  supplier_name?: string | null;
  source: string;
  severity: 'info' | 'atencao' | 'critico';
  title: string;
  message: string;
  acknowledged: boolean;
  created_at: string;
}

export interface DashboardKpis {
  totalSuppliers: number;
  conformityRatePct: number;
  riskDistribution: { risk_level: string; total: number }[];
  categoryDistribution: { category: string; total: number }[];
  riskValueBlocked: number;
}

// ----- Endpoints -----
export const api = {
  suppliers: {
    list: (params?: { search?: string; category?: string; status?: string }) => {
      // URLSearchParams stringifica valores `undefined` como o texto literal
      // "undefined" em vez de omitir a chave — sem este filtro, toda carga
      // inicial (sem busca/categoria ativas) mandava search=undefined ao
      // backend, que tratava como filtro real e devolvia a lista sempre vazia.
      const entries = Object.entries(params ?? {}).filter(
        (entry): entry is [string, string] => entry[1] != null && entry[1] !== '',
      );
      const qs = new URLSearchParams(entries).toString();
      return request<{ suppliers: Supplier[] }>(`/suppliers${qs ? `?${qs}` : ''}`);
    },
    detail: (id: string) =>
      request<{ supplier: any; riskHistory: RiskScore[]; esgHistory: EsgHistoryPoint[]; documents: any[]; quotes: any[] }>(
        `/suppliers/${id}`,
      ),
    create: (payload: Record<string, unknown>) =>
      request<{ supplier: Supplier }>(`/suppliers`, { method: 'POST', body: JSON.stringify(payload) }),
    refresh: (id: string) => request<{ status: string }>(`/suppliers/${id}/refresh`, { method: 'POST' }),
  },
  risk: {
    ranking: () => request<{ ranking: (Supplier & RiskScore)[] }>(`/risk`),
    current: (supplierId: string) => request<RiskScore & { cached: boolean }>(`/risk/${supplierId}`),
  },
  esg: {
    forSupplier: (supplierId: string) =>
      request<{ history: EsgHistoryPoint[]; projection: EsgProjectionPoint[]; currentCategory: string }>(
        `/esg/${supplierId}`,
      ),
    breakdown: () => request<{ breakdown: { supplier_category: string; total: number; avg_esg_score: number }[] }>(`/esg`),
  },
  graph: {
    full: () => request<{ nodes: GraphNode[]; edges: GraphEdge[]; cached: boolean }>(`/graph`),
  },
  documents: {
    generate: (supplierId: string, docType: string) =>
      request<{ document: any; content: string }>(`/documents/${supplierId}/generate`, {
        method: 'POST',
        body: JSON.stringify({ docType }),
      }),
  },
  pricing: {
    benchmarks: () => request<{ benchmarks: any[] }>(`/pricing/benchmarks`),
    evaluateQuote: (payload: { supplierId: string; itemCategory: string; quotedPrice: number }) =>
      request<{ evaluation: any }>(`/pricing/quotes`, { method: 'POST', body: JSON.stringify(payload) }),
    updateBenchmark: (id: string, payload: { marketAvg: number; marketP25: number; marketP75: number; unit: string }) =>
      request<{ benchmark: any }>(`/pricing/benchmarks/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  },
  analytics: {
    kpis: () => request<DashboardKpis & { cached: boolean }>(`/analytics/kpis`),
  },
  alerts: {
    list: (limit = 50) => request<{ alerts: Alert[] }>(`/alerts?limit=${limit}`),
    ack: (id: string) => request<{ alert: Alert }>(`/alerts/${id}/ack`, { method: 'PATCH' }),
  },
};
