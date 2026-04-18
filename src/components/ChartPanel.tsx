import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MetricKey, Platform } from "@/types";
import { PLATFORM_COLORS, PLATFORM_ORDER } from "@/utils/dashboardData";
import { formatCompactCurrency, formatCurrency, formatMonth, formatPercent } from "@/utils/formatters";

interface ChartPanelProps {
  data: Array<Record<string, string | number | null>>;
  metric: MetricKey;
  chartType?: "line" | "bar" | "composed";
  percentAxis?: boolean;
  currencyAxis?: boolean;
  highlightPlatform: Platform | null;
  riskMode?: boolean;
  thresholdLine?: number;
}

function tooltipFormatter(value: number, name: string, metric: MetricKey) {
  if (metric === "availability_percent") {
    return [formatPercent(value), name];
  }
  if (metric === "cloud_total_cost") {
    return [formatCurrency(value), name];
  }
  return [new Intl.NumberFormat("en-US").format(value), name];
}

function resolveOpacity(platform: Platform, highlightPlatform: Platform | null): number {
  if (!highlightPlatform) {
    return 1;
  }
  return highlightPlatform === platform ? 1 : 0.2;
}

export function ChartPanel({
  data,
  metric,
  chartType = "line",
  percentAxis = false,
  currencyAxis = false,
  highlightPlatform,
  riskMode = false,
  thresholdLine,
}: ChartPanelProps) {
  const activePlatforms = PLATFORM_ORDER.filter((platform) =>
    data.some((entry) => entry[platform] !== null && entry[platform] !== undefined),
  );

  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 10, left: -18, bottom: 0 }}>
          <defs>
            {PLATFORM_ORDER.map((platform) => (
              <linearGradient id={`gradient-${platform}`} x1="0" x2="0" y1="0" y2="1" key={platform}>
                <stop offset="0%" stopColor={PLATFORM_COLORS[platform]} stopOpacity={0.35} />
                <stop offset="100%" stopColor={PLATFORM_COLORS[platform]} stopOpacity={0.03} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={(value) => formatMonth(String(value))}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#8ba0c7", fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#8ba0c7", fontSize: 12 }}
            tickFormatter={(value) => {
              if (currencyAxis) return formatCompactCurrency(Number(value));
              if (percentAxis) return `${value}%`;
              return new Intl.NumberFormat("en-US", { notation: "compact" }).format(Number(value));
            }}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(10, 14, 28, 0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 18,
              boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
            }}
            labelFormatter={(label) => formatMonth(String(label))}
            formatter={(value: number, name: string) => tooltipFormatter(value, name, metric)}
          />
          <Legend />

          {thresholdLine !== undefined ? (
            <Line
              key="threshold"
              dataKey={() => thresholdLine}
              dot={false}
              stroke="rgba(255,255,255,0.35)"
              strokeDasharray="5 5"
              strokeWidth={1}
              legendType="none"
              isAnimationActive={false}
            />
          ) : null}

          {chartType === "composed"
            ? activePlatforms.map((platform) => {
                const opacity = resolveOpacity(platform, highlightPlatform);
                const stroke = PLATFORM_COLORS[platform];

                return (
                  <Bar
                    key={`${platform}-bar`}
                    dataKey={platform}
                    name={platform}
                    fill={`url(#gradient-${platform})`}
                    stroke={stroke}
                    strokeWidth={1}
                    radius={[10, 10, 0, 0]}
                    fillOpacity={opacity}
                    barSize={28}
                  />
                );
              })
            : null}

          {chartType === "composed"
            ? activePlatforms.map((platform) => {
                const opacity = resolveOpacity(platform, highlightPlatform);
                const stroke = PLATFORM_COLORS[platform];

                return (
                  <Line
                    key={`${platform}-line`}
                    type="monotone"
                    dataKey={platform}
                    name={`${platform} Trend`}
                    stroke={stroke}
                    strokeWidth={2}
                    dot={{ r: 2, fill: stroke }}
                    activeDot={{ r: 5 }}
                    opacity={opacity}
                    legendType="none"
                  />
                );
              })
            : null}

          {chartType !== "composed"
            ? PLATFORM_ORDER.map((platform) => {
            const opacity = resolveOpacity(platform, highlightPlatform);
            const stroke = PLATFORM_COLORS[platform];
            if (chartType === "bar") {
              return (
                <Bar
                  key={platform}
                  dataKey={platform}
                  name={platform}
                  fill={stroke}
                  radius={[10, 10, 0, 0]}
                  fillOpacity={opacity}
                />
              );
            }

            return (
              <Line
                key={platform}
                type="monotone"
                dataKey={platform}
                name={platform}
                stroke={stroke}
                strokeWidth={3}
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
                opacity={opacity}
              />
            );
          })
            : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
