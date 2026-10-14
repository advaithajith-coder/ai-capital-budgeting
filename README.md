# AI Capital

An executive decision workspace for deciding which AI automation projects deserve money, people and continued support, and for checking whether funded projects are actually paying off. It models monthly cash flows for each project and the whole portfolio, and makes every assumption and formula visible.

Five editable illustrative projects use the reference's AI value, evidence and health framework.

## Why it matters

### For the CFO: put capital where the evidence is strongest

- **One consistent business case for every project.** NPV, payback, ROI and IRR all come from the same monthly cash model, discount rate and horizon, so a $200K copilot and a $1.5M platform can be compared fairly.
- **Know what you are committing.** Year-1 funding request (setup + first-year running costs), a funding plan by year, and total cost of ownership, kept separate from the return calculations so nothing is counted twice.
- **Inflated claims are filtered out.** Recovered hours are kept apart from real cash savings, only the cash share of indirect gains counts, and full running costs (compute, maintenance, oversight, internal team) are always included.
- **Risk is priced in.** Each project has its own probability of success, based on stage, delivery risks, sponsor engagement and missing approvals. Risk-adjusted NPV counts failure as losing the capital plus delivery spend. Overrides need a written reason.
- **Forecast vs evidence.** Evidence-adjusted NPV scales estimated benefits by the progress actually measured on each project's business KPI, so you can see how much of the forecast is backed by results.
- **What has to be true.** Break-even shows how far estimated benefits can fall, how far costs can rise and what adoption is needed before NPV reaches zero, alongside downside/upside scenarios and sensitivity tables.
- **Defensible decisions.** Rule-based Validate / Scale / Continue / Rework / Intervene recommendations, with cautions when value is not backed by risk or evidence. Every formula is on the Methodology page, and assumptions and results export to JSON.

### For the CTO: put people and platforms where they create value

- **The shared tech team as a real constraint.** A 25-person team by role (ML, data, software, MLOps & platform). Move people between projects and see the effect on delivery time, cost and NPV immediately.
- **Staffing drives timing.** Understaffing slows delivery in proportion, a missing role stalls a project, and extra people speed it up with diminishing returns. Bench and idle cost are shown, so the whole team's cost is accounted for.
- **Usage-based cost.** Cost per transaction × volume follows real adoption and ramp, with steady-state unit economics (cost, benefit and net per unit), since AI running costs grow with use.
- **Compute cost control.** Compute vs approved budget is a health signal, with the overrun's cost over the horizon.
- **Delivery readiness and compliance.** Data readiness, integration, vendor dependency and team capacity (set from actual staffing), plus security, legal and privacy, and model-risk approvals. A pilot or production project missing a required approval is flagged for intervention.
- **Operational health.** Adoption, data pipeline, model accuracy and trend, sponsor engagement, team staffing and compute, with escalation rules.
- **A shared language with finance.** Technical risks feed the same probability, cost and timing that finance uses, so engineering trade-offs show up as dollars and months.

## Run it

Run `npm start` and open http://127.0.0.1:4173. Run `npm test` for the financial and portfolio checks. No install step is needed.

Read [architecture](docs/ARCHITECTURE.md), [implementation plan](docs/PLAN.md), [design](docs/DESIGN.md), [metrics and reference mapping](docs/METRICS.md), and [agent instructions](claude.md).

## Scope

Data is saved in the current browser only. Figures are illustrative, nominal and before tax; projects are assumed independent. Live changes mean immediate assumption recalculation. Company accounts, shared storage, approval workflows, actual-vs-forecast tracking, telemetry integrations and a language-model agent are later phases.
