import Papa from "papaparse";
import * as XLSX from "xlsx";
import type {
  DashboardRecord,
  ImplementationRecord,
  MetricKey,
  ParseResult,
  Platform,
  ProductRecord,
  UploadIssue,
} from "@/types";
import { aggregateMonthly, clampPlatform, getMonthKey } from "@/utils/dashboardData";

type RawRow = Record<string, string | number | null | undefined>;

const FIELD_ALIASES: Record<string, string[]> = {
  date: ["date", "month", "period", "month_date", "month_start"],
  platform: ["platform", "product", "service", "application", "app"],
  availability_percent: ["availability_percent", "availability", "uptime", "uptime_percent", "availability_pct"],
  sms_transactions: ["sms_transactions", "sms", "sms_volume", "sms_volumes", "sms_count", "sms_total"],
  voice_transactions: ["voice_transactions", "voice", "voice_volumes", "voice_volume", "voice_count", "voice_total"],
  critical_open_vulnerabilities: [
    "critical_open_vulnerabilities",
    "critical_vulnerabilities",
    "critical_open_vulns",
    "open_critical_vulnerabilities",
    "critical_open_vulnerability_count",
  ],
  cloud_total_cost: [
    "cloud_total_cost",
    "cloud_cost",
    "cost",
    "monthly_cost",
    "cloud_spend",
    "cloud_month_cost",
  ],
  metric_type: ["metric_type", "metric", "kpi", "measure"],
  value: ["value", "amount", "metric_value"],
};

const IMPLEMENTATION_FIELDS = [
  "implementation_id",
  "client_name",
  "account_name",
  "product_name",
  "pod",
  "owner",
  "opportunity_owner",
  "status",
  "risk_level",
  "risk_reason",
  "sold_quarter",
  "revenue",
  "closed_date",
  "contract_signed_date",
  "planned_go_live_date",
  "actual_go_live_date",
  "revenue_start_date",
  "not_live_reason",
  "customer_scope_sign_off",
] as const;

const IMPLEMENTATION_FIELD_ALIASES: Record<(typeof IMPLEMENTATION_FIELDS)[number], string[]> = {
  implementation_id: ["implementation_id", "implementationid", "id", "project_id", "opportunity_id"],
  client_name: ["client_name", "client", "customer_name", "customer", "account_name"],
  account_name: ["account_name", "account", "customer_name", "customer", "client_name"],
  product_name: ["product_name", "product", "product_family", "solution"],
  pod: ["pod"],
  owner: ["owner", "opportunity_owner", "implementation_owner", "project_owner"],
  opportunity_owner: ["opportunity_owner", "owner", "implementation_owner", "project_owner"],
  status: ["status"],
  risk_level: ["risk_level", "risk", "risk_status"],
  risk_reason: ["risk_reason", "issue_reason", "risk_notes"],
  sold_quarter: ["sold_quarter", "quarter", "sold_qtr"],
  revenue: ["revenue", "arr", "value", "booking_value"],
  closed_date: ["closed_date", "closed", "close_date"],
  contract_signed_date: ["contract_signed_date", "contract_date", "signed_date"],
  planned_go_live_date: ["planned_go_live_date", "planned_golive_date", "planned_golive", "planned_go_live", "go_live_date"],
  actual_go_live_date: ["actual_go_live_date", "actual_golive_date", "actual_golive", "actual_go_live", "live_date"],
  revenue_start_date: ["revenue_start_date", "revenue_date"],
  not_live_reason: ["not_live_reason", "reason_not_live"],
  customer_scope_sign_off: ["customer_scope_sign_off", "scope_sign_off", "customer_sign_off", "customer_scope_signoff"],
};

const PRODUCT_FIELDS = [
  "product_id",
  "product_name",
  "business_unit",
  "status",
  "date",
  "status_color",
] as const;

const PRODUCT_FIELD_ALIASES: Record<(typeof PRODUCT_FIELDS)[number], string[]> = {
  product_id: ["product_id", "service_id", "id"],
  product_name: ["product_name", "service", "product", "service_name"],
  business_unit: ["business_unit", "platform", "product_family"],
  status: ["status"],
  date: ["date", "ga_date", "go_live_date"],
  status_color: ["status_color", "color", "status_colour"],
};

const METRIC_TYPE_ALIASES: Record<string, MetricKey> = {
  availability: "availability_percent",
  availabilitypercent: "availability_percent",
  availability_percent: "availability_percent",
  uptime: "availability_percent",
  sms: "sms_transactions",
  smstransactions: "sms_transactions",
  sms_transactions: "sms_transactions",
  voice: "voice_transactions",
  voicetransactions: "voice_transactions",
  voice_transactions: "voice_transactions",
  criticalopenvulnerabilities: "critical_open_vulnerabilities",
  critical_open_vulnerabilities: "critical_open_vulnerabilities",
  criticalvulnerabilities: "critical_open_vulnerabilities",
  cloudtotalcost: "cloud_total_cost",
  cloud_total_cost: "cloud_total_cost",
  cloudcost: "cloud_total_cost",
  cost: "cloud_total_cost",
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function findField(row: RawRow, target: keyof typeof FIELD_ALIASES): string | undefined {
  const keys = Object.keys(row);
  return keys.find((key) => FIELD_ALIASES[target].includes(normalizeKey(key)));
}

function findImplementationField(row: RawRow, target: (typeof IMPLEMENTATION_FIELDS)[number]): string | undefined {
  const keys = Object.keys(row);
  return keys.find((key) => IMPLEMENTATION_FIELD_ALIASES[target].includes(normalizeKey(key)));
}

function findProductField(row: RawRow, target: (typeof PRODUCT_FIELDS)[number]): string | undefined {
  const keys = Object.keys(row);
  return keys.find((key) => PRODUCT_FIELD_ALIASES[target].includes(normalizeKey(key)));
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(String(value).replace(/[$,%\s,]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDateText(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value === "number" && Number.isFinite(value) && value > 20000) {
    return XLSX.SSF.format("yyyy-mm-dd", value);
  }

  const raw = String(value).trim();
  if (/^\d{5,}$/.test(raw)) {
    const serial = Number(raw);
    if (Number.isFinite(serial) && serial > 20000) {
      return XLSX.SSF.format("yyyy-mm-dd", serial);
    }
  }

  const shortSlashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (shortSlashMatch) {
    const [, monthText, dayText, yearText] = shortSlashMatch;
    const month = Number(monthText);
    const day = Number(dayText);
    const year = yearText.length === 2 ? 2000 + Number(yearText) : Number(yearText);
    const parsed = new Date(year, month - 1, day);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  const month = getMonthKey(raw);
  if (month) {
    return month;
  }

  return raw;
}

function emptyRecord(date: string, platform: Platform, source: string): DashboardRecord {
  return {
    date,
    platform,
    availability_percent: null,
    sms_transactions: null,
    voice_transactions: null,
    critical_open_vulnerabilities: null,
    cloud_total_cost: null,
    source,
  };
}

function parseUnifiedRow(row: RawRow, source: string): DashboardRecord | null {
  const dateField = findField(row, "date");
  const platformField = findField(row, "platform");
  if (!dateField || !platformField) {
    return null;
  }

  const month = getMonthKey(String(row[dateField]));
  const platform = clampPlatform(String(row[platformField]));
  if (!month || !platform) {
    return null;
  }

  const record = emptyRecord(month, platform, source);

  ([
    "availability_percent",
    "sms_transactions",
    "voice_transactions",
    "critical_open_vulnerabilities",
    "cloud_total_cost",
  ] as MetricKey[]).forEach((metric) => {
    const field = findField(row, metric);
    if (field) {
      record[metric] = parseNumber(row[field]);
    }
  });

  return record;
}

function parseMetricRow(row: RawRow, source: string): DashboardRecord | null {
  const dateField = findField(row, "date");
  const platformField = findField(row, "platform");
  const metricField = findField(row, "metric_type");
  const valueField = findField(row, "value");

  if (!dateField || !platformField || !metricField || !valueField) {
    return null;
  }

  const month = getMonthKey(String(row[dateField]));
  const platform = clampPlatform(String(row[platformField]));
  if (!month || !platform) {
    return null;
  }

  const rawMetric = String(row[metricField]).trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  const metric = METRIC_TYPE_ALIASES[rawMetric];
  if (!metric) {
    return null;
  }

  const record = emptyRecord(month, platform, source);
  record[metric] = parseNumber(row[valueField]);
  return record;
}

function parseImplementationRow(row: RawRow, source: string, sourceSheet: string): ImplementationRecord | null {
  const mapped: Record<string, string> = {};
  let hasAnyValue = false;

  for (const field of IMPLEMENTATION_FIELDS) {
    const key = findImplementationField(row, field);
    const raw = key ? row[key] : "";
    const value =
      field.includes("_date") || field === "customer_scope_sign_off"
        ? normalizeDateText(raw)
        : String(raw ?? "").trim();
    mapped[field] = value;
    if (value) {
      hasAnyValue = true;
    }
  }

  if (!hasAnyValue || !mapped.implementation_id) {
    return null;
  }

  return {
    implementation_id: mapped.implementation_id,
    client_name: mapped.client_name || mapped.account_name,
    account_name: mapped.account_name || mapped.client_name,
    product_name: mapped.product_name,
    pod: mapped.pod,
    owner: mapped.owner || mapped.opportunity_owner,
    opportunity_owner: mapped.opportunity_owner || mapped.owner,
    status: mapped.status,
    risk_level: mapped.risk_level,
    risk_reason: mapped.risk_reason,
    sold_quarter: mapped.sold_quarter,
    revenue: parseNumber(mapped.revenue),
    closed_date: mapped.closed_date,
    contract_signed_date: mapped.contract_signed_date,
    planned_go_live_date: mapped.planned_go_live_date,
    actual_go_live_date: mapped.actual_go_live_date,
    revenue_start_date: mapped.revenue_start_date,
    not_live_reason: mapped.not_live_reason,
    customer_scope_sign_off: mapped.customer_scope_sign_off,
    source,
    sourceSheet,
  };
}

function parseProductRow(row: RawRow, source: string, sourceSheet: string): ProductRecord | null {
  const mapped: Record<string, string> = {};
  let hasAnyValue = false;

  for (const field of PRODUCT_FIELDS) {
    const key = findProductField(row, field);
    const raw = key ? row[key] : "";
    const value = field === "date" ? normalizeDateText(raw) : String(raw ?? "").trim();
    mapped[field] = value;
    if (value) {
      hasAnyValue = true;
    }
  }

  if (!hasAnyValue || !mapped.product_name) {
    return null;
  }

  return {
    product_id: mapped.product_id || `${mapped.business_unit}-${mapped.product_name}`,
    product_name: mapped.product_name,
    business_unit: mapped.business_unit,
    status: mapped.status,
    date: mapped.date,
    status_color: mapped.status_color,
    source,
    sourceSheet,
  };
}

function isImplementationSheet(rows: RawRow[]): boolean {
  if (!rows.length) {
    return false;
  }

  const matchCount = IMPLEMENTATION_FIELDS.filter((field) => findImplementationField(rows[0], field)).length;
  return matchCount >= 4;
}

function isProductSheet(rows: RawRow[]): boolean {
  if (!rows.length) {
    return false;
  }

  const matchCount = PRODUCT_FIELDS.filter((field) => findProductField(rows[0], field)).length;
  return matchCount >= 4;
}

function parseRows(rows: RawRow[], source: string, sourceSheet = "Sheet1"): ParseResult {
  const issues: UploadIssue[] = [];
  if (!rows.length) {
    issues.push({ fileName: source, level: "warning", message: `${sourceSheet}: no data rows found.` });
    return { records: [], implementationRecords: [], productRecords: [], issues, sources: [source] };
  }

  if (isImplementationSheet(rows)) {
    const implementationRecords = rows
      .map((row) => parseImplementationRow(row, source, sourceSheet))
      .filter((record): record is ImplementationRecord => Boolean(record));

    const malformedRows = rows.length - implementationRecords.length;
    if (malformedRows > 0) {
      issues.push({
        fileName: source,
        level: "warning",
        message: `${sourceSheet}: ${malformedRows} implementation row(s) were skipped due to missing implementation_id or empty content.`,
      });
    }

    return { records: [], implementationRecords, productRecords: [], issues, sources: [source] };
  }

  if (isProductSheet(rows)) {
    const productRecords = rows
      .map((row) => parseProductRow(row, source, sourceSheet))
      .filter((record): record is ProductRecord => Boolean(record));

    const malformedRows = rows.length - productRecords.length;
    if (malformedRows > 0) {
      issues.push({
        fileName: source,
        level: "warning",
        message: `${sourceSheet}: ${malformedRows} product row(s) were skipped due to missing product_name or empty content.`,
      });
    }

    return { records: [], implementationRecords: [], productRecords, issues, sources: [source] };
  }

  const firstRow = rows[0];
  const isMetricSpecific = Boolean(findField(firstRow, "metric_type") && findField(firstRow, "value"));
  const missingFields = isMetricSpecific
    ? ["date", "platform", "metric_type", "value"].filter((field) => !findField(firstRow, field as keyof typeof FIELD_ALIASES))
    : ["date", "platform"].filter((field) => !findField(firstRow, field as keyof typeof FIELD_ALIASES));

  if (missingFields.length) {
    issues.push({
      fileName: source,
      level: "error",
      message: `${sourceSheet}: missing required column(s): ${missingFields.join(", ")}.`,
    });
    return { records: [], implementationRecords: [], productRecords: [], issues, sources: [source] };
  }

  const records = rows
    .map((row) => (isMetricSpecific ? parseMetricRow(row, source) : parseUnifiedRow(row, source)))
    .filter((record): record is DashboardRecord => Boolean(record));

  const malformedRows = rows.length - records.length;
  if (malformedRows > 0) {
    issues.push({
      fileName: source,
      level: "warning",
      message: `${sourceSheet}: ${malformedRows} row(s) were skipped due to missing date, platform, or metric values.`,
    });
  }

  return { records, implementationRecords: [], productRecords: [], issues, sources: [source] };
}

function parseCsvText(text: string): RawRow[] {
  const result = Papa.parse<RawRow>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (header) => normalizeKey(header),
  });

  return result.data;
}

async function parseCsvFile(file: File): Promise<ParseResult> {
  const text = await file.text();
  if (!text.trim()) {
    return {
      records: [],
      implementationRecords: [],
      productRecords: [],
      issues: [{ fileName: file.name, level: "warning", message: "File is empty and was skipped." }],
      sources: [file.name],
    };
  }

  return parseRows(parseCsvText(text), file.name);
}

async function parseWorkbookFile(file: File): Promise<ParseResult> {
  const issues: UploadIssue[] = [];
  const records: DashboardRecord[] = [];
  const implementationRecords: ImplementationRecord[] = [];
  const productRecords: ProductRecord[] = [];
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, {
      defval: "",
      raw: false,
    });

    const parsed = parseRows(rows, file.name, sheetName);
    records.push(...parsed.records);
    implementationRecords.push(...parsed.implementationRecords);
    productRecords.push(...parsed.productRecords);
    issues.push(...parsed.issues);
  }

  if (!workbook.SheetNames.length) {
    issues.push({ fileName: file.name, level: "warning", message: "Workbook contains no sheets." });
  }

  return { records, implementationRecords, productRecords, issues, sources: [file.name] };
}

export async function parseDataFiles(files: File[]): Promise<ParseResult> {
  const results = await Promise.all(
    files.map((file) => {
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".xlsx")) {
        return parseWorkbookFile(file);
      }
      return parseCsvFile(file);
    }),
  );

  const issues = results.flatMap((result) => result.issues);
  const records = aggregateMonthly(results.flatMap((result) => result.records));
  const implementationRecords = results.flatMap((result) => result.implementationRecords);
  const productRecords = results.flatMap((result) => result.productRecords);
  const sources = Array.from(new Set(results.flatMap((result) => result.sources)));

  return { records, implementationRecords, productRecords, issues, sources };
}

export function exportRecordsAsCsv(records: DashboardRecord[]): void {
  exportTableAsCsv(
    records.map((record) => ({
      date: record.date,
      platform: record.platform,
      availability_percent: record.availability_percent,
      sms_transactions: record.sms_transactions,
      voice_transactions: record.voice_transactions,
      critical_open_vulnerabilities: record.critical_open_vulnerabilities,
      cloud_total_cost: record.cloud_total_cost,
    })),
    "westcx-cleaned-dashboard-data.csv",
  );
}

export function exportTableAsCsv(rows: Record<string, unknown>[], fileName: string): void {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
