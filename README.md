# WestCX CIO Dashboard

Single-page React + TypeScript dashboard for WestCX executive operations reporting.

## Run locally

```bash
npm install
npm run dev
```

## Supported file formats

The portal supports a single workbook or multiple files:

- Root / Command Center metrics
- `IMPLEMENTATIONS` tab for delivery tracking
- `PRODUCT` tab for commercialization analytics

Unified format:

```csv
date,platform,availability_percent,sms_transactions,voice_transactions,critical_open_vulnerabilities,cloud_total_cost
```

Metric-specific format:

```csv
date,platform,metric_type,value
```

Implementation status format:

```csv
implementation_id,client_name,product_name,owner,status,risk_level,risk_reason,sold_quarter,contract_signed_date,planned_go_live_date,actual_go_live_date,revenue_start_date,not_live_reason,customer_scope_sign_off
```

## Upload behavior

- Upload one or many CSV or XLSX files through drag-and-drop or the file picker.
- XLSX workbooks are read across every tab automatically.
- Tabs named `IMPLEMENTATIONS` and `PRODUCT` are routed into their dedicated portal pages when their columns match the supported schemas.
- Similar field names are mapped into the supported internal schema.
- Dates are normalized into monthly buckets and sorted chronologically.
- Platform names are normalized to `HCPRO`, `Orchestrate`, and `Engage`.
- Duplicate month/platform rows are aggregated.
- Availability values are averaged.
- SMS, Voice, Vulnerabilities, and Cost values are summed.
- Tabs or files matching the implementation schema populate the `Implementation Status` page.
- Empty files, malformed rows, and missing required columns produce validation messages.

## Notes

- The app includes mock data, so it renders immediately before uploads.
- Example CSV files are included in [`public/examples/unified-sample.csv`](/Users/alejo/Documents/CODEX-2026/CIO-Dashboard/public/examples/unified-sample.csv) and [`public/examples/metric-sample.csv`](/Users/alejo/Documents/CODEX-2026/CIO-Dashboard/public/examples/metric-sample.csv).
- The landing page is `WestCX Dashboard – Executive Portal` with navigation to `Command Center`, `CIO Implementations View`, and `Product Commercialization Dashboard`.
