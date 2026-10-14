# Metrics and reference mapping

The reference is `C:\Users\advai\Downloads\Measure and demonstrate AI business value (1).docx`. It is educational scenario content. Examples derived from it remain illustrative, with additional assumptions explicitly editable.

| Reference concept | Application treatment |
| --- | --- |
| Direct savings | Separate annual input for reduced/avoided expenses |
| Indirect gains | Annual amount and explicit cash-qualified share |
| Hidden costs | Data preparation, training, compute, storage, maintenance, oversight |
| Productivity gains | Hours × loaded rate × realization, separately reported, optional inclusion |
| Tangible vs intangible | Financial proxy qualification and evidence notes; unquantified value is excluded |
| Before/after baseline | KPI, baseline value, observed value, target, unit, and baseline quality |
| CFO framing | NPV, IRR, ROI, payback, initial capital and evidence quality |
| Workforce framing | Recovered hours and capacity realization in project details |
| CIO framing | Adoption, pipeline, sponsor and accuracy health |
| Leading vs lagging | Operational observations and early signals shown separately from forecast returns |
| Cost controls | Explicit compute budget/variance, full operating costs and sensitivity |
| Per-initiative call | Rule-based scale/continue/intervene/rework with reassessment conditions |

## Financial definitions

`initial = implementation + data preparation + training`.

`annualOp = compute + storage + maintenance + oversight`.

`capacity = annual hours × loaded hourly cost × realization%`.

`gross = (direct + indirect × cash share% + optional capacity) × scenario benefit factor`.

For month m: `ramp = clamp((m − project delay − scenario delay) / ramp months, 0, 1)`. Benefits equal gross/12 × adoption × ramp × annual benefit growth. Operating costs equal annualOp/12 × scenario cost factor × annual operating growth. Both growth factors step at month 13, 25, etc. Setup is multiplied by scenario cost factor and paid at month zero.

`NPV = − initial + Σ net_m / (1 + annual hurdle)^(m/12)`.

IRR solves the monthly schedule and annualizes `(1 + monthly IRR)^12 − 1`. Reject multiple sign changes to avoid reporting an ambiguous root. Ordinary and discounted payback use cumulative monthly flows and linear interpolation within the crossing month. No terminal recovery value is assumed.

Horizon ROI uses all setup and operating costs in its denominator. Capital ROI uses initial setup alone. The reference's two-year Vision QC example gives 162% using total two-year costs and 203% using Year 1 costs. Those figures use its unadjusted source inputs, whereas the application additionally models adoption, ramp, setup training and storage; application outputs should differ.

## Reference inconsistencies and evidence cautions

The detailed Vision QC solution reports roughly 10 months of phased ratio payback, whereas its capstone says 8 months. Predictive maintenance summaries also use varying payback figures. Preserve the formula and separate conventions instead of adopting those summaries as verified outcomes. The reference's simplified payback includes first-year operating costs in capital deployed while also subtracting annual operating expense from annual benefit; this is shown only as a labeled reference ratio, not the primary monthly cash payback.

Demand forecasting's 61% starting accuracy is provisional because the reference explicitly states no formal prelaunch accuracy baseline. Zero equipment failures across six months does not prove zero annual failure risk. Quality-premium revenue remains excluded until quantified. A recovered-hour proxy requires evidence of productive redeployment and should not overlap direct labor savings.

## Example provenance

Vision QC, demand forecasting and predictive maintenance draw names and selected figures from the supplied reference; training, storage, growth, ramp and cash qualification add demo assumptions. Support metrics are inspired by the reference chatbot case with a new illustrative investment model. Invoice processing is an original illustrative automation. All numbers can be changed.

## External financial convention check

[ACCA Investment appraisal](https://www.accaglobal.com/gb/en/student/exam-support-resources/fundamentals-exams-study-resources/f9/technical-articles/advanced-investment-appraisal.html) describes discounted cash flow NPV/IRR and cash-flow timing. The implementation adapts effective annual discounting to monthly periods and tests it independently against an annuity equation.

## Funding, risk, break-even and delivery metrics

- **Year-1 funding request** = initial capital + first twelve months of scheduled running costs (fixed and usage-based). **Total cost of ownership** = initial capital + all horizon running costs, undiscounted. Both are budgeting figures; NPV, IRR and payback keep one-time costs at month 0 and running costs in the month incurred, so first-year operating cost is never counted twice.
- **Risk-adjusted NPV** = p × NPV − (1 − p) × initial capital. Each project's p = stage start (defaults Idea 30%, Pilot 60%, Production 90%) × 0.80 per high delivery risk × 0.90 per medium risk × 0.85 per missing required approval (pilot and production only), floored at 5%. All factors are editable demo policy, not reference data. Not assessed ratings are neutral (× 1) and flagged; staffing is excluded because it already changes cash flows. A per-project override applies only with a written reason, and the rule-based value stays visible. Portfolio value is the sum. When NPV is below −initial capital, a lower p raises risk-adjusted NPV, because stopping (losing only capital) beats completing a value-destroying project.
- **Break-even** is solved in closed form because NPV is linear in each driver: benefits multiplier = (capital + PV fixed + PV usage costs) ÷ PV benefits; cost headroom = PV benefits ÷ (capital + PV costs) − 1; adoption = adoption × (capital + PV fixed) ÷ (PV benefits − PV usage costs). Tests confirm each value returns NPV to zero.
- **Usage-based cost** = unit cost × annual volume × adoption × ramp × benefit-growth index, charged only once usage begins. Fixed running costs keep their own cost growth. Example volumes are illustrative and example unit costs are zero, so reference compute figures remain fixed costs.
- **Delivery readiness** (data, integration, vendor, team) and **compliance** (security always; legal & privacy for personal data; model risk for high-risk AI) are rule-based. A pilot or production project missing a required approval is Blocked and recommended for intervention; readiness is advisory only.

## Shared tech team

- The team is a pool by role with editable headcount and loaded annual cost (default 25: 8 ML, 7 data, 6 software, 4 MLOps & platform). Projects state build need by role and run-support FTE; allocation is the current assignment, and headcount cannot fall below it.
- **Coverage** = assigned ÷ needed for the weakest role. Time to full benefit (project delay + ramp) × 1 ÷ coverage when short; × max(0.5, 1 ÷ √coverage) when every role is over-staffed; never when a needed role has nobody. Scenario delay is not scaled.
- **Team cost** is charged monthly as a fixed running cost: the whole assigned team until full ramp, then assigned cost × min(1, run FTE ÷ assigned). It flows into NPV, payback, Year-1 funding, break-even and unit economics, and can be switched off (staffing delays still apply). Example cost fields are treated as external and vendor costs to avoid double counting internal people.
- The Tech team page reconciles year-1 cost: charged to projects + bench + idle after build = annual cost of the whole team. Health adds a team staffing signal (build coverage, or run coverage once in production; < 50% red, < 100% yellow).
- Default example allocation leaves 4 people on the bench and Predictive maintenance one ML engineer short, to illustrate the trade-off. Including team cost lowers every example NPV; Customer service and Invoice processing turn negative.

## Linked indicators

- **Team capacity risk** is derived from Tech team staffing when a project has a team need (build coverage, or run coverage in production: < 50% High, < 100% Medium, otherwise Low) and therefore feeds readiness and probability. Without a team need the manual rating applies.
- **Sponsor engagement** multiplies probability of success by 0.90 when limited and 0.75 when missing (editable). It remains a health signal as well; health drives the recommendation, probability drives risk-adjusted NPV.
- **KPI progress** = achieved ÷ targeted improvement from baseline to latest observation, clamped to 0–100%; requires a launched project, a baseline that is not missing, and a target that improves on it. Partial baselines are flagged provisional. **Evidence-adjusted NPV** = NPV − (1 − progress) × PV benefits, i.e. benefits scaled to measured progress, assuming cash moves with the KPI. Shown beside the forecast, never replacing it; projects without measurable progress use the forecast in portfolio totals.
- **Compute vs budget** = compute ÷ approved compute budget − 1. Health signal above 10% (yellow) and 25% (red). Overrun cost = PV of (compute − budget) over the horizon with cost growth and cost multiplier, equal to the NPV recovered by returning to budget. With the examples, Customer service moves to Monitor and AI demand forecasting to Escalate; recommendations are unchanged.
