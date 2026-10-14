# Design

## Audience and decision

The primary user is a C-level capital allocator asking where AI investment creates defensible value, which projects deserve additional capital, and which need intervention. The overview answers those questions with four portfolio totals, a cumulative cash chart, a capital efficiency view, a comparable project table and a funding plan by year.

## Visual system

Use a quiet light workspace with a white navigation rail, pale gray content canvas, restrained blue interaction accents, and green/amber/red semantic signals. Manrope headings and DM Sans body text use system sans-serif fallbacks. Tokens are in `dist/style.css`: background `#f6f7f9`, text `#1b2535`, border `#e5e9ee`, primary `#315de8`, positive `#198568`, watch `#b87924`, negative `#c65656`. No imagery is needed for an analytical decision workspace.

Cards carry metrics or charts. Financial tables remain horizontally scrollable on narrow screens. Project editing opens a side panel so the executive keeps the portfolio context. Forms group upfront/operating costs, estimated benefits/delivery, tech team, usage and unit economics, readiness and compliance, and evidence/health. New investments are created through a stepped questionnaire with a live preview and a review step. Scenario sliders show exact numeric values and immediately update outputs.

## Information hierarchy

1. Portfolio overview: NPV with risk-adjusted value, payback, ROI, initial capital and Year-1 funding; cash journey, capital efficiency, per-project decision and funding plan. IRR is secondary.
2. Scenario lab: portfolio or single-project scope, stress assumptions, capacity and probability policy, what has to be true, scenario comparison and sensitivity.
3. Tech team: role pools, allocation by project, moves, staffing effects and team cost reconciliation.
4. Evidence and health: forecast vs evidence-adjusted value, KPI progress, early indicators, readiness, compliance and compute overrun.
5. Methodology: formulas, timing, policy rules and scope limitations.

## Interaction and accessibility

Use native buttons, numeric inputs, labeled sliders, checkboxes and a native modal for the creation questionnaire. Invalid numbers are outlined with a message and the last valid value is kept. Respect reduced motion and visible keyboard focus. Every SVG chart has a descriptive label; points include numeric tooltips and the portfolio table provides financial values in text. Status badges include words rather than relying solely on colors. Editor closes with Escape and returns focus to its project trigger. Confirm destructive remove/reset actions. Empty searches and all-excluded portfolios remain usable.

## Decision copy

Use “modeled”, “forecast” and “illustrative” wherever confidence could be mistaken for actual results. Explain capacity inclusion near its control. Label ROI denominator and annualized IRR. Use “Beyond horizon” when recovery has not occurred; paybacks of two years or more read in years. Recommendations are “Validate” (ideas), “Scale”, “Continue”, “Intervene”, or “Rework”, with a caution mark when risk- or evidence-adjusted value does not support a positive NPV, and rules explained in Methodology.

## Component sourcing

The app uses original dependency-free components and the documented tokens above; no external component code is used. Browser font availability does not affect functionality.
