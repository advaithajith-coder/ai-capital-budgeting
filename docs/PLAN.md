# Implementation plan

## Delivered MVP

- Executive portfolio with five automation examples, aggregated NPV, capital, IRR and payback.
- Project comparison with inclusion controls, baseline quality and action recommendations.
- Live business case editor for complete costs, four-part value model and delivery assumptions.
- Base/downside/upside cases plus interactive benefit, cost and delay controls.
- Two-variable sensitivity matrix and one-at-a-time sensitivity outputs.
- Evidence and portfolio health including adoption, data pipeline, sponsor, accuracy and compute variance.
- Cash-flow audit with two explicit ROI bases, discounted payback and reference ratio payback.
- Add, duplicate and remove investments, browser storage and JSON export.
- Responsive executive UI, financial tests and architecture/design/metric documentation.

## Phase 2 Company workflow

Create tenant accounts and permissions. Add company-specific currency, fiscal calendar, hurdle rates and governance policies. Persist project versions centrally with evidence attachments, an approval workflow and scenario snapshots. Add actual vs forecast entries and measured benefit reconciliation. Exit criterion: two analysts and a CFO can review the same version and every change is attributable to its author.

## Phase 3 Stronger capital allocation

Add working capital, tax, depreciation, terminal value and recurring replacement spend. Support usage-driven inference costs (volume × tokens/request × model unit price), human review rates and exception handling. Add project dependencies, duplicate-benefit checks, shared infrastructure allocation, constrained investment budgets and risk scenarios. Exit criterion: portfolio decisions remain traceable to a reconciled benefit/cost ledger and auditable cash schedule.

## Phase 4 Connected decision assistance

Connect finance, cloud billing, process telemetry and adoption sources through explicit company authorization. Add monthly budget alerts and health trends. Add optional evidence-grounded executive narratives and suggested interventions. Evaluate narratives for numerical accuracy, evidence citations and missing-baseline behavior. Exit criterion: every numerical claim links to a calculation version and evidence source; no model commits capital autonomously.

## Acceptance criteria

Changing an assumption updates project and portfolio outputs immediately. Projects can be added, compared, excluded and exported. Financial values agree with independent known cases. Lost or invalid storage does not crash the app. Partial baseline evidence produces an intervention recommendation. Unrecovered payback and undefined IRR are explicit. Forecasts and capacity proxies never appear as verified savings.

## Intentional MVP boundaries

Local browser data, USD, before-tax nominal estimates, independent projects, fixed policy thresholds, no LLM calls and no connected live company telemetry. “Live” currently means interactive recalculation of changed assumptions.
