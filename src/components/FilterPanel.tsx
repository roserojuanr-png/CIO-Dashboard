import { CalendarRange, Download, RotateCcw, Sparkles } from "lucide-react";
import type { FilterState, MetricKey, Platform, UploadIssue } from "@/types";
import { METRIC_LABELS, PLATFORM_COLORS, PLATFORM_ORDER } from "@/utils/dashboardData";

interface FilterPanelProps {
  availableMonths: string[];
  filters: FilterState;
  onFiltersChange: (next: FilterState) => void;
  onReset: () => void;
  onExportData: () => void;
  onExportSnapshot: () => void;
  issues: UploadIssue[];
}

const metricKeys: MetricKey[] = [
  "availability_percent",
  "sms_transactions",
  "voice_transactions",
  "critical_open_vulnerabilities",
  "cloud_total_cost",
];

export function FilterPanel({
  availableMonths,
  filters,
  onFiltersChange,
  onReset,
  onExportData,
  onExportSnapshot,
  issues,
}: FilterPanelProps) {
  const setPlatforms = (platform: Platform) => {
    const next = filters.platforms.includes(platform)
      ? filters.platforms.filter((item) => item !== platform)
      : [...filters.platforms, platform];

    onFiltersChange({
      ...filters,
      platforms: next.length ? next : PLATFORM_ORDER,
    });
  };

  const setMetrics = (metric: MetricKey) => {
    const next = filters.metrics.includes(metric)
      ? filters.metrics.filter((item) => item !== metric)
      : [...filters.metrics, metric];

    onFiltersChange({
      ...filters,
      metrics: next.length ? next : metricKeys,
    });
  };

  return (
    <aside className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow backdrop-blur-xl">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <CalendarRange className="h-5 w-5 text-orchestrate" />
        </div>
        <div>
          <p className="font-display text-lg font-semibold text-white">Control Deck</p>
          <p className="text-sm text-muted">Filter the command center by timeframe, platform, and metric focus.</p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="text-muted">Start Month</span>
            <select
              value={filters.startMonth}
              onChange={(event) => onFiltersChange({ ...filters, startMonth: event.target.value })}
              className="w-full rounded-2xl border border-white/10 bg-panelSoft px-4 py-3 text-white outline-none transition focus:border-orchestrate"
            >
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {month.slice(0, 7)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-muted">End Month</span>
            <select
              value={filters.endMonth}
              onChange={(event) => onFiltersChange({ ...filters, endMonth: event.target.value })}
              className="w-full rounded-2xl border border-white/10 bg-panelSoft px-4 py-3 text-white outline-none transition focus:border-orchestrate"
            >
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {month.slice(0, 7)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <p className="mb-3 text-sm text-muted">Platforms</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_ORDER.map((platform) => {
              const selected = filters.platforms.includes(platform);
              return (
                <button
                  key={platform}
                  type="button"
                  onClick={() => setPlatforms(platform)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    selected ? "border-white/30 bg-white/10 text-white" : "border-white/10 bg-white/[0.03] text-muted"
                  }`}
                  style={{
                    boxShadow: selected ? `0 0 0 1px ${PLATFORM_COLORS[platform]}55 inset` : undefined,
                  }}
                >
                  {platform}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm text-muted">Metric Types</p>
          <div className="flex flex-wrap gap-2">
            {metricKeys.map((metric) => {
              const selected = filters.metrics.includes(metric);
              return (
                <button
                  key={metric}
                  type="button"
                  onClick={() => setMetrics(metric)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    selected ? "border-white/30 bg-white/10 text-white" : "border-white/10 bg-white/[0.03] text-muted"
                  }`}
                >
                  {METRIC_LABELS[metric]}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm text-muted">Platform Highlight</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, highlightedPlatform: null })}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                filters.highlightedPlatform === null
                  ? "border-white/30 bg-white/10 text-white"
                  : "border-white/10 bg-white/[0.03] text-muted"
              }`}
            >
              All Platforms
            </button>
            {PLATFORM_ORDER.map((platform) => (
              <button
                key={platform}
                type="button"
                onClick={() => onFiltersChange({ ...filters, highlightedPlatform: platform })}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  filters.highlightedPlatform === platform
                    ? "border-white/30 bg-white/10 text-white"
                    : "border-white/10 bg-white/[0.03] text-muted"
                }`}
              >
                {platform}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Filters
          </button>
          <button
            type="button"
            onClick={onExportData}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
          >
            <Download className="h-4 w-4" />
            Export Clean CSV
          </button>
        </div>

        <button
          type="button"
          onClick={onExportSnapshot}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-orchestrate/30 bg-orchestrate/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-orchestrate/15"
        >
          <Sparkles className="h-4 w-4" />
          Export Dashboard to Print/PDF
        </button>

        {issues.length ? (
          <div className="rounded-2xl border border-amber/20 bg-amber/10 p-4">
            <p className="text-sm font-semibold text-white">Upload validation</p>
            <ul className="mt-2 space-y-2 text-sm text-slate-200">
              {issues.slice(0, 6).map((issue) => (
                <li key={`${issue.fileName}-${issue.message}`}>
                  <span className="font-medium text-white">{issue.fileName}:</span> {issue.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
