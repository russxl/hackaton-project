# DeskYield — The Empty Desk Problem

Predicts which **reserved seats will go unused in the next 7 days** and surfaces the
**top 3 revenue recovery actions** — each with a PHP estimate — from the ERP seat-inventory data.

The ERP tells us when a seat is *reserved*. It can't tell us when a reserved seat will go
*unused*, or when a vacant office could have been sold. Every empty desk inside an active
agreement is revenue collected without value delivered; every vacant office is pure lost
opportunity. DeskYield finds both.

---

## 1. The logic — deterministic multi-signal risk score

Each **active agreement line-item** gets a 7-day risk score. Four CRM/ERP signals are each
normalised to `0.0–1.0`, then weighted:

```
Risk = DaysToExpiry·0.40 + SeatGap%·0.30 + LeaseTerm·0.20 + AccountStatus·0.10
```

| Signal | Weight | Normalisation |
|---|---|---|
| **Days to Expiry** | 40% | `1 − days/45` inside a 45-day window; `0` if >45 days, `1` if already expired. Relative to **24 Jun 2026**. |
| **Seat Gap %** | 30% | `(capacity − billable) / capacity` — reserved-but-uncontracted seats. |
| **Lease Term** | 20% | `≤6 months → 1.0` (volatile); otherwise `0.2` (stable). |
| **Account Status** | 10% | `Active 0.1 · Watch 0.6 · At Risk 1.0` (CRM health). |

All logic lives in [`src/lib/engine.ts`](src/lib/engine.ts) — pure, deterministic, testable.

## 2. The output — top 3 recovery actions

1. **Targeted Re-engagement Offers** — active agreements expiring within 45 days → auto-drafted
   rate-lock / term-extension email (simulated Resend integration).
2. **Short-Term Resale Optimization** — vacant rooms + underutilised desks → list on a flexible
   market at a **1.3× premium**.
3. **Operational Broker & Pipeline Alerts** — At-Risk accounts / heavily vacant blocks → fire
   pipeline webhooks to the sales desk (simulated payloads shown in-app).

Each action card previews the exact artifact a live system would send (email body, JSON webhook,
marketplace listing). No external calls are made — integrations are simulated for the demo.

## 3. The revenue — live demo numbers

**Eastbridge Solutions (CLT-004)** — 3 offices in Meridian Business Hub 14F, expiring 31 Jul 2026
(37 days), 6-month lease, **At Risk**:

| Room | Cap | Billable | Gap | Daily Rate | 7-Day Revenue at Risk |
|---|---|---|---|---|---|
| RM-005 | 15 | 10 | 5 | ₱872.73 | ₱30,545.45 |
| RM-006 | 30 | 22 | 8 | ₱863.64 | ₱48,363.64 |
| RM-007 | 10 | 6 | 4 | ₱872.73 | ₱24,436.36 |
| **Total** | 55 | 38 | 17 | — | **₱103,345.45** |

Plus cold vacancy **RM-008** (25 seats, vacant) listed at 1.3× premium for a 7-day sprint:
**₱196,477.27** of weekly workspace yield.

> Daily rate = monthly rate / 22 working days · Revenue at risk = daily × unused seats × 7 ·
> Resale yield = seats × 1.3 × daily × 7.

Numbers are computed live from `src/data/dataset.json` (converted from the provided workbook) —
not hardcoded. They match the judges' benchmark exactly.

---

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4. Risk engine is framework-agnostic pure TS.
Deployable to Vercel as-is.

## Structure

```
src/data/dataset.json     ERP workbook → JSON (25 rooms, 40 agreements, 10 clients)
src/lib/engine.ts         Risk scoring + revenue + action grouping
src/lib/actions.ts        Simulated email / webhook / listing generators
src/lib/service.ts        Service facade shared by REST + MCP (single source of truth)
src/lib/validate.ts       Dataset gatekeeping (zod) for POST / MCP input
src/lib/http.ts           CORS + JSON response helpers
src/lib/format.ts         PHP currency + date helpers
src/components/*           Dashboard UI
src/app/page.tsx           Composition (server component runs the engine)
src/app/api/*              REST endpoints + MCP server
```

## API & MCP

The engine is exposed two ways — both wrap the same pure `analyse()`. Open CORS
(`*`), no auth (demo). `GET` runs the bundled dataset; `POST` runs a supplied one.

### REST

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/api` | Service discovery — lists endpoints + MCP info |
| `GET` | `/api/analysis` | Full analysis over demo data |
| `POST` | `/api/analysis` | Analyse a supplied `Dataset` (JSON body) |
| `GET` | `/api/risk` | Risk items. Filters: `?band=High&client=<id\|name>&limit=N` |
| `POST` | `/api/risk` | Same filters, scored over a posted `Dataset` |
| `GET` | `/api/vacancies` | Cold vacant rooms + 7-day resale yield |
| `GET` | `/api/actions` | Top 3 ranked recovery actions |

`POST` body is a bare `Dataset` — `{ rooms, occupancy, clients, today }`. Invalid
input returns `400` with a list of issues. Risk bands: `Critical \| High \| Medium \| Low`.

```bash
curl http://localhost:3000/api/actions
curl "http://localhost:3000/api/risk?band=High&limit=5"
curl -X POST http://localhost:3000/api/analysis \
  -H 'content-type: application/json' --data @dataset.json
```

### MCP (Model Context Protocol)

Streamable-HTTP endpoint at **`/api/mcp`** (`mcp-handler`, stateless / no Redis).
Add as a remote MCP server in any MCP client.

| Tool | Args | Returns |
|------|------|---------|
| `analyse_dataset` | `dataset?` | Full analysis (demo data if omitted) |
| `get_risk_items` | `band? client? limit?` | Risk-scored agreements |
| `get_recovery_actions` | — | Top 3 ranked actions |
| `build_email_draft` | `id` (occId/roomId/clientId) | Re-engagement email draft |
| `build_resale_listing` | `roomId` | Marketplace resale listing |

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```
