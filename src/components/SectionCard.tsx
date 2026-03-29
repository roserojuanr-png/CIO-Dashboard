import type { PropsWithChildren, ReactNode } from "react";

interface SectionCardProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionCard({ title, subtitle, action, className = "", children }: SectionCardProps) {
  return (
    <section
      className={`panel-shell rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(12,19,38,0.9),rgba(8,13,27,0.94))] bg-cinematic p-5 shadow-portal backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/20 ${className}`}
    >
      <div className="mb-5 flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-lg font-semibold tracking-wide text-white">{title}</p>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
