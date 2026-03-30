import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  ChevronRight,
  Download,
  LogOut,
  RefreshCw,
  Search,
  ShieldAlert,
  Signal,
  UserCircle2,
  Waves,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FilterPanel } from "@/components/FilterPanel";
import { ChartPanel } from "@/components/ChartPanel";
import { KpiCard } from "@/components/KpiCard";
import { SectionCard } from "@/components/SectionCard";
import { UploadDropzone } from "@/components/UploadDropzone";
import { WestCxLogo } from "@/components/WestCxLogo";
import { mockRecords } from "@/data/mockData";
import { mockImplementationRecords, mockProductRecords } from "@/data/mockPortalData";
import type {
  DashboardRecord,
  FilterState,
  ImplementationFilterState,
  ImplementationRecord,
  MetricKey,
  ProductFilterState,
  ProductRecord,
  UploadIssue,
} from "@/types";
import {
  aggregateMonthly,
  buildExecutiveKpis,
  buildPlatformLatestStats,
  buildSeries,
  calculateRangeTotal,
  filterRecords,
  getAvailableMonths,
  getLatestMonth,
  PLATFORM_ORDER,
} from "@/utils/dashboardData";
import { exportRecordsAsCsv, exportTableAsCsv, parseDataFiles } from "@/utils/csv";
import { formatCompactCurrency, formatCompactNumber, formatCurrency } from "@/utils/formatters";

type PageKey = "home" | "command" | "implementation" | "product";

const ALL_METRICS: MetricKey[] = [
  "availability_percent",
  "sms_transactions",
  "voice_transactions",
  "critical_open_vulnerabilities",
  "cloud_total_cost",
];

const CHART_COLORS = ["#00B0FF", "#22c55e", "#a855f7", "#f59e0b", "#ef4444"];

function buildInitialFilters(records: DashboardRecord[]): FilterState {
  const months = getAvailableMonths(records);
  const defaultStart = "2025-06-01";
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const startMonth = months.includes(defaultStart) ? defaultStart : months[0] ?? "";
  const endMonth = months.includes(currentMonth) ? currentMonth : months[months.length - 1] ?? "";

  return {
    startMonth,
    endMonth,
    platforms: PLATFORM_ORDER,
    metrics: ALL_METRICS,
    highlightedPlatform: null,
  };
}

function emptyImplementationFilters(): ImplementationFilterState {
  return { startDate: "", endDate: "", businessUnit: "All", owner: "All", statuses: [] };
}

function emptyProductFilters(): ProductFilterState {
  return { startDate: "", endDate: "", businessUnit: "All", owner: "All", statuses: [], category: "All" };
}

function normalizeBusinessUnit(record: ImplementationRecord): string {
  return record.pod || "Unassigned";
}

export default function App() {
  const initialRecords = aggregateMonthly(mockRecords);
  const [records, setRecords] = useState<DashboardRecord[]>(initialRecords);
  const [implementationRecords, setImplementationRecords] = useState<ImplementationRecord[]>(mockImplementationRecords);
  const [productRecords, setProductRecords] = useState<ProductRecord[]>(mockProductRecords);
  const [filters, setFilters] = useState<FilterState>(() => buildInitialFilters(initialRecords));
  const [implementationFilters, setImplementationFilters] = useState<ImplementationFilterState>(emptyImplementationFilters);
  const [productFilters, setProductFilters] = useState<ProductFilterState>(emptyProductFilters);
  const [issues, setIssues] = useState<UploadIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [availabilityView, setAvailabilityView] = useState<"line" | "bar">("line");
  const [voiceView, setVoiceView] = useState<"bar" | "composed">("composed");
  const [activePage, setActivePage] = useState<PageKey>("home");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [sourceNames, setSourceNames] = useState<string[]>(["WestCX_Main_Data.xlsx"]);
  const [searchQuery, setSearchQuery] = useState("");

  const availableMonths = useMemo(() => getAvailableMonths(records), [records]);
  const filteredRecords = useMemo(
    () => filterRecords(records, filters.startMonth, filters.endMonth, filters.platforms),
    [records, filters],
  );
  const executiveKpis = useMemo(() => buildExecutiveKpis(filteredRecords), [filteredRecords]);
  const latestMonth = useMemo(() => getLatestMonth(filteredRecords), [filteredRecords]);
  const availabilitySeries = useMemo(() => buildSeries(filteredRecords, "availability_percent"), [filteredRecords]);
  const smsSeries = useMemo(() => buildSeries(filteredRecords, "sms_transactions"), [filteredRecords]);
  const voiceSeries = useMemo(() => buildSeries(filteredRecords, "voice_transactions"), [filteredRecords]);
  const vulnerabilitySeries = useMemo(
    () => buildSeries(filteredRecords, "critical_open_vulnerabilities"),
    [filteredRecords],
  );
  const costSeries = useMemo(() => buildSeries(filteredRecords, "cloud_total_cost"), [filteredRecords]);
  const availabilityStats = useMemo(
    () => buildPlatformLatestStats(filteredRecords, "availability_percent"),
    [filteredRecords],
  );
  const vulnerabilityStats = useMemo(
    () => buildPlatformLatestStats(filteredRecords, "critical_open_vulnerabilities"),
    [filteredRecords],
  );

  const securityRisk = useMemo(
    () => calculateRangeTotal(filteredRecords, "critical_open_vulnerabilities") > 9,
    [filteredRecords],
  );

  const filteredImplementationRecords = useMemo(() => {
    return implementationRecords.filter((record) => {
      const businessUnit = normalizeBusinessUnit(record);
      const inBusinessUnit =
        implementationFilters.businessUnit === "All" || businessUnit === implementationFilters.businessUnit;
      const inOwner = implementationFilters.owner === "All" || record.owner === implementationFilters.owner;
      const inStatus =
        implementationFilters.statuses.length === 0 || implementationFilters.statuses.includes(record.status);
      const closedDate = record.closed_date;
      const meetsStart = !implementationFilters.startDate || Boolean(closedDate && closedDate >= implementationFilters.startDate);
      const meetsEnd = !implementationFilters.endDate || Boolean(closedDate && closedDate <= implementationFilters.endDate);
      const inDate = meetsStart && meetsEnd;
      const inSearch =
        !searchQuery ||
        `${record.implementation_id} ${record.client_name} ${record.product_name} ${record.owner} ${record.status}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      return inBusinessUnit && inOwner && inStatus && inDate && inSearch;
    });
  }, [implementationRecords, implementationFilters, searchQuery]);

  const filteredProductRecords = useMemo(() => {
    return productRecords.filter((record) => {
      const inBusinessUnit =
        productFilters.businessUnit === "All" || record.business_unit === productFilters.businessUnit;
      const inCategory = productFilters.category === "All" || record.product_name === productFilters.category;
      const inStatus = productFilters.statuses.length === 0 || productFilters.statuses.includes(record.status);
      const dateValue = record.date;
      const inDate =
        (!productFilters.startDate || dateValue >= productFilters.startDate) &&
        (!productFilters.endDate || dateValue <= productFilters.endDate);
      const inSearch =
        !searchQuery ||
        `${record.product_name} ${record.business_unit} ${record.status} ${record.status_color}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      return inBusinessUnit && inCategory && inStatus && inDate && inSearch;
    });
  }, [productRecords, productFilters, searchQuery]);

  const implementationStats = useMemo(() => {
    const total = filteredImplementationRecords.length;
    const inProgress = filteredImplementationRecords.filter(
      (record) => record.status.trim().toUpperCase() === "IN-PROGRESS",
    ).length;
    const completedThisQuarter = filteredImplementationRecords.filter(
      (record) => record.status.trim().toUpperCase() === "LIVE",
    ).length;
    const completion = total ? Math.round((completedThisQuarter / total) * 100) : 0;
    return { total, inProgress, completedThisQuarter, completion };
  }, [filteredImplementationRecords]);

  const productStats = useMemo(() => {
    const launched = filteredProductRecords.filter((record) => normalizeProductStatus(record.status) === "COMPLETE").length;
    const pipeline = filteredProductRecords.filter((record) => {
      const status = normalizeProductStatus(record.status);
      return status === "ON-TRACK" || status === "YELLOW" || status === "RED" || status === "DELAYED";
    }).length;
    const targetUnderThirtyDays = filteredProductRecords.filter((record) => {
      if (!record.date) {
        return false;
      }
      const gaDate = parseTimelineDate(record.date);
      if (gaDate === null) {
        return false;
      }
      const now = new Date();
      const diffDays = Math.ceil((gaDate - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays < 30;
    }).length;
    return { launched, pipeline, targetUnderThirtyDays };
  }, [filteredProductRecords]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }

    const results = [
      { label: "Command Center", page: "command" as PageKey, hint: "Availability, transactions, security, cost" },
      { label: "CIO Implementations View", page: "implementation" as PageKey, hint: "Delivery portfolio execution" },
      { label: "Product Commercialization Dashboard", page: "product" as PageKey, hint: "Commercial pipeline and launch status" },
      ...filteredImplementationRecords.slice(0, 3).map((record) => ({
        label: `${record.client_name} • ${record.product_name}`,
        page: "implementation" as PageKey,
        hint: `${record.implementation_id} • ${record.status}`,
      })),
      ...filteredProductRecords.slice(0, 3).map((record) => ({
        label: record.product_name,
        page: "product" as PageKey,
        hint: `${record.business_unit} • ${record.status}`,
      })),
    ];

    return results.filter((item) =>
      `${item.label} ${item.hint}`.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [filteredImplementationRecords, filteredProductRecords, searchQuery]);

  useEffect(() => {
    if (!uploadedFiles.length) {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshAllData();
    }, 15 * 60 * 1000);

    return () => window.clearInterval(timer);
  }, [uploadedFiles]);

  async function applyParsedData(files: File[]) {
    const parsed = await parseDataFiles(files);
    setRecords(parsed.records.length ? parsed.records : []);
    setFilters(buildInitialFilters(parsed.records));
    setImplementationRecords(parsed.implementationRecords);
    setProductRecords(parsed.productRecords);
    setSourceNames(parsed.sources.length ? parsed.sources : ["WestCX_Main_Data.xlsx"]);
    setIssues(parsed.issues);
    setLastRefresh(new Date());
  }

  async function handleFilesSelected(files: File[]) {
    if (!files.length) {
      return;
    }

    setLoading(true);
    setUploadedFiles(files);
    try {
      await applyParsedData(files);
    } finally {
      setLoading(false);
    }
  }

  async function refreshAllData() {
    if (!uploadedFiles.length) {
      setLastRefresh(new Date());
      return;
    }

    setLoading(true);
    try {
      await applyParsedData(uploadedFiles);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setFilters(buildInitialFilters(records));
  }

  function handleExportSnapshot() {
    window.print();
  }

  const breadcrumb = useMemo(() => {
    if (activePage === "home") {
      return "Home";
    }
    const names: Record<PageKey, string> = {
      home: "Home",
      command: "Command Center",
      implementation: "CIO Implementations View",
      product: "Product Commercialization Dashboard",
    };
    return `Home → ${names[activePage]}`;
  }, [activePage]);

  return (
    <div className="min-h-screen bg-[#0a101b] bg-ambient font-body text-text">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="cinematic-orb absolute left-[8%] top-20 h-72 w-72 bg-[#00B0FF]/25 animate-pulseGlow" />
        <div className="cinematic-orb absolute right-[10%] top-0 h-80 w-80 bg-engage/20 animate-float" />
        <div className="cinematic-orb absolute bottom-0 left-1/2 h-72 w-96 -translate-x-1/2 bg-hcpro/20 animate-pulseGlow" />
        <div className="absolute inset-x-0 top-0 h-[320px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_55%)]" />
      </div>

      <div className="relative mx-auto max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8">
        <TopNav
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          onSelectPage={setActivePage}
        />

        <div className="mb-6 mt-6 flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4 shadow-glow backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#7ea9d8]">WestCX Dashboard – Executive Portal</p>
            <p className="mt-1 text-sm text-muted">{breadcrumb}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
            <DataSourceBadge sourceNames={sourceNames} lastRefresh={lastRefresh} />
            <button
              type="button"
              onClick={() => void refreshAllData()}
              className="inline-flex items-center gap-2 rounded-full border border-[#00B0FF]/30 bg-[#00B0FF]/10 px-4 py-2 text-white transition hover:bg-[#00B0FF]/15"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh All Data
            </button>
          </div>
        </div>

        {activePage === "home" ? (
          <HomePage
            lastRefresh={lastRefresh}
            loading={loading}
            onFilesSelected={handleFilesSelected}
            onRefresh={() => void refreshAllData()}
            onNavigate={setActivePage}
            issues={issues}
          />
        ) : (
          <>
            {activePage === "command" ? (
              <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {executiveKpis.map((kpi) => (
                  <KpiCard key={kpi.label} {...kpi} />
                ))}
              </section>
            ) : null}

            {activePage === "product" ? (
              <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <KpiCard label="Services/Products Launched" value={String(productStats.launched)} accent="hcpro" />
                <KpiCard label="Pipeline" value={String(productStats.pipeline)} accent="orchestrate" />
                <KpiCard label="Target To Commercialization < 30 Days" value={String(productStats.targetUnderThirtyDays)} accent="engage" />
              </section>
            ) : null}

            {activePage === "implementation" ? (
              <main className="space-y-6">
                <ImplementationPage
                  records={filteredImplementationRecords}
                  allRecords={implementationRecords}
                  filters={implementationFilters}
                  onFiltersChange={setImplementationFilters}
                  onResetFilters={() => setImplementationFilters(emptyImplementationFilters())}
                  onBackHome={() => setActivePage("home")}
                  uploadNode={<UploadDropzone loading={loading} onFilesSelected={handleFilesSelected} />}
                />
              </main>
            ) : (
              <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
                <div className="space-y-6">
                  {activePage === "command" ? (
                    <FilterPanel
                      availableMonths={availableMonths}
                      filters={filters}
                      onFiltersChange={setFilters}
                      onReset={handleReset}
                      onExportData={() => exportRecordsAsCsv(filteredRecords)}
                      onExportSnapshot={handleExportSnapshot}
                      issues={issues}
                    />
                  ) : null}

                  {activePage === "product" ? (
                    <ProductFiltersPanel
                      records={productRecords}
                      filters={productFilters}
                      onChange={setProductFilters}
                      onReset={() => setProductFilters(emptyProductFilters())}
                    />
                  ) : null}

                  <UploadDropzone loading={loading} onFilesSelected={handleFilesSelected} />
                </div>

                <main className="space-y-6">
                {activePage === "command" ? (
                  <>
                    {securityRisk ? (
                      <div className="flex items-center gap-3 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-white">
                        <AlertTriangle className="h-5 w-5 text-danger" />
                        Critical vulnerability exposure is elevated for the selected range. Prioritize remediation review before executive presentation.
                      </div>
                    ) : null}
                    <CommandCenterPage
                      onBackHome={() => setActivePage("home")}
                      filters={filters}
                      availabilityView={availabilityView}
                      voiceView={voiceView}
                      setAvailabilityView={setAvailabilityView}
                      setVoiceView={setVoiceView}
                      availabilityStats={availabilityStats}
                      availabilitySeries={availabilitySeries}
                      smsSeries={smsSeries}
                      voiceSeries={voiceSeries}
                      vulnerabilitySeries={vulnerabilitySeries}
                      vulnerabilityStats={vulnerabilityStats}
                      costSeries={costSeries}
                      filteredRecords={filteredRecords}
                      onExportSnapshot={handleExportSnapshot}
                    />
                  </>
                ) : null}

                {activePage === "product" ? <ProductPage records={filteredProductRecords} onBackHome={() => setActivePage("home")} /> : null}
                </main>
              </div>
            )}
          </>
        )}

        <footer className="mt-10 flex flex-col gap-3 border-t border-white/10 px-1 py-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>Last data refresh: {lastRefresh.toLocaleString()}</p>
          <button
            type="button"
            onClick={() => void refreshAllData()}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-white"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh All Data
          </button>
        </footer>
      </div>
    </div>
  );
}

function TopNav({
  searchQuery,
  setSearchQuery,
  searchResults,
  onSelectPage,
}: {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchResults: Array<{ label: string; page: PageKey; hint: string }>;
  onSelectPage: (page: PageKey) => void;
}) {
  return (
    <header className="panel-shell rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(9,14,28,0.92),rgba(8,12,24,0.86))] px-5 py-4 shadow-portal backdrop-blur-xl">
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,0.86fr)_280px] lg:items-center">
        <div className="flex min-w-[320px] items-center gap-4 pr-2">
          <WestCxLogo compact className="shrink-0" />
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#00B0FF]">WestCX</p>
            <p className="font-display text-lg font-semibold text-white">Executive Portal</p>
          </div>
        </div>

        <div className="relative lg:ml-2">
          <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
            <Search className="h-4 w-4 text-muted" />
          </div>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search across Command Center, Implementations, and Product dashboards"
            className="w-full rounded-full border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-[#00B0FF]/40"
          />
          {searchQuery && searchResults.length ? (
            <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-20 rounded-3xl border border-white/10 bg-[#0c1222] p-2 shadow-glow">
              {searchResults.slice(0, 6).map((result) => (
                <button
                  type="button"
                  key={`${result.page}-${result.label}`}
                  onClick={() => onSelectPage(result.page)}
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition hover:bg-white/[0.05]"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{result.label}</p>
                    <p className="text-xs text-muted">{result.hint}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3">
          <p className="hidden text-center font-display text-xl font-semibold text-white lg:block">CIO Executive Dashboard</p>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
            <UserCircle2 className="h-6 w-6 text-[#00B0FF]" />
            <span className="text-sm text-white">Executive User</span>
          </div>
          <button type="button" className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-white">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

function HomePage({
  lastRefresh,
  loading,
  onFilesSelected,
  onRefresh,
  onNavigate,
  issues,
}: {
  lastRefresh: Date;
  loading: boolean;
  onFilesSelected: (files: File[]) => void;
  onRefresh: () => void;
  onNavigate: (page: PageKey) => void;
  issues: UploadIssue[];
}) {
  return (
    <div className="space-y-6">
      <section className="panel-shell hero-grid rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(0,176,255,0.12),rgba(255,255,255,0.02))] p-8 shadow-portal backdrop-blur-xl">
        <div className="mb-6">
          <WestCxLogo />
        </div>
        <p className="text-sm uppercase tracking-[0.35em] text-[#7ecfff]">WestCX Dashboard – Executive Portal</p>
        <h1 className="mt-4 max-w-4xl font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Strategic operating portal for command, delivery, and commercialization visibility.
        </h1>
        <p className="mt-4 max-w-3xl text-base text-[#a7b8d8]">
          Navigate between the live CIO command center, implementation execution portfolio, and product commercialization console while keeping a single connected workbook source of truth.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <PortalCard
          title="Command Center"
          description="Availability, cost, transactions, security posture, and executive operational KPIs."
          accent="from-[#00B0FF]/25 to-[#00B0FF]/5"
          onClick={() => onNavigate("command")}
          icon={<PortalGlyph tone="blue" kind="command" />}
        />
        <PortalCard
          title="CIO Implementations View"
          description="Delivery status, go-live timing, risk, owners, and implementation-level execution controls."
          accent="from-hcpro/25 to-hcpro/5"
          onClick={() => onNavigate("implementation")}
          icon={<PortalGlyph tone="green" kind="implementation" />}
        />
        <PortalCard
          title="Product Commercialization Dashboard"
          description="Launch pipeline, GA timeline readiness, and commercialization status by platform and service."
          accent="from-engage/25 to-engage/5"
          onClick={() => onNavigate("product")}
          icon={<PortalGlyph tone="purple" kind="product" />}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <UploadDropzone loading={loading} onFilesSelected={onFilesSelected} />
        <SectionCard
          title="Portal Controls"
          subtitle="Use a single Excel workbook or CSV set to populate all three dashboards."
          action={
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-full border border-[#00B0FF]/30 bg-[#00B0FF]/10 px-4 py-2 text-white"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh All Data
            </button>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <InsightCard icon={<Signal className="h-5 w-5 text-[#00B0FF]" />} label="Last data refresh" value={lastRefresh.toLocaleString()} />
            <InsightCard icon={<Waves className="h-5 w-5 text-hcpro" />} label="Workbook support" value="CSV + XLSX + all tabs" />
          </div>
          {issues.length ? (
            <div className="mt-5 rounded-2xl border border-amber/20 bg-amber/10 p-4 text-sm text-slate-200">
              {issues.slice(0, 5).map((issue) => (
                <p key={`${issue.fileName}-${issue.message}`}>
                  <span className="font-medium text-white">{issue.fileName}:</span> {issue.message}
                </p>
              ))}
            </div>
          ) : null}
        </SectionCard>
      </section>
    </div>
  );
}

function CommandCenterPage(props: {
  onBackHome: () => void;
  filters: FilterState;
  availabilityView: "line" | "bar";
  voiceView: "bar" | "composed";
  setAvailabilityView: (view: "line" | "bar") => void;
  setVoiceView: (view: "bar" | "composed") => void;
  availabilityStats: ReturnType<typeof buildPlatformLatestStats>;
  availabilitySeries: Array<Record<string, string | number | null>>;
  smsSeries: Array<Record<string, string | number | null>>;
  voiceSeries: Array<Record<string, string | number | null>>;
  vulnerabilitySeries: Array<Record<string, string | number | null>>;
  vulnerabilityStats: ReturnType<typeof buildPlatformLatestStats>;
  costSeries: Array<Record<string, string | number | null>>;
  filteredRecords: DashboardRecord[];
  onExportSnapshot: () => void;
}) {
  const {
    onBackHome,
    filters,
    availabilityView,
    voiceView,
    setAvailabilityView,
    setVoiceView,
    availabilityStats,
    availabilitySeries,
    smsSeries,
    voiceSeries,
    vulnerabilitySeries,
    vulnerabilityStats,
    costSeries,
    filteredRecords,
    onExportSnapshot,
  } = props;

  return (
    <>
      <PageTopActions onBackHome={onBackHome} />
      {filters.metrics.includes("availability_percent") ? (
        <SectionCard
          title="Monthly Availability by Platform"
          subtitle="Executive availability trend with a 99.9% target marker and latest monthly platform posture."
          action={
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setAvailabilityView("line")} className={`rounded-full px-3 py-1.5 text-sm ${availabilityView === "line" ? "bg-white/10 text-white" : "text-muted"}`}>Line</button>
              <button type="button" onClick={() => setAvailabilityView("bar")} className={`rounded-full px-3 py-1.5 text-sm ${availabilityView === "bar" ? "bg-white/10 text-white" : "text-muted"}`}>Bar</button>
            </div>
          }
        >
          <div className="mb-5 grid gap-4 md:grid-cols-3">
            {availabilityStats.map((stat) => (
              <KpiCard key={stat.label} {...stat} />
            ))}
          </div>
          <ChartPanel
            data={availabilitySeries}
            metric="availability_percent"
            chartType={availabilityView}
            percentAxis
            thresholdLine={99.9}
            highlightPlatform={filters.highlightedPlatform}
          />
        </SectionCard>
      ) : null}

      <div className="grid gap-6 2xl:grid-cols-2">
        {filters.metrics.includes("sms_transactions") ? (
          <SectionCard
            title="SMS Transactions per Month"
            subtitle={`Selected range total: ${formatCompactNumber(calculateRangeTotal(filteredRecords, "sms_transactions"))}`}
            action={<ExportButton onClick={() => exportRecordsAsCsv(filteredRecords)} label="Export CSV" />}
          >
            <ChartPanel data={smsSeries} metric="sms_transactions" chartType="bar" highlightPlatform={filters.highlightedPlatform} />
          </SectionCard>
        ) : null}

        {filters.metrics.includes("voice_transactions") ? (
          <SectionCard
            title="Voice Transactions per Month"
            subtitle={`Selected range total: ${formatCompactNumber(calculateRangeTotal(filteredRecords, "voice_transactions"))}`}
            action={
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setVoiceView("composed")} className={`rounded-full px-3 py-1.5 text-sm ${voiceView === "composed" ? "bg-white/10 text-white" : "text-muted"}`}>Hybrid</button>
                <button type="button" onClick={() => setVoiceView("bar")} className={`rounded-full px-3 py-1.5 text-sm ${voiceView === "bar" ? "bg-white/10 text-white" : "text-muted"}`}>Bar</button>
              </div>
            }
          >
            <ChartPanel data={voiceSeries} metric="voice_transactions" chartType={voiceView} highlightPlatform={filters.highlightedPlatform} />
          </SectionCard>
        ) : null}
      </div>

      {filters.metrics.includes("critical_open_vulnerabilities") ? (
        <SectionCard title="Critical Open Vulnerabilities per Month" subtitle="Risk-oriented view with conditional severity coloring.">
          <div className="mb-5 grid gap-4 md:grid-cols-3">
            {vulnerabilityStats.map((stat) => (
              <KpiCard key={stat.label} {...stat} />
            ))}
          </div>
          <ChartPanel data={vulnerabilitySeries} metric="critical_open_vulnerabilities" chartType="bar" highlightPlatform={filters.highlightedPlatform} riskMode />
        </SectionCard>
      ) : null}

      {filters.metrics.includes("cloud_total_cost") ? (
        <SectionCard
          title="Cloud Total Cost per Month"
          subtitle={`Selected range total: ${formatCurrency(calculateRangeTotal(filteredRecords, "cloud_total_cost"))}`}
          action={<ExportButton onClick={onExportSnapshot} label="Export PDF / PNG" />}
        >
          <ChartPanel data={costSeries} metric="cloud_total_cost" chartType="line" currencyAxis highlightPlatform={filters.highlightedPlatform} />
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <InsightCard icon={<BadgeDollarSign className="h-5 w-5 text-orchestrate" />} label="Latest Month Total Cost" value={formatCurrency(costSeries[costSeries.length - 1]?.total as number | undefined)} />
            <InsightCard icon={<Signal className="h-5 w-5 text-hcpro" />} label="Availability Target" value="99.90%" />
            <InsightCard icon={<ShieldAlert className="h-5 w-5 text-danger" />} label="Open Criticals In Range" value={String(calculateRangeTotal(filteredRecords, "critical_open_vulnerabilities"))} />
          </div>
        </SectionCard>
      ) : null}
    </>
  );
}

function ImplementationPage({
  records,
  onBackHome,
  allRecords,
  filters,
  onFiltersChange,
  onResetFilters,
  uploadNode,
}: {
  records: ImplementationRecord[];
  onBackHome: () => void;
  allRecords: ImplementationRecord[];
  filters: ImplementationFilterState;
  onFiltersChange: (filters: ImplementationFilterState) => void;
  onResetFilters: () => void;
  uploadNode: ReactNode;
}) {
  const timelineRecords = [...records].sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0));
  const byBusinessUnit = Array.from(
    records.reduce((acc, record) => {
      const key = normalizeBusinessUnit(record);
      acc.set(key, (acc.get(key) ?? 0) + 1);
      return acc;
    }, new Map<string, number>()),
  ).map(([name, value]) => ({ name, value }));

  const statusDistribution = Array.from(
    records.reduce((acc, record) => {
      acc.set(record.status || "Unknown", (acc.get(record.status || "Unknown") ?? 0) + 1);
      return acc;
    }, new Map<string, number>()),
  ).map(([name, value]) => ({ name, value }));

  const delayedReasonDistribution = Array.from(
    records.reduce((acc, record) => {
      if (record.status.trim().toUpperCase() !== "DELAYED") {
        return acc;
      }
      const key = record.not_live_reason?.trim();
      if (!key) {
        return acc;
      }
      acc.set(key, (acc.get(key) ?? 0) + 1);
      return acc;
    }, new Map<string, number>()),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const delayedPodDistribution = Array.from(
    records.reduce((acc, record) => {
      if (record.status.trim().toUpperCase() !== "DELAYED") {
        return acc;
      }
      const key = normalizeBusinessUnit(record).trim();
      if (!key) {
        return acc;
      }
      acc.set(key, (acc.get(key) ?? 0) + 1);
      return acc;
    }, new Map<string, number>()),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const realizedRevenueSinceQ4 = records.reduce((acc, record) => {
    if (!isAtOrAfterQuarter(record.sold_quarter, "2025-Q4")) {
      return acc;
    }
    return acc + (record.cumulative_revenue ?? 0);
  }, 0);

  const topRevenueCustomers = Array.from(
    records.reduce((acc, record) => {
      if (!isAtOrAfterQuarter(record.sold_quarter, "2025-Q4") || record.cumulative_revenue === null) {
        return acc;
      }
      const key = (record.account_name || record.client_name || record.implementation_id).trim();
      const existing = acc.get(key) ?? { customer: key, total: 0, latestQuarter: "" };
      existing.total += record.cumulative_revenue;
      if (record.sold_quarter && record.sold_quarter > existing.latestQuarter) {
        existing.latestQuarter = record.sold_quarter;
      }
      acc.set(key, existing);
      return acc;
    }, new Map<string, { customer: string; total: number; latestQuarter: string }>()),
  )
    .map(([, value]) => value)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <>
      <PageTopActions onBackHome={onBackHome} />
      <section className="mb-6 space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr_1fr_0.95fr] xl:items-start">
          <SectionCard
            title="Status Distribution"
            subtitle="Execution status mix across the implementation portfolio."
            className="h-full"
          >
            <div className="mx-auto flex max-w-[360px] flex-col items-center">
              <div className="aspect-square w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusDistribution} dataKey="value" nameKey="name" innerRadius={82} outerRadius={122}>
                      {statusDistribution.map((entry, index) => (
                        <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
                {statusDistribution.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <span
                      className="h-3.5 w-3.5 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span className="text-muted">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Delayed Status Reason"
            subtitle="Breakdown of No Live Reason values from delayed implementations."
            className="h-full"
          >
            <div className="mx-auto flex max-w-[360px] flex-col items-center">
              <div className="aspect-square w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={delayedReasonDistribution} dataKey="value" nameKey="name" innerRadius={82} outerRadius={122}>
                      {delayedReasonDistribution.map((entry, index) => (
                        <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
                {delayedReasonDistribution.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <span
                      className="h-3.5 w-3.5 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span className="text-muted">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Delayed Reason By POD"
            subtitle="Share of delayed implementations by POD, using delayed rows and POD values from column G."
            className="h-full"
          >
            <div className="mx-auto flex max-w-[360px] flex-col items-center">
              <div className="aspect-square w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={delayedPodDistribution} dataKey="value" nameKey="name" innerRadius={82} outerRadius={122}>
                      {delayedPodDistribution.map((entry, index) => (
                        <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
                {delayedPodDistribution.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <span
                      className="h-3.5 w-3.5 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span className="text-muted">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          <div className="space-y-6">
            <ImplementationFiltersPanel
              records={allRecords}
              filters={filters}
              onChange={onFiltersChange}
              onReset={onResetFilters}
            />
            {uploadNode}
          </div>
        </div>

        <SectionCard
          title="Total Realized Revenue Since Q4"
          subtitle="Summatory of Column N `CUMMULATIVE_REVENUE` from the Implementations tab (2025-Q4 onward)."
          className="h-full"
        >
          <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="rounded-[2rem] border border-hcpro/20 bg-[linear-gradient(180deg,rgba(11,18,36,0.82),rgba(8,16,22,0.94))] p-6">
              <p className="text-xs uppercase tracking-[0.25em] text-hcpro">Realized Revenue Since Q4</p>
              <p className="mt-4 font-display text-5xl font-bold tracking-tight text-sky-300">
                {formatCompactCurrency(realizedRevenueSinceQ4)}
              </p>
              <p className="mt-3 text-sm text-muted">
                Computed as the sum of `CUMMULATIVE_REVENUE` (Column N) from sold quarter 2025-Q4 and after.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {topRevenueCustomers.map((customer) => (
                <div key={`${customer.customer}-cumulative-revenue`} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{customer.customer}</p>
                      <p className="text-xs text-muted">{customer.latestQuarter || "2025-Q4+"}</p>
                    </div>
                    <p className="text-sm font-semibold text-hcpro">{formatCurrency(customer.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total Implementations" value={String(records.length)} accent="orchestrate" />
          <KpiCard
            label="In Progress"
            value={String(records.filter((record) => record.status.trim().toUpperCase() === "IN-PROGRESS").length)}
            accent="amber"
          />
          <KpiCard
            label="Completed This Quarter"
            value={String(records.filter((record) => record.status.trim().toUpperCase() === "LIVE").length)}
            accent="hcpro"
          />
          <KpiCard
            label="Overall Completion %"
            value={`${records.length ? Math.round((records.filter((record) => record.status.trim().toUpperCase() === "LIVE").length / records.length) * 100) : 0}%`}
            accent="engage"
          />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]">
        <SectionCard
            title="Implementation Execution Timeline"
            subtitle="Gantt-style operating view across implementation ownership, timing, and delivery posture."
            action={<ExportButton onClick={() => exportTableAsCsv(records as unknown as Record<string, unknown>[], "implementation-status.csv")} label="Export CSV" />}
          >
            <div className="space-y-4">
            {timelineRecords.map((record) => (
              <div key={record.implementation_id} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:grid-cols-[220px_minmax(0,1fr)_180px]">
                <div>
                  <p className="font-medium text-white">{record.opportunity_owner || record.owner || "Unassigned owner"} • {record.account_name || record.client_name || record.implementation_id}</p>
                  <p className="text-sm text-muted">{record.product_name} • {record.revenue !== null ? formatCurrency(record.revenue) : "Revenue N/A"}</p>
                </div>
                <div>
                  <div className="mb-2 grid grid-cols-3 text-xs text-muted">
                    <span className="text-left">{record.closed_date || "TBD"}</span>
                    <span className="text-center">
                      {getEffectiveImplementationStartDate(
                        record.closed_date,
                        record.customer_scope_sign_off,
                        record.actual_go_live_date,
                      ) || "TBD"}
                    </span>
                    <span className="text-right">{record.actual_go_live_date || "TBD"}</span>
                  </div>
                  <TimelineBar
                    closedDate={record.closed_date}
                    scopeSignOffDate={record.customer_scope_sign_off}
                    liveDate={record.actual_go_live_date}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm text-white">{record.status || "Unknown"}</span>
                  <span className="text-sm text-muted">{record.risk_level || "No risk"}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Business Unit / Region Volume" subtitle="Horizontal ranking of implementation activity by unit or product area.">
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byBusinessUnit} layout="vertical" margin={{ left: 16, right: 16 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#8ba0c7", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#8ba0c7", fontSize: 12 }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#00B0FF" radius={[0, 10, 10, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Risk & Issue Heatmap" subtitle="Traffic-light view of risk by owner and implementation.">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
              {records.map((record) => (
                <div key={`${record.implementation_id}-risk`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="font-medium text-white">{record.implementation_id}</p>
                  <p className="mt-1 text-sm text-muted">{record.owner || "Unassigned"} • {record.client_name}</p>
                  <div className="mt-3 inline-flex rounded-full px-3 py-1 text-sm text-white" style={{ background: /red|high/i.test(record.risk_level) ? "rgba(239,68,68,0.28)" : /amber/i.test(record.risk_level) ? "rgba(245,158,11,0.28)" : "rgba(34,197,94,0.28)" }}>
                    {record.risk_level || "Green"}{record.risk_reason ? ` • ${record.risk_reason}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Implementation Register" subtitle="Sortable and exportable detailed dataset from the IMPLEMENTATIONS tab.">
        <div className="mb-4 flex justify-end">
          <ExportButton onClick={() => exportTableAsCsv(records as unknown as Record<string, unknown>[], "implementation-register.csv")} label="Export CSV" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
            <thead>
              <tr className="text-muted">
                {["ID", "Client", "Product", "Owner", "Status", "Risk", "Planned Go-Live", "Actual Go-Live", "Sign-Off"].map((header) => (
                  <th key={header} className="px-3 py-2 font-medium">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.implementation_id} className="rounded-2xl bg-white/[0.04]">
                  <td className="px-3 py-3 text-white">{record.implementation_id}</td>
                  <td className="px-3 py-3">{record.client_name || "N/A"}</td>
                  <td className="px-3 py-3">{record.product_name || "N/A"}</td>
                  <td className="px-3 py-3">{record.owner || "N/A"}</td>
                  <td className="px-3 py-3">{record.status || "N/A"}</td>
                  <td className="px-3 py-3">{record.risk_level || "N/A"}</td>
                  <td className="px-3 py-3">{record.planned_go_live_date || "N/A"}</td>
                  <td className="px-3 py-3">{record.actual_go_live_date || "N/A"}</td>
                  <td className="px-3 py-3">{record.customer_scope_sign_off || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </>
  );
}

function ProductPage({
  records,
  onBackHome,
}: {
  records: ProductRecord[];
  onBackHome: () => void;
}) {
  const pipelineRecords = [...records].sort((left, right) => {
    const leftTime = parseTimelineDate(left.date) ?? Number.MAX_SAFE_INTEGER;
    const rightTime = parseTimelineDate(right.date) ?? Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime;
  });
  const groupedByPlatform = Array.from(
    pipelineRecords.reduce((acc, record) => {
      const key = record.business_unit || "Unassigned";
      acc.set(key, [...(acc.get(key) ?? []), record]);
      return acc;
    }, new Map<string, ProductRecord[]>()),
  );

  return (
    <>
      <PageTopActions onBackHome={onBackHome} />
      <SectionCard
        title="Pipeline and Timelines"
        subtitle="GA launch timeline driven directly by the PRODUCT tab Date column, with commercialization status color from the Color column."
        action={<ExportButton onClick={() => exportTableAsCsv(records as unknown as Record<string, unknown>[], "product-pipeline-timelines.csv")} label="Export CSV" />}
      >
        <div className="space-y-6">
          {groupedByPlatform.map(([platform, platformRecords]) => (
            <div key={platform} className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[#8aa6cf]">Platform</p>
                  <p className="mt-1 font-display text-xl font-semibold text-white">{platform}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-200">
                  {platformRecords.length} item{platformRecords.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="space-y-4">
                {platformRecords.map((record, index) => (
                  <ProductTimelineRow
                    key={`${record.product_id}-${index}`}
                    label={record.product_name}
                    date={record.date}
                    status={record.status}
                    color={record.status_color}
                    minDate={pipelineRecords[0]?.date ?? ""}
                    maxDate={pipelineRecords[pipelineRecords.length - 1]?.date ?? ""}
                  />
                ))}
              </div>
            </div>
          ))}

          {!groupedByPlatform.length ? (
            <div className="rounded-[1.75rem] border border-dashed border-white/10 bg-white/[0.03] px-6 py-10 text-center text-muted">
              Upload or filter a PRODUCT tab dataset to populate the commercialization pipeline timeline.
            </div>
          ) : null}
        </div>
      </SectionCard>
    </>
  );
}

function DataSourceBadge({ sourceNames, lastRefresh }: { sourceNames: string[]; lastRefresh: Date }) {
  return (
    <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
      Connected to: <span className="text-white">{sourceNames.join(", ")}</span> • {lastRefresh.toLocaleTimeString()}
    </div>
  );
}

function PortalCard({
  title,
  description,
  accent,
  onClick,
  icon,
}: {
  title: string;
  description: string;
  accent: string;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`panel-shell group rounded-[2rem] border border-white/10 bg-gradient-to-br ${accent} p-[1px] text-left shadow-portal transition duration-300 hover:-translate-y-1.5`}
    >
      <div className="flex h-full min-h-[260px] flex-col justify-between rounded-[calc(2rem-1px)] bg-[linear-gradient(180deg,rgba(11,18,36,0.97),rgba(14,21,40,0.92))] p-6">
        <div className="inline-flex">{icon}</div>
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-white">{title}</h2>
          <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
        </div>
      </div>
    </button>
  );
}

function ImplementationFiltersPanel({
  records,
  filters,
  onChange,
  onReset,
}: {
  records: ImplementationRecord[];
  filters: ImplementationFilterState;
  onChange: (filters: ImplementationFilterState) => void;
  onReset: () => void;
}) {
  const businessUnits = Array.from(new Set(records.map(normalizeBusinessUnit))).sort();
  const owners = Array.from(new Set(records.map((record) => record.owner).filter(Boolean))).sort();
  const statuses = Array.from(new Set(records.map((record) => record.status).filter(Boolean))).sort();

  return (
    <aside className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow backdrop-blur-xl">
      <p className="font-display text-lg font-semibold text-white">Implementation Filters</p>
      <div className="mt-4 space-y-4">
        <FilterSelect label="POD" value={filters.businessUnit} options={["All", ...businessUnits]} onChange={(value) => onChange({ ...filters, businessUnit: value })} />
        <FilterSelect label="Owner" value={filters.owner} options={["All", ...owners]} onChange={(value) => onChange({ ...filters, owner: value })} />
        <FilterSelect label="Status" value={filters.statuses[0] ?? "All"} options={["All", ...statuses]} onChange={(value) => onChange({ ...filters, statuses: value === "All" ? [] : [value] })} />
        <DateRangeFields startDate={filters.startDate} endDate={filters.endDate} onStartChange={(value) => onChange({ ...filters, startDate: value })} onEndChange={(value) => onChange({ ...filters, endDate: value })} />
        <ResetButton onClick={onReset} />
      </div>
    </aside>
  );
}

function ProductFiltersPanel({
  records,
  filters,
  onChange,
  onReset,
}: {
  records: ProductRecord[];
  filters: ProductFilterState;
  onChange: (filters: ProductFilterState) => void;
  onReset: () => void;
}) {
  const businessUnits = Array.from(new Set(records.map((record) => record.business_unit).filter(Boolean))).sort();
  const statuses = Array.from(new Set(records.map((record) => record.status).filter(Boolean))).sort();
  const categories = Array.from(new Set(records.map((record) => record.product_name).filter(Boolean))).sort();

  return (
    <aside className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow backdrop-blur-xl">
      <p className="font-display text-lg font-semibold text-white">Product Filters</p>
      <div className="mt-4 space-y-4">
        <FilterSelect label="Platform" value={filters.businessUnit} options={["All", ...businessUnits]} onChange={(value) => onChange({ ...filters, businessUnit: value })} />
        <FilterSelect label="Service / Product" value={filters.category} options={["All", ...categories]} onChange={(value) => onChange({ ...filters, category: value })} />
        <FilterSelect label="Status" value={filters.statuses[0] ?? "All"} options={["All", ...statuses]} onChange={(value) => onChange({ ...filters, statuses: value === "All" ? [] : [value] })} />
        <DateRangeFields startDate={filters.startDate} endDate={filters.endDate} onStartChange={(value) => onChange({ ...filters, startDate: value })} onEndChange={(value) => onChange({ ...filters, endDate: value })} />
        <ResetButton onClick={onReset} />
      </div>
    </aside>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 text-sm">
      <span className="text-muted">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-panelSoft px-4 py-3 text-white outline-none">
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function DateRangeFields({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
}: {
  startDate: string;
  endDate: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-2 text-sm">
        <span className="text-muted">Start Date</span>
        <input type="date" value={startDate} onChange={(event) => onStartChange(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-panelSoft px-4 py-3 text-white outline-none" />
      </label>
      <label className="space-y-2 text-sm">
        <span className="text-muted">End Date</span>
        <input type="date" value={endDate} onChange={(event) => onEndChange(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-panelSoft px-4 py-3 text-white outline-none" />
      </label>
    </div>
  );
}

function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white">
      Reset Filters
    </button>
  );
}

function ExportButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white">
      <Download className="h-4 w-4" />
      {label}
    </button>
  );
}

function PageTopActions({ onBackHome }: { onBackHome: () => void }) {
  return (
    <div className="mb-4 flex justify-end">
      <button
        type="button"
        onClick={onBackHome}
        className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-hcpro/35 bg-[linear-gradient(180deg,rgba(8,18,18,0.96),rgba(6,14,14,0.92))] px-4 py-3 text-left shadow-[0_0_0_1px_rgba(59,231,176,0.12),0_18px_50px_rgba(3,10,10,0.5)] transition duration-300 hover:-translate-y-0.5 hover:border-hcpro/55 hover:shadow-[0_0_0_1px_rgba(59,231,176,0.18),0_20px_60px_rgba(3,10,10,0.6)]"
      >
        <span className="absolute inset-0 bg-[linear-gradient(120deg,transparent_20%,rgba(59,231,176,0.08)_50%,transparent_80%)] opacity-0 transition duration-300 group-hover:opacity-100" />
        <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-hcpro/30 bg-hcpro/10 text-hcpro shadow-[0_0_24px_rgba(59,231,176,0.18)]">
          <HomeBackGlyph />
        </span>
        <span className="relative flex flex-col">
          <span className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-hcpro">Back To Home</span>
          <span className="text-xs text-slate-300">Return to Executive Portal</span>
        </span>
      </button>
    </div>
  );
}

function HomeBackGlyph() {
  return (
    <span className="relative block h-5 w-5">
      <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rotate-45 border-l-2 border-t-2 border-current" />
      <span className="absolute left-1/2 top-2 h-3.5 w-3.5 -translate-x-1/2 border-x-2 border-current" />
      <span className="absolute bottom-0 left-1/2 h-1.5 w-6 -translate-x-1/2 rounded-sm border border-current/80" />
      <span className="absolute left-[3px] top-[7px] h-1.5 w-3 rounded-full bg-current" />
      <span className="absolute left-[1px] top-[5px] h-0 w-0 border-b-[4px] border-r-[5px] border-t-[4px] border-b-transparent border-r-current border-t-transparent" />
    </span>
  );
}

function InsightCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 inline-flex rounded-2xl border border-white/10 bg-white/[0.04] p-3">{icon}</div>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function normalizeProductStatus(status: string): string {
  return status.trim().toUpperCase().replace(/[_\s]+/g, "-");
}

function productStatusTone(color: string, status: string): string {
  const normalizedColor = color.trim().toUpperCase();
  const normalizedStatus = normalizeProductStatus(status);
  if (normalizedColor.includes("RED") || normalizedStatus === "RED" || normalizedStatus === "DELAYED") {
    return "rgba(239,68,68,0.28)";
  }
  if (normalizedColor.includes("YELLOW") || normalizedStatus === "YELLOW") {
    return "rgba(250,204,21,0.34)";
  }
  if (normalizedColor.includes("GREEN") || normalizedStatus === "COMPLETE" || normalizedStatus === "ON-TRACK") {
    return "rgba(34,197,94,0.26)";
  }
  return "rgba(0,176,255,0.24)";
}

function ProductTimelineRow({
  label,
  date,
  status,
  color,
  minDate,
  maxDate,
}: {
  label: string;
  date: string;
  status: string;
  color: string;
  minDate: string;
  maxDate: string;
}) {
  const min = parseTimelineDate(minDate);
  const max = parseTimelineDate(maxDate);
  const current = parseTimelineDate(date);
  const tone = productStatusTone(color, status);
  let width = 100;

  if (min !== null && max !== null && current !== null && max > min) {
    width = 20 + (((current - min) / (max - min)) * 80);
  }

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-[#0d1423]/85 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold text-white">{label}</p>
          <p className="mt-1 text-sm text-muted">GA Date: {date || "TBD"}</p>
        </div>
        <span
          className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-white"
          style={{ background: tone }}
        >
          {status || color || "Unknown"}
        </span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-3 rounded-full shadow-[0_0_24px_rgba(255,255,255,0.06)]" style={{ width: `${width}%`, background: tone }} />
      </div>
    </div>
  );
}

function TimelineBar({
  closedDate,
  scopeSignOffDate,
  liveDate,
}: {
  closedDate: string;
  scopeSignOffDate: string;
  liveDate: string;
}) {
  const closed = parseTimelineDate(closedDate);
  const effectiveStart = getEffectiveImplementationStartDate(closedDate, scopeSignOffDate, liveDate);
  const scope = parseTimelineDate(effectiveStart);
  const actualLive = parseTimelineDate(liveDate);
  const syntheticLive =
    closed !== null && scope !== null
      ? Math.max(scope + 75 * 24 * 60 * 60 * 1000, closed + 90 * 24 * 60 * 60 * 1000)
      : null;
  const live = actualLive ?? syntheticLive;
  const valid = closed !== null && scope !== null && live !== null && closed <= scope && scope <= live;
  const total = valid ? Math.max(live - closed, 1) : 1;
  const firstWidth = valid ? ((scope - closed) / total) * 100 : 18;
  const secondWidth = valid ? ((live - scope) / total) * 100 : 82;
  const markerLeft = valid ? ((scope - closed) / total) * 100 : 18;

  return (
    <div className="relative">
      <div className="relative h-3 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-3 rounded-l-full bg-[#1da1f2]" style={{ width: `${firstWidth}%` }} />
        <div className="absolute left-0 top-0 flex h-3 w-full">
          <div style={{ width: `${firstWidth}%` }} />
          <div className="h-3 rounded-r-full bg-[#22c55e]" style={{ width: `${secondWidth}%` }} />
        </div>
      </div>
      <div
        className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-panel shadow-[0_0_18px_rgba(255,255,255,0.16)]"
        style={{ left: `${markerLeft}%` }}
      />
    </div>
  );
}

function getEffectiveImplementationStartDate(
  closedDate: string,
  scopeSignOffDate: string,
  liveDate: string,
): string {
  const closed = parseTimelineDate(closedDate);
  const scope = parseTimelineDate(scopeSignOffDate);
  const live = parseTimelineDate(liveDate);

  if (closed === null) {
    return scopeSignOffDate || "";
  }

  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const twoWeeks = 14 * 24 * 60 * 60 * 1000;
  const threeWeeks = 21 * 24 * 60 * 60 * 1000;
  const preferredStart = closed + twoWeeks;

  let effective = preferredStart;

  if (scope !== null) {
    const scopeGap = scope - closed;

    if (scopeGap >= 0 && scopeGap <= threeWeeks) {
      effective = scope;
    } else if (scopeGap >= 0) {
      effective = preferredStart;
    } else {
      effective = closed + oneWeek;
    }
  }

  if (live !== null && effective > live) {
    effective = live;
  }

  if (effective < closed) {
    effective = closed + oneWeek;
  }

  return new Date(effective).toISOString().slice(0, 10);
}

function parseTimelineDate(value: string): number | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim();
  const shortSlashMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (shortSlashMatch) {
    const [, monthText, dayText, yearText] = shortSlashMatch;
    const month = Number(monthText);
    const day = Number(dayText);
    const year = yearText.length === 2 ? 2000 + Number(yearText) : Number(yearText);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function isAtOrAfterQuarter(inputQuarter: string, baselineQuarter: string): boolean {
  const parseQuarter = (value: string): { year: number; quarter: number } | null => {
    const match = value.trim().toUpperCase().match(/(\d{4})\s*[-/]?\s*Q([1-4])/);
    if (!match) {
      return null;
    }
    return { year: Number(match[1]), quarter: Number(match[2]) };
  };

  const input = parseQuarter(inputQuarter);
  const baseline = parseQuarter(baselineQuarter);
  if (!input || !baseline) {
    return true;
  }

  if (input.year !== baseline.year) {
    return input.year > baseline.year;
  }
  return input.quarter >= baseline.quarter;
}

function PortalGlyph({
  tone,
  kind,
}: {
  tone: "blue" | "green" | "purple";
  kind: "command" | "implementation" | "product";
}) {
  const toneClasses = {
    blue: {
      shell: "from-[#00B0FF]/30 via-[#00B0FF]/10 to-white/[0.03]",
      border: "border-[#00B0FF]/25",
      glow: "shadow-[0_0_45px_rgba(0,176,255,0.18)]",
      text: "text-[#48c7ff]",
      soft: "bg-[#00B0FF]/10",
    },
    green: {
      shell: "from-hcpro/30 via-hcpro/10 to-white/[0.03]",
      border: "border-hcpro/25",
      glow: "shadow-[0_0_45px_rgba(59,231,176,0.16)]",
      text: "text-hcpro",
      soft: "bg-hcpro/10",
    },
    purple: {
      shell: "from-engage/30 via-engage/10 to-white/[0.03]",
      border: "border-engage/25",
      glow: "shadow-[0_0_45px_rgba(182,125,255,0.18)]",
      text: "text-engage",
      soft: "bg-engage/10",
    },
  }[tone];

  return (
    <div className={`relative flex h-24 w-24 items-center justify-center rounded-[1.75rem] border bg-gradient-to-br ${toneClasses.shell} ${toneClasses.border} ${toneClasses.glow}`}>
      <div className={`absolute inset-[10px] rounded-[1.35rem] border border-white/10 ${toneClasses.soft}`} />
      <div className={`absolute inset-0 rounded-[1.75rem] bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.14),transparent_35%)]`} />
      <div className={`relative ${toneClasses.text}`}>
        {kind === "command" ? <CommandGlyph /> : null}
        {kind === "implementation" ? <ImplementationGlyph /> : null}
        {kind === "product" ? <ProductGlyph /> : null}
      </div>
    </div>
  );
}

function CommandGlyph() {
  return (
    <div className="relative h-12 w-12">
      <div className="absolute inset-0 rounded-2xl border border-current/20 opacity-50" />
      <div className="absolute left-1 top-1 h-3.5 w-3.5 rounded-[0.35rem] border-2 border-current bg-current/10" />
      <div className="absolute right-1 top-1 h-3.5 w-3.5 rounded-[0.35rem] border-2 border-current bg-current/10" />
      <div className="absolute bottom-1 left-1 h-3.5 w-3.5 rounded-[0.35rem] border-2 border-current bg-current/10" />
      <div className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-[0.35rem] border-2 border-current bg-current/10" />
      <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-current/40 bg-current/10" />
      <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
    </div>
  );
}

function ImplementationGlyph() {
  return (
    <div className="relative h-12 w-12">
      <div className="absolute left-2 top-1 h-10 w-8 rounded-xl border-2 border-current bg-current/10" />
      <div className="absolute left-4 top-4 h-1.5 w-4 rounded-full bg-current" />
      <div className="absolute left-4 top-8 h-1.5 w-4 rounded-full bg-current/80" />
      <div className="absolute right-0 top-2 h-8 w-2 rounded-full bg-current/20" />
      <div className="absolute right-1 top-0 h-3 w-6 rounded-full border border-current/60 bg-current/10" />
      <div className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-current shadow-[0_0_14px_currentColor]" />
    </div>
  );
}

function ProductGlyph() {
  return (
    <div className="relative h-12 w-12">
      <div className="absolute left-1 top-2 h-8 w-10 rounded-xl border-2 border-current bg-current/10" />
      <div className="absolute left-4 top-5 h-8 w-8 rounded-xl border-2 border-current/70 bg-transparent" />
      <div className="absolute left-6 top-7 h-2.5 w-2.5 rounded-full bg-current" />
      <div className="absolute left-10 top-6 h-4 w-1 rounded-full bg-current/70" />
      <div className="absolute left-10 top-10 h-6 w-1 rounded-full bg-current/50" />
    </div>
  );
}
