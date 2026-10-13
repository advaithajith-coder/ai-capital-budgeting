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
