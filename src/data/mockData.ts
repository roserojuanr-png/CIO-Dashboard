import type { DashboardRecord } from "@/types";

const months = [
  "2025-04-01",
  "2025-05-01",
  "2025-06-01",
  "2025-07-01",
  "2025-08-01",
  "2025-09-01",
  "2025-10-01",
  "2025-11-01",
  "2025-12-01",
  "2026-01-01",
  "2026-02-01",
  "2026-03-01",
];

const hcproAvailability = [99.72, 99.81, 99.76, 99.84, 99.89, 99.91, 99.87, 99.9, 99.92, 99.94, 99.93, 99.95];
const orchestrateAvailability = [99.35, 99.42, 99.47, 99.53, 99.61, 99.65, 99.72, 99.76, 99.81, 99.84, 99.88, 99.9];
const engageAvailability = [99.12, 99.24, 99.31, 99.39, 99.48, 99.53, 99.61, 99.68, 99.72, 99.77, 99.8, 99.83];

export const mockRecords: DashboardRecord[] = months.flatMap((date, index) => [
  {
    date,
    platform: "HCPRO",
    availability_percent: hcproAvailability[index],
    sms_transactions: 780000 + index * 26000,
    voice_transactions: 420000 + index * 15000,
    critical_open_vulnerabilities: index < 6 ? 2 : index < 10 ? 1 : 0,
    cloud_total_cost: 142000 + index * 4200,
    source: "mock",
  },
  {
    date,
    platform: "Orchestrate",
    availability_percent: orchestrateAvailability[index],
    sms_transactions: 540000 + index * 34000,
    voice_transactions: 160000 + index * 12000,
    critical_open_vulnerabilities: index < 4 ? 3 : index < 8 ? 2 : 1,
    cloud_total_cost: 98000 + index * 3900,
    source: "mock",
  },
  {
    date,
    platform: "Engage",
    availability_percent: engageAvailability[index],
    sms_transactions: 410000 + index * 21000,
    voice_transactions: index < 7 ? null : 62000 + (index - 6) * 9000,
    critical_open_vulnerabilities: index < 3 ? 4 : index < 7 ? 2 : 1,
    cloud_total_cost: 76000 + index * 3100,
    source: "mock",
  },
]);
