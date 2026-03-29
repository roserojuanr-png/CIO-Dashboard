import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import type { KPIStat } from "@/types";

const accentClasses: Record<string, string> = {
  hcpro: "from-hcpro/25 to-hcpro/5 text-hcpro",
  orchestrate: "from-orchestrate/25 to-orchestrate/5 text-orchestrate",
  engage: "from-engage/25 to-engage/5 text-engage",
  amber: "from-amber/25 to-amber/5 text-amber",
  danger: "from-danger/25 to-danger/5 text-danger",
};

export function KpiCard({ label, value, delta, deltaDirection = "neutral", accent = "orchestrate" }: KPIStat) {
  const Icon = deltaDirection === "up" ? ArrowUpRight : deltaDirection === "down" ? ArrowDownRight : ArrowRight;
  const glyph = resolveKpiGlyph(label, accent);

  return (
    <article
      className={`panel-shell group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${
        accentClasses[accent] ?? accentClasses.orchestrate
      } p-[1px] shadow-portal transition duration-300 hover:-translate-y-1.5`}
    >
      <div className="rounded-[calc(1.5rem-1px)] bg-[linear-gradient(180deg,rgba(11,18,36,0.97),rgba(16,23,45,0.92))] p-5 backdrop-blur-xl">
        <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="absolute -right-10 top-6 h-28 w-28 rounded-full bg-white/5 blur-2xl" />
        <div className="mb-6 flex items-start justify-between gap-4">
          <span className="text-sm font-medium uppercase tracking-[0.18em] text-muted">{label}</span>
          <div className="relative flex h-14 w-14 items-center justify-center rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] shadow-neon">
            <div className="absolute inset-[6px] rounded-[0.95rem] border border-white/8 bg-white/[0.02]" />
            <div className="absolute inset-0 rounded-[1.15rem] bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.12),transparent_42%)]" />
            <div className="relative">{glyph}</div>
          </div>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">{value}</p>
            {delta ? (
              <p className="mt-2 inline-flex items-center gap-1 text-sm text-slate-200">
                <Icon className="h-4 w-4" />
                {delta} vs prior month
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted">Latest operational snapshot</p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function resolveKpiGlyph(label: string, accent: string) {
  const tone =
    accent === "hcpro"
      ? "text-hcpro"
      : accent === "engage"
        ? "text-engage"
        : accent === "amber"
          ? "text-amber"
          : accent === "danger"
            ? "text-danger"
            : "text-orchestrate";
  const normalized = label.toLowerCase();

  if (normalized.includes("services/products launched")) {
    return <LaunchGlyph className={tone} />;
  }
  if (normalized.includes("pipeline")) {
    return <PipelineGlyph className={tone} />;
  }
  if (normalized.includes("commercialization")) {
    return <TargetGlyph className={tone} />;
  }
  if (normalized.includes("availability")) {
    return <OrbitGlyph className={tone} />;
  }
  if (normalized.includes("cost")) {
    return <StackGlyph className={tone} />;
  }
  if (normalized.includes("critical")) {
    return <ShieldGlyph className={tone} />;
  }

  return <OrbitGlyph className={tone} />;
}

function LaunchGlyph({ className }: { className: string }) {
  return (
    <div className={`relative h-8 w-8 ${className}`}>
      <div className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 rotate-45 rounded-[0.35rem] border-2 border-current bg-current/10" />
      <div className="absolute left-1/2 top-3 h-3.5 w-[2px] -translate-x-1/2 bg-current" />
      <div className="absolute bottom-[5px] left-1/2 h-[2px] w-5 -translate-x-1/2 rounded-full bg-current" />
      <div className="absolute bottom-0 left-[7px] h-2.5 w-2.5 rounded-full border border-current/70" />
      <div className="absolute bottom-0 right-[7px] h-2.5 w-2.5 rounded-full border border-current/70" />
    </div>
  );
}

function PipelineGlyph({ className }: { className: string }) {
  return (
    <div className={`relative h-8 w-8 ${className}`}>
      <div className="absolute left-0 top-1 h-2.5 w-2.5 rounded-full border-2 border-current bg-current/10" />
      <div className="absolute left-[11px] top-1 h-2.5 w-2.5 rounded-full border-2 border-current bg-current/10" />
      <div className="absolute right-0 top-1 h-2.5 w-2.5 rounded-full border-2 border-current bg-current/10" />
      <div className="absolute left-[5px] top-[13px] h-[2px] w-[18px] rounded-full bg-current" />
      <div className="absolute left-1/2 top-[13px] h-4 w-[2px] -translate-x-1/2 rounded-full bg-current" />
      <div className="absolute bottom-0 left-1/2 h-3 w-3 -translate-x-1/2 rounded-[0.45rem] border-2 border-current bg-current/10" />
    </div>
  );
}

function TargetGlyph({ className }: { className: string }) {
  return (
    <div className={`relative h-8 w-8 ${className}`}>
      <div className="absolute inset-0 rounded-full border-2 border-current/45" />
      <div className="absolute inset-[6px] rounded-full border-2 border-current/70" />
      <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current shadow-[0_0_16px_currentColor]" />
      <div className="absolute right-0 top-[6px] h-[2px] w-4 -rotate-45 rounded-full bg-current" />
      <div className="absolute right-[2px] top-[5px] h-0 w-0 border-b-[4px] border-l-[7px] border-t-[4px] border-b-transparent border-l-current border-t-transparent" />
    </div>
  );
}

function OrbitGlyph({ className }: { className: string }) {
  return (
    <div className={`relative h-8 w-8 ${className}`}>
      <div className="absolute inset-[6px] rounded-full border-2 border-current bg-current/10" />
      <div className="absolute inset-0 rounded-full border border-current/40" />
      <div className="absolute left-[2px] top-1/2 h-[2px] w-6 -translate-y-1/2 rotate-[25deg] rounded-full bg-current/80" />
      <div className="absolute right-[2px] top-[7px] h-2.5 w-2.5 rounded-full bg-current shadow-[0_0_16px_currentColor]" />
    </div>
  );
}

function StackGlyph({ className }: { className: string }) {
  return (
    <div className={`relative h-8 w-8 ${className}`}>
      <div className="absolute left-1 top-[4px] h-3.5 w-6 rounded-[0.45rem] border-2 border-current bg-current/10" />
      <div className="absolute left-[4px] top-[11px] h-3.5 w-6 rounded-[0.45rem] border-2 border-current bg-current/10" />
      <div className="absolute left-[7px] top-[18px] h-3.5 w-6 rounded-[0.45rem] border-2 border-current bg-current/10" />
    </div>
  );
}

function ShieldGlyph({ className }: { className: string }) {
  return (
    <div className={`relative h-8 w-8 ${className}`}>
      <div className="absolute left-1/2 top-[2px] h-6 w-5 -translate-x-1/2 rounded-b-[0.7rem] rounded-t-[0.4rem] border-2 border-current bg-current/10 [clip-path:polygon(50%_0%,100%_14%,100%_62%,50%_100%,0%_62%,0%_14%)]" />
      <div className="absolute left-1/2 top-[9px] h-[2px] w-3 -translate-x-1/2 rounded-full bg-current" />
      <div className="absolute left-1/2 top-[9px] h-3 w-[2px] -translate-x-1/2 rounded-full bg-current" />
    </div>
  );
}
