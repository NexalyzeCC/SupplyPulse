export interface Supplier {
  id: string;
  user_id: string;
  name: string;
  country: string | null;
  category: string | null;
  criticality: "low" | "medium" | "high" | "critical";
  alert_threshold: number;
  slack_webhook: string | null;
  created_at: string;
}

export interface SupplierScore {
  id: string;
  supplier_id: string;
  score: number;
  direction: "improving" | "stable" | "deteriorating";
  summary: string | null;
  recommendations: Recommendation[] | null;
  created_at: string;
}

export interface Signal {
  id: string;
  supplier_id: string;
  score_id: string;
  type: "news" | "legal" | "financial" | "leadership" | "operational";
  severity: "low" | "medium" | "high" | "critical";
  summary: string;
  source_url: string | null;
  source_title: string | null;
  signal_date: string | null;
  confidence: number;
  created_at: string;
}

export interface Recommendation {
  priority: number;
  action: string;
  rationale: string;
}

export interface AlertLogEntry {
  id: string;
  supplier_id: string;
  score_id: string;
  channel: "email" | "slack";
  sent_at: string;
  supplier?: Supplier;
  score?: SupplierScore;
}
