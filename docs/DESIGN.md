# Design

## Audience and decision

The primary user is a C-level capital allocator asking where AI investment creates defensible value, which projects deserve additional capital, and which need intervention. The overview answers those questions with four portfolio totals, a cumulative cash chart, a capital efficiency view, and a comparable project table.

## Visual system

Use a quiet light workspace with a white navigation rail, pale gray content canvas, restrained blue interaction accents, and green/amber/red semantic signals. Manrope headings and DM Sans body text use system sans-serif fallbacks. Tokens are in `dist/style.css`: background `#f6f7f9`, text `#1b2535`, border `#e5e9ee`, primary `#315de8`, positive `#198568`, watch `#b87924`, negative `#c65656`. No imagery is needed for an analytical decision workspace.

Cards carry metrics or charts. Financial tables remain horizontally scrollable on narrow screens. Project editing opens a side panel so the executive keeps the portfolio context. Forms group upfront/operating costs, benefits/delivery, and evidence/health. Scenario sliders show exact numeric values and immediately update outputs.

## Information hierarchy

1. Portfolio overview: value, initial capital, annualized IRR, payback, cash journey, capital efficiency and per-project decision.
2. Scenario lab: portfolio stress assumptions, capacity policy, benefit/cost sensitivity and marginal drivers.
3. Evidence and health: baseline/current metrics, evidence caveats, four early indicators and cost drift.
4. Methodology: formulas, timing, policy rules and scope limitations.

## Interaction and accessibility

Use native buttons, numeric inputs, labeled sliders, checkboxes and a native modal for creation. Respect reduced motion and visible keyboard focus. Every SVG chart has a descriptive label; points include numeric tooltips and the portfolio table provides financial values in text. Status badges include words rather than relying solely on colors. Editor closes with Escape and returns focus to its project trigger. Confirm destructive remove/reset actions. Empty searches and all-excluded portfolios remain usable.

## Decision copy

Use “modeled”, “forecast” and “illustrative” wherever confidence could be mistaken for actual results. Explain capacity inclusion near its control. Label ROI denominator and annualized IRR. Use “Beyond horizon” when recovery has not occurred. Recommendations are “Scale”, “Continue”, “Intervene”, or “Rework”, with evidence and financial rules explained in Methodology.

## Component sourcing

The workspace was empty. The 21st catalog search was attempted but could not reach the npm registry in this environment, so the app uses original dependency-free components and documented tokens. No external component code was retrieved. Browser font availability does not affect functionality.
