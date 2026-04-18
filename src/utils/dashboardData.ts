import type { DashboardRecord, KPIStat, MetricKey, Platform } from "@/types";
import {
  compactNumberFormatter,
  formatCompactNumber,
  formatCurrency,
  formatPercent,
} from "@/utils/formatters";

export const PLATFORM_ORDER: Platform[] = ["HCPRO", "Orchestrate", "Engage", "Odeza", "Heritage"];

export const PLATFORM_COLORS: Record<Platform, string> = {
  HCPRO: "#3be7b0",
  Orchestrate: "#41b6ff",
  Engage: "#b67dff",
  Odeza: "#f59e0b",
  Heritage: "#f97316",
};

export const METRIC_LABELS: Record<MetricKey, string> = {
  availability_percent: "Availability",
  sms_transactions: "SMS Transactions",
  voice_transactions: "Voice Transactions",
  critical_open_vulnerabilities: "Critical Vulnerabilities",
  cloud_total_cost: "Cloud Cost",
};

export function getMonthKey(date: string): string | null {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export function clampPlatform(value: string | null | undefined): Platform | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (normalized === "hcpro" || normalized === "hc pro") {
    return "HCPRO";
  }
  if (normalized === "orchestrate") {
    return "Orchestrate";
  }
  if (normalized === "engage") {
    return "Engage";
  }
  if (normalized === "odeza") {
    return "Odeza";
  }
  if (normalized === "heritage") {
    return "Heritage";
  }

  return null;
}

function pushNumber(target: number[], value: number | null): void {
  if (value !== null && Number.isFinite(value)) {
    target.push(value);
  }
}

export function aggregateMonthly(records: DashboardRecord[]): DashboardRecord[] {
  const grouped = new Map<
    string,
    {
      date: string;
      platform: Platform;
      availability: number[];
      sms: number[];
      voice: number[];
      vulnerabilities: number[];
      cost: number[];
      sources: Set<string>;
    }
  >();

  for (const record of records) {
    const monthKey = getMonthKey(record.date);
    if (!monthKey) {
      continue;
    }

    const key = `${monthKey}::${record.platform}`;
    const existing =
      grouped.get(key) ??
      {
        date: monthKey,
        platform: record.platform,
        availability: [],
        sms: [],
        voice: [],
        vulnerabilities: [],
        cost: [],
        sources: new Set<string>(),
      };

    pushNumber(existing.availability, record.availability_percent);
    pushNumber(existing.sms, record.sms_transactions);
    pushNumber(existing.voice, record.voice_transactions);
    pushNumber(existing.vulnerabilities, record.critical_open_vulnerabilities);
    pushNumber(existing.cost, record.cloud_total_cost);

    if (record.source) {
      existing.sources.add(record.source);
    }

    grouped.set(key, existing);
  }

  return Array.from(grouped.values())
    .map((item) => ({
      date: item.date,
      platform: item.platform,
      availability_percent: average(item.availability),
      sms_transactions: sum(item.sms),
      voice_transactions: sum(item.voice),
      critical_open_vulnerabilities: sum(item.vulnerabilities),
      cloud_total_cost: sum(item.cost),
      source: Array.from(item.sources).join(", "),
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform));
}

function average(values: number[]): number | null {
  if (!values.length) {
    return null;
  }

  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function sum(values: number[]): number | null {
  if (!values.length) {
    return null;
  }

  return values.reduce((acc, value) => acc + value, 0);
}

export function getAvailableMonths(records: DashboardRecord[]): string[] {
  return Array.from(new Set(records.map((record) => record.date))).sort((a, b) => a.localeCompare(b));
}

export function filterRecords(
  records: DashboardRecord[],
  startMonth: string,
  endMonth: string,
  platforms: Platform[],
): DashboardRecord[] {
  return records.filter((record) => {
    const inPlatform = platforms.includes(record.platform);
    const inRange = (!startMonth || record.date >= startMonth) && (!endMonth || record.date <= endMonth);
    return inPlatform && inRange;
  });
}

export function buildSeries(records: DashboardRecord[], metric: MetricKey) {
  const grouped = new Map<string, Record<string, number | string | null>>();

  for (const month of getAvailableMonths(records)) {
    grouped.set(month, { month });
  }

  for (const record of records) {
    const row = grouped.get(record.date) ?? { month: record.date };
    row[record.platform] = record[metric];
    if (metric === "cloud_total_cost") {
      row.total = ((row.total as number | undefined) ?? 0) + (record.cloud_total_cost ?? 0);
    }
    grouped.set(record.date, row);
  }

  return Array.from(grouped.values()).sort((a, b) =>
    String(a.month).localeCompare(String(b.month)),
  );
}

export function getLatestMonth(records: DashboardRecord[]): string | null {
  const months = getAvailableMonths(records);
  return months.length ? months[months.length - 1] : null;
}

function getMetricValue(record: DashboardRecord | undefined, metric: MetricKey): number | null {
  return record ? record[metric] : null;
}

export function calculateDelta(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || Number.isNaN(current) || Number.isNaN(previous)) {
    return null;
  }

  return current - previous;
}

export function buildExecutiveKpis(records: DashboardRecord[]): KPIStat[] {
  const latestMonth = getLatestMonth(records);
  if (!latestMonth) {
    return [];
  }

  const months = getAvailableMonths(records);
  const previousMonth = months.length > 1 ? months[months.length - 2] : null;
  const latestRecords = records.filter((record) => record.date === latestMonth);
  const previousRecords = previousMonth ? records.filter((record) => record.date === previousMonth) : [];

  const totalCostCurrent = latestRecords.reduce((acc, record) => acc + (record.cloud_total_cost ?? 0), 0);
  const totalCostPrevious = previousRecords.reduce((acc, record) => acc + (record.cloud_total_cost ?? 0), 0);
  const totalVulnsCurrent = latestRecords.reduce(
    (acc, record) => acc + (record.critical_open_vulnerabilities ?? 0),
    0,
  );
  const totalVulnsPrevious = previousRecords.reduce(
    (acc, record) => acc + (record.critical_open_vulnerabilities ?? 0),
    0,
  );
  const totalSms = records.reduce((acc, record) => acc + (record.sms_transactions ?? 0), 0);
  const totalVoice = records.reduce((acc, record) => acc + (record.voice_transactions ?? 0), 0);

  const productionPlatforms: Platform[] = ["HCPRO", "Engage"];
  const latestAvailabilityRecords = latestRecords.filter(
    (record) => productionPlatforms.includes(record.platform) && record.availability_percent !== null,
  );
  const previousAvailabilityRecords = previousRecords.filter(
    (record) => productionPlatforms.includes(record.platform) && record.availability_percent !== null,
  );

  const averageAvailability =
    latestAvailabilityRecords.reduce((acc, record) => acc + (record.availability_percent ?? 0), 0) /
    Math.max(latestAvailabilityRecords.length, 1);
  const previousAvailability =
    previousAvailabilityRecords.reduce((acc, record) => acc + (record.availability_percent ?? 0), 0) /
    Math.max(previousAvailabilityRecords.length, 1);

  return [
    {
      label: "Latest Avg Availability",
      value: formatPercent(averageAvailability),
      delta: formatSignedDelta(calculateDelta(averageAvailability, previousAvailability), "pp"),
      deltaDirection: getDirectionalTrend(calculateDelta(averageAvailability, previousAvailability), true),
      accent: "hcpro",
    },
    {
      label: "Range SMS Volume",
      value: compactNumberFormatter.format(totalSms),
      accent: "orchestrate",
    },
    {
      label: "Range Voice Volume",
      value: compactNumberFormatter.format(totalVoice),
      accent: "engage",
    },
    {
      label: "Critical Risk Exposure",
      value: String(totalVulnsCurrent),
      delta: formatSignedDelta(calculateDelta(totalVulnsCurrent, totalVulnsPrevious), ""),
      deltaDirection: getDirectionalTrend(calculateDelta(totalVulnsCurrent, totalVulnsPrevious), false),
      accent: totalVulnsCurrent > 4 ? "danger" : totalVulnsCurrent > 0 ? "amber" : "hcpro",
    },
    {
      label: "Latest Cloud Cost",
      value: formatCurrency(totalCostCurrent),
      delta: formatSignedDelta(calculateDelta(totalCostCurrent, totalCostPrevious), ""),
      deltaDirection: getDirectionalTrend(calculateDelta(totalCostCurrent, totalCostPrevious), false),
      accent: "orchestrate",
    },
  ];
}

function formatSignedDelta(value: number | null, suffix: string): string | undefined {
  if (value === null) {
    return undefined;
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(Math.abs(value) >= 1000 ? 0 : 2)}${suffix}`.trim();
}

function getDirectionalTrend(delta: number | null, higherIsBetter: boolean): "up" | "down" | "neutral" {
  if (delta === null || delta === 0) {
    return "neutral";
  }

  if (higherIsBetter) {
    return delta > 0 ? "up" : "down";
  }

  return delta > 0 ? "down" : "up";
}

export function buildPlatformLatestStats(records: DashboardRecord[], metric: MetricKey): KPIStat[] {
  const latestMonth = getLatestMonth(records);
  if (!latestMonth) {
    return [];
  }

  return PLATFORM_ORDER.map((platform) => {
    const record = records.find((item) => item.date === latestMonth && item.platform === platform);
    const value = getMetricValue(record, metric);
    return {
      label: platform,
      value: formatMetricValue(metric, value),
      accent: platform.toLowerCase(),
    };
  });
}

export function formatMetricValue(metric: MetricKey, value: number | null): string {
  switch (metric) {
    case "availability_percent":
      return formatPercent(value);
    case "cloud_total_cost":
      return formatCurrency(value);
    case "sms_transactions":
    case "voice_transactions":
    case "critical_open_vulnerabilities":
      return formatCompactNumber(value);
    default:
      return value === null ? "N/A" : String(value);
  }
}

export function calculateRangeTotal(records: DashboardRecord[], metric: MetricKey): number {
  return records.reduce((acc, record) => acc + (record[metric] ?? 0), 0);
}
