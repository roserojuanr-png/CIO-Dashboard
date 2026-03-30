export type Platform = "HCPRO" | "Orchestrate" | "Engage";

export type MetricKey =
  | "availability_percent"
  | "sms_transactions"
  | "voice_transactions"
  | "critical_open_vulnerabilities"
  | "cloud_total_cost";

export interface DashboardRecord {
  date: string;
  platform: Platform;
  availability_percent: number | null;
  sms_transactions: number | null;
  voice_transactions: number | null;
  critical_open_vulnerabilities: number | null;
  cloud_total_cost: number | null;
  source?: string;
}

export interface UploadIssue {
  fileName: string;
  level: "error" | "warning";
  message: string;
}

export interface FilterState {
  startMonth: string;
  endMonth: string;
  platforms: Platform[];
  metrics: MetricKey[];
  highlightedPlatform: Platform | null;
}

export interface ImplementationFilterState {
  startDate: string;
  endDate: string;
  businessUnit: string;
  owner: string;
  statuses: string[];
}

export interface ProductFilterState {
  startDate: string;
  endDate: string;
  businessUnit: string;
  owner: string;
  statuses: string[];
  category: string;
}

export interface KPIStat {
  label: string;
  value: string;
  delta?: string;
  deltaDirection?: "up" | "down" | "neutral";
  accent?: string;
}

export interface ImplementationRecord {
  implementation_id: string;
  client_name: string;
  account_name: string;
  product_name: string;
  pod: string;
  owner: string;
  opportunity_owner: string;
  status: string;
  risk_level: string;
  risk_reason: string;
  sold_quarter: string;
  revenue: number | null;
  cumulative_revenue: number | null;
  closed_date: string;
  contract_signed_date: string;
  planned_go_live_date: string;
  actual_go_live_date: string;
  revenue_start_date: string;
  not_live_reason: string;
  customer_scope_sign_off: string;
  source?: string;
  sourceSheet?: string;
}

export interface ParseResult {
  records: DashboardRecord[];
  implementationRecords: ImplementationRecord[];
  productRecords: ProductRecord[];
  issues: UploadIssue[];
  sources: string[];
}

export interface ProductRecord {
  product_id: string;
  product_name: string;
  business_unit: string;
  status: string;
  date: string;
  status_color: string;
  source?: string;
  sourceSheet?: string;
}
