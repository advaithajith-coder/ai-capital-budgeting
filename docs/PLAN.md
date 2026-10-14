# Implementation plan

## Delivered MVP

- Executive portfolio with five automation examples: aggregated NPV (with risk-adjusted value), payback, ROI on total costs, initial capital and Year-1 funding request.
- Project comparison with inclusion controls, baseline quality, risk-adjusted NPV and action recommendations with cautions.
- Funding plan by year: one-time costs, running costs, total spend, estimated benefits and total cost of ownership.
- Questionnaire for new automations: four core steps (idea, costs, estimated benefits with rollout, review) and four optional detail steps opened from Review (usage & capacity, tech team, readiness, evidence), with a live preview; nothing is inherited from an example and skipped detail is flagged, not guessed.
- Live business case editor for complete costs, four-part value model, delivery assumptions, unit economics, readiness, compliance, team needs and a reasoned probability override.
- Base/downside/upside cases, interactive benefit, cost and delay controls, and a project or portfolio scope selector with scenario comparison.
- Break-even ("what has to be true"), two-variable sensitivity matrix and one-at-a-time sensitivity outputs.
- Project-specific probability of success from stage, delivery risks, sponsor engagement and missing approvals; risk-adjusted NPV.
- Shared IT costs by category with an allocation basis per category, split by department and charged to each project.
- Shared tech team by role: allocation, bench, moves, staffing-driven delivery time and cost, and a year-1 cost reconciliation.
- Evidence and health: adoption, data pipeline, sponsor, accuracy, team staffing and compute vs budget; KPI progress and evidence-adjusted NPV; readiness and compliance scorecard.
- Cash-flow audit with two explicit ROI bases, discounted payback and reference ratio payback.
- Add, duplicate and remove investments; browser storage with migration of older saves; Excel export with live formulas mirroring the model (JSON export kept).
- Responsive executive UI, financial and portfolio tests, and architecture/design/metric documentation.

## Phase 2 Company workflow

Create tenant accounts and permissions. Add company-specific currency, fiscal calendar, hurdle rates and governance policies. Persist project versions centrally with evidence attachments, an approval workflow and scenario snapshots. Add actual vs forecast entries and measured benefit reconciliation. Exit criterion: two analysts and a CFO can review the same version and every change is attributable to its author.

## Phase 3 Stronger capital allocation

Add working capital, tax, depreciation, terminal value and recurring replacement spend. Extend usage-driven inference costs to tokens per request × model unit price, and add human review rates and exception handling. Add project dependencies, duplicate-benefit checks, one-time platform investment with reuse economics, and constrained investment budgets with ranking. Exit criterion: portfolio decisions remain traceable to a reconciled benefit/cost ledger and auditable cash schedule.

## Phase 4 Connected decision assistance

Connect finance, cloud billing, process telemetry and adoption sources through explicit company authorization. Add monthly budget alerts and health trends. Add optional evidence-grounded executive narratives and suggested interventions. Evaluate narratives for numerical accuracy, evidence citations and missing-baseline behavior. Exit criterion: every numerical claim links to a calculation version and evidence source; no model commits capital autonomously.

## Acceptance criteria

Changing an assumption updates project and portfolio outputs immediately. Projects can be added, compared, excluded and exported. Financial values agree with independent known cases. Lost or invalid storage does not crash the app, and older saves keep their edits. Partial baseline evidence produces an intervention recommendation for launched projects. Unrecovered payback and undefined IRR are explicit. Forecasts and capacity proxies never appear as verified savings. Moving people changes delivery time and cost, and the team's whole cost stays visible.

## Intentional MVP boundaries

Local browser data, USD, before-tax nominal estimates, independent projects, editable but simple policy thresholds, no LLM calls and no connected live company telemetry. “Live” currently means interactive recalculation of changed assumptions.
