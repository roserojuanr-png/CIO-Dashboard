interface WestCxLogoProps {
  className?: string;
  compact?: boolean;
}

export function WestCxLogo({ className = "", compact = false }: WestCxLogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className="relative flex items-center rounded-2xl bg-[#232b80] px-4 py-3 shadow-neon">
        <span className="font-display text-3xl font-bold leading-none tracking-tight text-white">
          west<span className="text-[#6CDB63]">cx</span>
        </span>
        <span className="ml-3 h-[70px] w-[44px] border-b-[5px] border-r-[5px] border-t-[5px] border-[#6CDB63]" />
      </div>
      {!compact ? <span className="text-xs uppercase tracking-[0.35em] text-[#00B0FF]">WestCX</span> : null}
    </div>
  );
}
