import { calculate, operating, sharedAllocation, sharedDrivers } from './model.js';
import { esc, money, short, axisMoney, niceTicks, pct, duration, pb, irrShort, unitMoney, months } from './format.js';
import {
  scenarioPresets,
  freshState,
  migrateSaved,
  results as projectResults,
  aggregate,
  roleUsage as usageOf,
  moveTeam as move,
  withShares,
} from './portfolio.js';
import { wizardBlank, wizardSteps, coreSteps, detailSteps, buildProject } from './wizard.js';
// Every project calculation includes its share of shared IT costs, allocated across all projects.
const calc = (p, s = state.settings, projects = state.projects) => calculate(p, withShares(projects, s));
const $ = q => document.querySelector(q);
const colors = ['#4265df', '#48a88d', '#9b81d9', '#dda556', '#688ca8'],
  icons = ['◉', '✧', '▤', '⌁', '⚙'];
let state = freshState(),
  storageOK = true,
  selected = null,
  query = '';
try {
  state = migrateSaved(JSON.parse(localStorage.getItem('ai-capital-v1'))) || state;
} catch {
  storageOK = false;
}
function save() {
  try {
    localStorage.setItem('ai-capital-v1', JSON.stringify(state));
  } catch {
    storageOK = false;
  }
  $('#saved').textContent = storageOK ? '● Saved on this browser' : '● Changes kept for this session';
}
function toast(t) {
  $('#toast').textContent = t;
  $('#toast').style.display = 'block';
  setTimeout(() => ($('#toast').style.display = 'none'), 2600);
}
const results = (s = state.settings) => projectResults(state.projects, s);
const portfolio = (s = state.settings) => aggregate(state.projects, state.excluded, s);
const badge = (value, cls) => `<span class="badge ${cls}">${esc(value)}</span>`;
const recBadge = (v, cautions = []) =>
  badge(v, v === 'Scale' ? 'green' : v === 'Continue' || v === 'Validate' ? 'blue' : v === 'Intervene' ? 'amber' : 'red') +
  (cautions.length ? `<span class="caution" title="${esc(cautions.join(' · '))}" aria-label="${esc(cautions.join('. '))}">⚠</span>` : '');
function metrics(a = portfolio(), label = 'Portfolio') {
  if (a.all && !a.all.length)
    return `<div class="metrics">${['NPV', 'payback', 'ROI']
      .map(m => `${label} ${m}`)
      .concat('Initial capital')
      .map(
        t =>
          `<div class="metric"><div class="metric-top">${t}</div><strong>—</strong><small>No automations included</small></div>`,
      )
      .join('')}</div>`;
  const roi = a.cost ? (a.benefit - a.cost) / a.cost : null;
  return `<div class="metrics"><div class="metric"><div class="metric-top">${label} NPV <span class="metric-icon">↗</span></div><strong>${short(a.npv)}</strong><small class="${a.rnpv > 0 ? 'green' : ''}">Risk-adjusted ${short(a.rnpv)} · ${state.settings.years} yrs at ${state.settings.rate}%</small></div><div class="metric"><div class="metric-top">${label} payback <span class="metric-icon">◷</span></div><strong>${a.payback === null ? '—' : a.payback < 24 ? a.payback.toFixed(1) + ' mo' : (a.payback / 12).toFixed(1) + ' yrs'}</strong><small>${a.payback === null ? 'Not reached in selected horizon' : (a.payback < 24 ? '' : Math.round(a.payback) + ' months · ') + 'Undiscounted monthly cash flows'}</small></div><div class="metric"><div class="metric-top">${label} ROI <span class="metric-icon">⌁</span></div><strong>${pct(roi)}</strong><small>Total cost basis · ${state.settings.years}-year horizon</small></div><div class="metric"><div class="metric-top">Initial capital <span class="metric-icon">▣</span></div><strong>${short(a.cap)}</strong><small>Year-1 funding ${short(a.funding)} incl. running costs</small></div></div>`;
}
function cashChart() {
  const a = portfolio();
  let cumulative = a.flows[0],
    pts = [cumulative];
  for (let y = 1; y <= state.settings.years; y++) {
    cumulative += a.flows.slice((y - 1) * 12 + 1, y * 12 + 1).reduce((v, f) => v + f, 0);
    pts.push(cumulative);
  }
  const ticks = niceTicks(Math.min(...pts, 0), Math.max(...pts, 1)),
    min = ticks[0],
    max = ticks.at(-1),
    xx = i => 57 + i * (490 / state.settings.years),
    yy = v => 185 - ((v - min) / (max - min)) * 155;
  const path = pts.map((v, i) => `${i ? 'L' : 'M'}${xx(i)},${yy(v)}`).join(' ');
  const grid = ticks
    .map(
      v =>
        `<line x1="57" y1="${yy(v)}" x2="547" y2="${yy(v)}" stroke="#eef1f6"/><text x="3" y="${yy(v) + 3}">${axisMoney(v)}</text>`,
    )
    .join('');
  return `<svg class="chart" viewBox="0 0 580 218" role="img" aria-label="Cumulative undiscounted portfolio cash flow"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#4265df" stop-opacity=".13"/><stop offset="1" stop-color="#4265df" stop-opacity="0"/></linearGradient></defs>${grid}<line x1="57" x2="547" y1="${yy(0)}" y2="${yy(0)}" stroke="#bec9e1" stroke-dasharray="4 4"/><path d="${path} L547,185 L57,185Z" fill="url(#area)"/><path d="${path}" fill="none" stroke="#4265df" stroke-width="2.5"/>${pts.map((v, i) => `<circle cx="${xx(i)}" cy="${yy(v)}" r="3" fill="#fff" stroke="#4265df" stroke-width="2"><title>Year ${i}: ${money(v)}</title></circle><text x="${xx(i)}" y="209" text-anchor="middle">${i ? 'Year ' + i : 'Start'}</text>`).join('')}</svg>`;
}
function allocationChart() {
  const a = portfolio().all,
    max = Math.max(...a.map(x => x.r.cap), 1);
  return `<svg class="chart" viewBox="0 0 430 218" role="img" aria-label="NPV compared with initial capital by project">${[0, 1, 2, 3].map(i => `<line x1="40" x2="413" y1="${30 + i * 50}" y2="${30 + i * 50}" stroke="#eef1f6"/>`).join('')}${a
    .map(x => {
      const r = x.r,
        v = Math.max(-1, Math.min(4, r.npv / Math.max(r.cap, 1))),
        cx = 48 + (r.cap / max) * 335,
        cy = 170 - (v + 1) * 28;
      return `<circle cx="${cx}" cy="${cy}" r="${8 + x.p.adoption / 12}" fill="${colors[x.i % 5]}" opacity=".8"><title>${esc(x.p.name)}: ${money(r.npv)} NPV, ${money(r.cap)} capital, ${x.p.adoption}% adoption</title></circle><text x="${cx}" y="${cy + 4}" text-anchor="middle" style="fill:white;font-weight:600">${x.i + 1}</text>`;
    })
    .join(
      '',
    )}<text x="215" y="212" text-anchor="middle">Initial capital →</text><text transform="translate(14 115) rotate(-90)" text-anchor="middle">NPV / capital →</text></svg>`;
}
function table() {
  const all = results().filter(x => `${x.p.name} ${x.p.team}`.toLowerCase().includes(query.toLowerCase()));
  return `<div class="panel table-panel"><div class="table-head"><div><h2>Investment portfolio <span class="pill">${state.projects.length} automations</span></h2><p>Compare returns. Open an automation to change its business case.</p></div><input id="search" aria-label="Search automations" placeholder="⌕  Search automations" value="${esc(query)}"></div><div class="table-wrap"><table><thead><tr><th>INCLUDE / AUTOMATION</th><th>STAGE</th><th>INITIAL CAPITAL</th><th>NPV</th><th>PAYBACK</th><th>ROI</th><th>IRR</th><th>EVIDENCE</th><th>DECISION</th></tr></thead><tbody>${all.map(({ p, i, r }) => `<tr><td><div class="project-cell"><input type="checkbox" data-include="${esc(p.id)}" aria-label="Include ${esc(p.name)} in portfolio" ${state.excluded.includes(p.id) ? '' : 'checked'}><span class="project-icon" style="background:${colors[i % 5]}13;color:${colors[i % 5]}">${icons[i % 5]}</span><button class="name-button" data-project="${esc(p.id)}"><strong>${esc(p.name)}</strong><small>${esc(p.team)} · ${esc(p.owner)}</small></button></div></td><td>${badge(p.stage, p.stage === 'Production' ? 'green' : 'blue')}</td><td>${short(r.cap)}</td><td><strong style="color:${r.npv > 0 ? 'var(--green)' : 'var(--red)'}">${short(r.npv)}</strong><small class="sub" title="Probability of success ${+r.success.value.toFixed(1)}%">Risk-adj. ${short(r.riskAdjustedNPV)} · ${Math.round(r.success.value)}%</small></td><td>${pb(r.payback)}</td><td>${pct(r.roi)}</td><td title="Annualized IRR: ${pct(r.irr)}">${irrShort(r.irr)}</td><td>${badge(p.baseline, p.baseline === 'Verified' ? 'green' : 'amber')}</td><td>${recBadge(r.recommendation, r.cautions)}</td></tr>`).join('') || '<tr><td colspan="9" class="empty">No automations match your search.</td></tr>'}</tbody></table></div><div class="table-foot"><span>${portfolio().all.length} included in portfolio · ${state.settings.capacity ? 'Cash + capacity value' : 'Cash benefit case'} · Portfolio IRR ${pct(portfolio().irr)}</span><span>Live calculations · Click a project to inspect assumptions →</span></div></div>`;
}
function fundingPlan() {
  const a = portfolio(),
    ys = a.yearly,
    tco = a.cap + ys.reduce((v, y) => v + y.cost, 0),
    cell = v => `<td>${v ? short(v) : '—'}</td>`;
  if (!a.all.length) return '';
  return `<div class="panel funding-panel"><div class="panel-head"><div><h2>Funding plan</h2><p>What the included portfolio asks for, year by year</p></div><span class="pill">Year-1 request ${short(a.funding)}</span></div><div class="table-wrap"><table><thead><tr><th></th>${ys.map(y => `<th>YEAR ${y.year}</th>`).join('')}<th>TOTAL</th></tr></thead><tbody><tr><td>One-time (build, data, training)</td>${ys.map((y, i) => cell(i ? 0 : a.cap)).join('')}${cell(a.cap)}</tr><tr><td>Running costs</td>${ys.map(y => cell(y.cost)).join('')}${cell(tco - a.cap)}</tr><tr class="total"><td>Total spend</td>${ys.map((y, i) => cell(y.cost + (i ? 0 : a.cap))).join('')}${cell(tco)}</tr><tr><td>Estimated benefits</td>${ys.map(y => cell(y.benefit)).join('')}${cell(a.benefit)}</tr></tbody></table></div><p class="table-note">Year-1 funding request = one-time costs + first-year running costs. Total cost of ownership over ${state.settings.years} years: <b>${short(tco)}</b>. Undiscounted, before tax. One-time costs are shown in year 1 for budgeting; the return model treats them as month 0.</p></div>`;
}
function overview() {
  const included = portfolio().all,
    risk = included.filter(x => x.r.recommendation === 'Intervene'),
    best = [...included].sort((a, b) => b.r.npv - a.r.npv)[0];
  if (!included.length)
    return (
      metrics() +
      `<div class="panel empty-state"><h2>No automations in the portfolio</h2><p>${state.projects.length ? 'Tick at least one automation in the table below to see portfolio value, charts and the funding plan.' : 'Add an automation to start building the portfolio.'}</p></div>` +
      table()
    );
  return (
    metrics() +
    `<div class="charts"><div class="panel"><div class="panel-head"><div><h2>From investment to value</h2><p>Cumulative net cash flow across the selected portfolio</p></div><span class="pill">${state.settings.years}-year outlook</span></div>${cashChart()}<div class="legend"><span><i style="background:var(--blue)"></i>Portfolio cash flow</span><span>Includes recurring AI operating costs</span></div></div><div class="panel"><div class="panel-head"><div><h2>The capital allocation lens</h2><p>Higher value per dollar invested · Bubble size = adoption</p></div></div>${allocationChart()}<div class="legend">${portfolio()
      .all.map(
        x =>
          `<span><i style="background:${colors[x.i % 5]}"></i>${x.i + 1}. ${esc(x.p.name.split(' ').slice(0, 2).join(' '))}</span>`,
      )
      .join('')}</div></div></div>` +
    table() +
    fundingPlan() +
    `<div class="insight"><b>✧</b><p><strong>Decision brief.</strong> ${best ? `${esc(best.p.name)} has the highest modeled NPV at ${short(best.r.npv)}.` : 'Select an automation to form a portfolio.'} ${risk.length} initiative${risk.length === 1 ? ' needs' : 's need'} evidence or health intervention before additional capital is committed. Recommendations are rule based and require executive review.</p></div>`
  );
}
function scope() {
  const p = state.projects.find(x => x.id === state.scenarioScope);
  if (!p) {
    state.scenarioScope = 'portfolio';
    return { label: 'Portfolio', name: 'portfolio', at: s => portfolio(s) };
  }
  return {
    label: 'Project',
    name: p.name,
    excluded: state.excluded.includes(p.id),
    at: (s = state.settings) => {
      const r = calc(p, s);
      return {
        npv: r.npv,
        cap: r.cap,
        irr: r.irr,
        payback: r.payback,
        benefit: r.totalBenefits,
        cost: r.totalCosts,
        rnpv: r.riskAdjustedNPV,
        funding: r.fundingRequest,
        breakEven: r.breakEven,
        probability: r.probability,
        adoption: p.adoption,
      };
    },
  };
}
function truth(a, sc) {
  const b = a.breakEven,
    tile = (label, value, note, ok) =>
      `<div class="truth ${ok === true ? 'ok' : ok === false ? 'bad' : ''}"><small>${label}</small><strong>${value}</strong><span>${note}</span></div>`;
  return `<h3 class="truth-title">What has to be true</h3><div class="truth-grid">${tile('Risk-adjusted NPV', short(a.rnpv), sc.label === 'Project' ? `${Math.round(a.probability * 100)}% probability of success` : 'Sum of included projects', a.rnpv > 0)}${tile('Estimated benefits must reach', b.benefits === null ? '—' : Math.round(b.benefits * 100) + '%', b.benefits === null ? 'No estimated benefits entered' : b.benefits <= 1 ? `of current estimate · ${Math.round((1 - b.benefits) * 100)}% cushion` : 'of current estimate · above today', b.benefits === null ? null : b.benefits <= 1)}${tile('Costs can rise by', b.costHeadroom === null ? '—' : b.costHeadroom >= 0 ? Math.round(b.costHeadroom * 100) + '%' : '0%', b.costHeadroom === null ? 'No costs entered' : b.costHeadroom >= 0 ? 'before NPV reaches zero' : `costs must fall ${Math.round(-b.costHeadroom * 100)}% to break even`, b.costHeadroom === null ? null : b.costHeadroom >= 0)}${sc.label === 'Project' ? tile('Adoption must reach', b.adoption === null ? '—' : b.adoption > 100 ? 'Not reachable' : b.adoption.toFixed(0) + '%', b.adoption === null ? 'Benefits do not cover usage costs' : b.adoption > 100 ? `would need ${b.adoption.toFixed(0)}%` : `for NPV ≥ 0 · current ${a.adoption}%`, b.adoption === null || b.adoption > 100 ? false : b.adoption <= a.adoption ? true : null) : ''}</div><p class="table-note">Break-even values change one driver at a time and hold everything else at the current scenario, hurdle rate and horizon.</p>`;
}
function scenarios() {
  const sc = scope(),
    a = sc.at(),
    benefits = [60, 80, 100, 120, 140],
    costs = [80, 90, 100, 110, 120];
  return (
    metrics(a, sc.label) +
    `<div class="scenario-grid"><div class="panel"><label class="scope-field" for="scope">Show results for<select id="scope"><option value="portfolio">Entire portfolio (${portfolio().all.length} included)</option>${state.projects.map(p => `<option value="${esc(p.id)}" ${state.scenarioScope === p.id ? 'selected' : ''}>${esc(p.name)}${state.excluded.includes(p.id) ? ' (excluded)' : ''}</option>`).join('')}</select></label>${sc.excluded ? '<p class="detail-note">This project is excluded from portfolio totals. Results below are for the project on its own.</p>' : ''}<h2>Move the assumptions</h2><p style="font-size:11px">Every change recalculates all projects immediately. The selector only changes which result is shown.</p>${[
      ['benefitFactor', 'Benefit realization', 40, 160, 1, '%'],
      ['costFactor', 'Cost multiplier', 60, 180, 1, '%'],
      ['delay', 'Additional rollout delay', 0, 24, 1, ' months'],
    ]
      .map(
        ([key, label, min, max, step, suffix]) =>
          `<div class="slider-field"><label for="${key}">${label}<b id="${key}-value">${state.settings[key]}${suffix}</b></label><input id="${key}" data-setting="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${state.settings[key]}"></div>`,
      )
      .join(
        '',
      )}<label class="switch"><input id="capacity" type="checkbox" ${state.settings.capacity ? 'checked' : ''}> Include recovered capacity value</label><p class="detail-note">Capacity value is hours × loaded hourly cost × realization. It is an economic proxy. Validate redeployment and keep it separate from direct savings.</p><h3 class="prob-title">Probability of success by stage</h3><p style="font-size:10px">Each project starts from its stage and is adjusted for its own delivery risks and missing approvals. Not assessed ratings stay neutral. A failed project is assumed to lose its initial capital and stop.</p><div class="prob-fields">${[
      ['probIdea', 'Idea'],
      ['probPilot', 'Pilot'],
      ['probProduction', 'Production'],
    ]
      .map(
        ([k, l]) =>
          `<label>${l}<span><input data-prob="${k}" type="number" min="0" max="100" step="1" value="${state.settings[k]}" aria-label="${l} probability of success (%)">%</span></label>`,
      )
      .join(
        '',
      )}</div><div class="prob-fields">${[
        ['riskHigh', 'Each high risk ×', 0, 1, 0.01],
        ['riskMedium', 'Each medium risk ×', 0, 1, 0.01],
        ['approvalFactor', 'Missing approval ×', 0, 1, 0.01],
        ['sponsorLimited', 'Sponsor limited ×', 0, 1, 0.01],
        ['sponsorMissing', 'Sponsor missing ×', 0, 1, 0.01],
        ['probFloor', 'Floor (%)', 0, 100, 1],
      ]
        .map(
          ([k, l, min, max, step]) =>
            `<label>${l}<span><input data-prob="${k}" type="number" min="${min}" max="${max}" step="${step}" value="${state.settings[k]}" aria-label="${l}"></span></label>`,
        )
        .join('')}</div><p style="font-size:10px">Current scenario: ${esc(state.scenario)}. Adoption and project ramp still apply after the portfolio multiplier.</p></div><div class="panel"><div class="panel-head"><div><h2>How resilient is your investment?</h2><p>Two-variable sensitivity · ${sc.label === 'Project' ? esc(sc.name) : 'portfolio'} NPV</p></div><span class="pill">${state.settings.rate}% discount</span></div>${truth(a, sc)}<div class="table-wrap"><table class="heat"><thead><tr><th>Estimated benefits ↓ / Costs →</th>${costs.map(c => `<th>${c}%</th>`).join('')}</tr></thead><tbody>${benefits
      .map(
        b =>
          `<tr><th>${b}%</th>${costs
            .map(c => {
              const v = sc.at({ ...state.settings, benefitFactor: b, costFactor: c }).npv;
              return `<td class="${v >= 0 ? 'positive' : 'negative'}">${short(v)}</td>`;
            })
            .join('')}</tr>`,
      )
      .join(
        '',
      )}</tbody></table></div><p style="font-size:10px;margin:18px 0">Each cell replaces the benefit and cost multipliers while holding horizon, hurdle rate, delay, and capacity policy fixed. Green = positive NPV; peach = negative NPV.</p><h2>Scenario comparison</h2><div class="table-wrap"><table><thead><tr><th>METRIC</th>${['Base', 'Downside', 'Upside'].map(n => `<th>${n.toUpperCase()}</th>`).join('')}</tr></thead><tbody>${(() => {
      const cases = ['base', 'downside', 'upside'].map(k => {
        const r = sc.at({ ...state.settings, ...scenarioPresets[k] });
        return { ...r, roi: r.cost ? (r.benefit - r.cost) / r.cost : null };
      });
      return [
        [
          'NPV',
          r => `<strong style="color:${r.npv > 0 ? 'var(--green)' : 'var(--red)'}">${short(r.npv)}</strong>`,
        ],
        ['Payback', r => pb(r.payback)],
        ['ROI (total costs)', r => pct(r.roi)],
        ['IRR', r => pct(r.irr)],
      ]
        .map(([name, f]) => `<tr><td>${name}</td>${cases.map(r => `<td>${f(r)}</td>`).join('')}</tr>`)
        .join('');
    })()}</tbody></table></div><p style="font-size:10px;margin:12px 0 22px">Downside: 75% estimated benefits, 120% costs, 3 months extra delay. Upside: 120% estimated benefits, 95% costs. Hurdle rate, horizon and capacity policy stay as currently set.</p><h2>One assumption at a time</h2><div class="table-wrap"><table><thead><tr><th>DRIVER</th><th>LOWER CASE</th><th>CURRENT</th><th>HIGHER CASE</th></tr></thead><tbody>${[
      ['Estimated benefits', 'benefitFactor', 80, 120],
      ['Costs', 'costFactor', 80, 120],
      ['Hurdle rate', 'rate', Math.max(0, state.settings.rate - 3), state.settings.rate + 3],
      ['Delay (months)', 'delay', Math.max(0, state.settings.delay - 3), state.settings.delay + 3],
    ]
      .map(
        ([name, key, low, high]) =>
          `<tr><td>${name}</td><td>${short(sc.at({ ...state.settings, [key]: low }).npv)}<small> (${low}${key === 'delay' ? ' mo' : '%'})</small></td><td>${short(a.npv)}</td><td>${short(sc.at({ ...state.settings, [key]: high }).npv)}<small> (${high}${key === 'delay' ? ' mo' : '%'})</small></td></tr>`,
      )
      .join('')}</tbody></table></div></div></div>`
  );
}
function evidenceText(r) {
  const e = r.evidence;
  return e.applicable
    ? `${Math.round(e.progress * 100)}% of target${e.raw > 1 ? ' (beat it; capped)' : ''}${e.provisional ? ' · provisional baseline' : ''}`
    : e.reason;
}
function evidence() {
  const included = portfolio().all,
    measured = included.filter(x => x.r.evidence.applicable),
    forecast = included.reduce((v, x) => v + x.r.npv, 0),
    adjusted = included.reduce((v, x) => v + (x.r.evidence.applicable ? x.r.evidence.npv : x.r.npv), 0);
  return `<div class="insight" style="margin:0 0 22px"><b>▤</b><p><strong>Evidence before confidence.</strong> All five projects are examples. “Verified” describes the example's baseline quality, not a verification performed by this tool. Monetary figures remain forecasts; operational observations do not establish attributable cash savings.</p></div>${included.length ? `<div class="metrics"><div class="metric"><div class="metric-top">Forecast NPV</div><strong>${short(forecast)}</strong><small>Included projects, estimated benefits</small></div><div class="metric"><div class="metric-top">Evidence-adjusted NPV</div><strong>${short(adjusted)}</strong><small>Benefits scaled to measured KPI progress</small></div><div class="metric"><div class="metric-top">Gap</div><strong>${short(adjusted - forecast)}</strong><small>Value not yet backed by results</small></div><div class="metric"><div class="metric-top">With measured results</div><strong>${measured.length} of ${included.length}</strong><small>Others use the forecast</small></div></div>` : ''}<div class="health-grid">${results()
    .map(
      ({ p, r }) =>
        `<article class="panel"><div class="panel-head"><div><h2><button class="name-button" data-project="${esc(p.id)}">${esc(p.name)} ↗</button></h2><p>${esc(p.owner)} · ${p.age} months since launch</p></div>${badge(r.health.action, r.health.action === 'Healthy' ? 'green' : r.health.action === 'Escalate' ? 'red' : 'amber')}</div><div class="health-row"><span>${esc(p.kpi)}</span><b>${p.baseline === 'Missing' ? 'Unmeasured' : p.before + ' ' + esc(p.unit)} → ${p.after} ${esc(p.unit)}</b></div><div class="health-row"><span>Baseline quality</span>${badge(p.baseline, p.baseline === 'Verified' ? 'green' : 'amber')}</div>${r.health.signals.map(s => `<div class="health-row"><span>${s.name}</span>${badge(s.value, s.level === 2 ? 'red' : s.level === 1 ? 'amber' : 'green')}</div>`).join('')}<div class="health-row"><span>Probability of success</span><b title="${probabilityText(r.success)}">${Math.round(r.success.value)}%${r.success.overridden ? ' · override' : ''}${r.success.unassessed.length ? ` · ${r.success.unassessed.length} not assessed` : ''}</b></div><div class="health-row"><span>Delivery readiness</span><span title="${esc(r.readiness.items.map(i => i.name + ': ' + i.value).join(' · '))}">${badge(r.readiness.status, r.readiness.status === 'Ready' ? 'green' : r.readiness.status === 'Not ready' ? 'red' : 'amber')}</span></div><div class="health-row"><span>Compliance</span>${badge(r.compliance.status === 'Cleared' ? 'Cleared' : r.compliance.status + ': ' + r.compliance.missing.join(', '), r.compliance.status === 'Cleared' ? 'green' : r.compliance.status === 'Blocked' ? 'red' : 'amber')}</div><div class="health-row"><span>Running cost per unit</span><b>${r.unit ? unitMoney(r.unit.cost) + ' · ' + esc(p.volumeUnit) : 'Volume not set'}</b></div><div class="health-row"><span>KPI progress</span><b>${evidenceText(r)}</b></div><div class="health-row"><span>Evidence-adjusted NPV</span><b>${r.evidence.applicable ? `${short(r.evidence.npv)} <small class="muted">vs ${short(r.npv)} forecast</small>` : 'Uses forecast'}</b></div><div class="health-row"><span>Compute overrun cost (${state.settings.years} yrs, PV)</span><b>${r.compute.overrun === null ? 'No budget' : r.compute.pvCost > 0 ? short(r.compute.pvCost) : 'Within budget'}</b></div><p class="evidence">${esc(p.evidence)}</p><p class="evidence"><strong>Next decision: ${r.recommendation}.</strong> ${r.cautions.map(c => esc(c) + '. ').join('')} ${r.compliance.status === 'Blocked' ? `Complete the ${esc(r.compliance.missing.join(', ').toLowerCase())} before further rollout. ` : ''}${r.readiness.status === 'Not ready' ? 'Resolve high delivery risks before committing more capital. ' : ''}${p.baseline !== 'Verified' ? 'Reconstruct a comparable baseline and validate value attribution. ' : ''}${r.health.action !== 'Healthy' ? 'Resolve flagged signals before expansion. ' : 'Validate sustained results and operating costs at the next monthly review. '}Reassess if NPV falls below zero or health deteriorates.</p></article>`,
    )
    .join('')}</div>`;
}
// Methodology: every formula typeset, with a live worked example from one project.
const fx = {
  v: (s, sub) => `<span class="sym"><var>${s}</var>${sub ? `<sub>${sub}</sub>` : ''}</span>`,
  frac: (n, d) => `<span class="frac"><span>${n}</span><span>${d}</span></span>`,
  sum: (lo, hi) => `<span class="bigop"><small>${hi}</small><span>Σ</span><small>${lo}</small></span>`,
  prod: lo => `<span class="bigop"><small>&nbsp;</small><span>Π</span><small>${lo}</small></span>`,
  sup: (b, e) => `<span class="sym">${b}<sup>${e}</sup></span>`,
  paren: s => `<span class="paren">(</span>${s}<span class="paren">)</span>`,
};
const formula = (title, body, where = [], example = '') =>
  `<figure class="formula"><figcaption>${title}</figcaption><div class="eq">${body}</div>${
    where.length
      ? `<dl class="where">${where.map(([k, d]) => `<div><dt>${k}</dt><dd>${d}</dd></div>`).join('')}</dl>`
      : ''
  }${example ? `<div class="example"><span>Worked example</span><p>${example}</p></div>` : ''}</figure>`;
const methodSections = [
  ['value', 'Four parts of AI value'],
  ['cash', 'Monthly cash flow'],
  ['returns', 'Returns: NPV, IRR, payback, ROI'],
  ['funding', 'Funding and cost of ownership'],
  ['risk', 'Probability and risk-adjusted NPV'],
  ['breakeven', 'Break-even'],
  ['unit', 'Unit economics'],
  ['evidence', 'Evidence and compute'],
  ['shared', 'Shared IT costs'],
  ['team', 'Shared tech team'],
  ['rules', 'Readiness, health and recommendation'],
  ['reference', 'Reference payback'],
  ['scope', 'Scope and limitations'],
];
let methodProject = null;
// Methodology opens on a plain-language walkthrough; the advanced view shows every formula.
let methodAdvanced = false;
const methodToggle = () =>
  `<button type="button" class="btn" id="method-toggle" aria-pressed="${methodAdvanced}">${methodAdvanced ? '← Simple walkthrough' : 'View advanced →'}</button>`;
const recMeaning = {
  Validate: 'a promising idea: measure a baseline and plan a pilot',
  Continue: 'on track: keep going and keep measuring',
  Scale: 'proven and widely used: roll it out further',
  Rework: 'it does not pay back as planned: change the plan before spending more',
  Intervene: 'something needs fixing first: evidence, approvals or health signals',
};
function methodSimple(p, r, st, m, picker) {
  const head = `<div class="method-head"><div><div class="eyebrow">HOW IT WORKS · SIMPLE WALKTHROUGH</div><h2>How an AI investment is judged, step by step.</h2><p class="lead">The whole model in plain language, using live numbers from the project you pick. Every figure is the same one the workspace uses. Open the advanced view for the exact formulas.</p></div><div class="method-actions">${picker.replace('Worked examples use', 'Example project')}${methodToggle()}</div></div>`;
  if (!p) return `<article class="panel method">${head}</article>`;
  const yrs = st.years,
    pc = v => esc(pct(v)),
    step = (i, title, body) =>
      `<section class="method-section"><div class="step-dot" aria-hidden="true">${i}</div><div><h3><span class="sr-only">Step ${i}: </span>${title}</h3>${body}</div></section>`,
    inShort = t => `<div class="example simple-short"><span>In short</span><p>${t}</p></div>`,
    row = (a, b) => `<tr><td>${a}</td><td>${b}</td></tr>`,
    indirectCash = (p.indirect * p.indirectCash) / 100,
    running = r.gross * (p.adoption / 100),
    full = r.team.monthsToFull,
    be = r.breakEven,
    f = r.success.factors;
  const steps = [
    step(
      1,
      'Add up what it costs',
      `<p>There are two kinds of cost: a <b>one-time</b> cost to build it and <b>running</b> costs every year. The model also adds two costs that business cases often forget: the company’s own tech team, and a share of the IT platforms several projects use.</p><table class="rule-table simple-table">${row('One-time: build, data preparation and training', `<b>${m(r.cap)}</b>`)}${row('Running: compute, storage, maintenance and human oversight', `<b>${m(r.op)}</b> a year`)}${row(`Internal tech team${st.teamCost === false ? ' (switched off)' : ''}`, `<b>${m(r.team.totalCost / yrs)}</b> a year on average`)}${row(`Share of shared IT costs${st.sharedCost === false ? ' (switched off)' : ''}`, `<b>${m(r.shared.annual)}</b> a year`)}</table>${inShort(`Over ${yrs} years, ${esc(p.name)} costs <b>${m(r.totalCosts)}</b> in total, counting everything.`)}`,
    ),
    step(
      2,
      'Add up what it saves',
      `<p>Not every benefit is cash. The model sorts benefits into three types and only counts money the company will actually see.</p><table class="rule-table simple-table">${row(`<b>Direct savings</b><small>Costs reduced or avoided</small>`, `${m(p.direct)} a year ${badge('Counted', 'green')}`)}${row(`<b>Indirect gains</b><small>Quality, retention, fewer complaints</small>`, `${m(p.indirect)} a year ${p.indirectCash >= 100 ? badge('Counted', 'green') : p.indirectCash > 0 ? badge(`${p.indirectCash}% counted`, 'amber') : badge('Not counted', 'red')}`)}${row(`<b>Freed-up time</b><small>${p.hours.toLocaleString('en-US')} hours a year</small>`, `${m(r.capacity)} a year ${st.capacity ? badge('Counted', 'green') : badge('Not counted', 'red')}`)}</table><p class="note"><b>Why freed-up time is not counted by default:</b> saving people time only saves money if a cost goes down or the time is used to earn more. It is shown separately so nobody counts it as cash by mistake.</p>${inShort(`At full strength, the counted benefit is <b>${m(r.gross)}</b> a year (${m(p.direct)} direct${indirectCash ? ` + ${m(indirectCash)} of indirect gains` : ''}${st.capacity ? ` + ${m(r.capacity)} of freed-up time` : ''}${st.benefitFactor !== 100 ? `, adjusted to ${st.benefitFactor}% by the scenario` : ''}).`)}`,
    ),
    step(
      3,
      'Be realistic about timing',
      `<p>A new tool does not deliver everything on day one, but its costs start straight away. The model works month by month for ${yrs * 12} months, so slow starts are priced in.</p><table class="rule-table simple-table">${row('<b>Adoption</b><small>Share of people or work that uses it</small>', `<b>${p.adoption}%</b>, so about ${m(running)} a year`)}${row('<b>Full benefit reached</b><small>After delays, ramp-up and staffing</small>', full === Infinity ? '<b>Never</b>: a needed role has nobody assigned' : `<b>${esc(months(full))}</b> after launch`)}${row('<b>Costs start</b>', '<b>Month 1</b>, even during delays')}</table>${inShort(full === Infinity ? 'Until the team gap is filled, this project only has costs.' : `Real savings are about <b>${m(running)}</b> a year once running, not the headline ${m(r.gross)}.`)}`,
    ),
    step(
      4,
      'Ask “is it worth it?”',
      `<p>Money in the future is worth less than money today, because the company could invest it elsewhere. So future savings are shrunk by <b>${st.rate}% a year</b> (the hurdle rate) before they are compared with the costs. The result is the <b>NPV</b>, net present value.</p><div class="simple-big ${r.npv > 0 ? 'good' : 'bad'}"><small>NPV over ${yrs} years</small><strong>${m(r.npv)}</strong><span>${r.npv > 0 ? `Positive: it earns more than the ${st.rate}% the company could get elsewhere.` : `Not positive: it does not beat the ${st.rate}% the company could get elsewhere.`}</span></div><table class="rule-table simple-table">${row('<b>Payback</b><small>When the money back covers the money spent</small>', `<b>${esc(pb(r.payback))}</b>`)}${row('<b>IRR</b><small>Its yearly return, like an interest rate</small>', `<b>${pc(r.irr)}</b>`)}${row('<b>ROI</b><small>Profit per $1 spent over the horizon</small>', `<b>${pc(r.roi)}</b>`)}</table>`,
    ),
    step(
      5,
      'Ask “how sure are we?”',
      `<p>Projects can fail. The chance of success starts from the project’s stage and drops for each warning sign: delivery risks, missing approvals or a weak sponsor.</p><table class="rule-table simple-table">${row(`Starting point: <b>${esc(p.stage)}</b> stage`, `<b>${r.success.base}%</b>`)}${f.map(x => row(esc(x.name), `× ${x.factor}`)).join('') || row('No warning signs', '× 1')}${row('<b>Chance of success</b>', `<b>${Math.round(r.success.value)}%</b>${r.success.overridden ? ' (set by hand, with a reason)' : ''}`)}</table><p>Then the good and bad outcomes are weighed: ${Math.round(r.probability * 100)}% chance of gaining ${m(r.npv)}, against a ${Math.round((1 - r.probability) * 100)}% chance of losing the ${m(r.failureLoss)} spent before it is fully running.</p>${inShort(`Risk-adjusted NPV is <b>${m(r.riskAdjustedNPV)}</b>: ${r.riskAdjustedNPV > 0 ? 'still worth doing after allowing for failure.' : 'not worth it once the chance of failure is priced in.'}`)}`,
    ),
    step(
      6,
      'Ask “how much can go wrong?”',
      `<p>Break-even shows how much room for error there is, changing one thing at a time.</p><table class="rule-table simple-table">${row('<b>Savings</b>', be.benefits === null ? 'N/A' : be.benefits <= 1 ? `could be <b>${pc(1 - be.benefits)} lower</b> and still break even` : `must be <b>${pc(be.benefits - 1)} higher</b> than estimated to break even`)}${row('<b>Costs</b>', be.costHeadroom === null ? 'N/A' : be.costHeadroom >= 0 ? `could rise <b>${pc(be.costHeadroom)}</b> and still break even` : `must fall <b>${pc(-be.costHeadroom)}</b> to break even`)}${row('<b>Adoption</b>', be.adoption === null ? 'N/A' : be.adoption > 100 ? 'cannot break even through adoption alone' : `must reach at least <b>${Math.round(be.adoption)}%</b> (now ${p.adoption}%)`)}</table>${inShort(be.benefits === null || be.benefits > 1 ? 'There is no margin yet: the estimates must improve before this project breaks even.' : be.benefits > 0.85 ? 'The margin is thin. Check the estimates closely before approval.' : 'There is a comfortable margin, so the case survives estimates that turn out too optimistic.')}`,
    ),
    step(
      7,
      'Check the real results',
      `<p>Forecasts are guesses. Once a project is live, the model compares them with what is actually happening.</p><table class="rule-table simple-table">${row(`<b>Measured result</b><small>${esc(p.kpi)}</small>`, `<b>${evidenceText(r)}</b>`)}${row('<b>Health signals</b><small>Usage, accuracy, sponsor, budget, staffing</small>', `<b>${esc(r.health.action)}</b>`)}${row('<b>Recommendation</b>', recBadge(r.recommendation, r.cautions))}</table>${inShort(`<b>${esc(r.recommendation)}</b> means ${recMeaning[r.recommendation] || 'see the project detail'}. The rules support human judgment; they do not make the funding decision.`)}`,
    ),
  ].join('');
  const refOK = p.direct + r.capacity - operating(p) > 0;
  return `<article class="panel method">${head}${steps}${
    refOK
      ? `<aside class="simple-aside"><h4>Why a quick formula gives a different answer</h4><p>The reference document’s shortcut gives ${esc(p.name)} a payback of <b>${esc(pb(r.referencePayback))}</b>. This model says <b>${esc(pb(r.payback))}</b>. The shortcut assumes full use from day one and leaves out ramp-up, the internal team and shared IT costs. The month-by-month figure is the one to trust.</p></aside>`
      : ''
  }<div class="simple-summary"><b>The whole method in one line:</b> count every cost, count only real cash savings, allow for timing, shrink future money to today’s value, then allow for the chance of failure. If it is still positive, fund it, and keep checking that it delivers.</div></article>`;
}
function method() {
  const st = state.settings,
    p = state.projects.find(x => x.id === methodProject) || state.projects[0];
  const { v, frac, sum, prod, sup, paren } = fx,
    sec = (id, i, title, lead, body) =>
      `<section class="method-section" id="m-${id}"><div class="method-num">${String(i).padStart(2, '0')}</div><div><h3>${title}</h3>${lead ? `<p class="lead">${lead}</p>` : ''}${body}</div></section>`;
  const r = p ? calc(p) : null,
    ex = fn => (r ? fn(r) : ''),
    usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
    m = v => esc(usd.format(v)),
    pc = v => esc(pct(v)),
    name = p ? `<b>${esc(p.name)}</b>: ` : '',
    horizon = st.years * 12;
  const picker = state.projects.length
    ? `<label class="method-pick">Worked examples use <select id="method-project" class="mini select" aria-label="Project used for worked examples">${state.projects
        .map(x => `<option value="${esc(x.id)}" ${x.id === p.id ? 'selected' : ''}>${esc(x.name)}</option>`)
        .join('')}</select></label>`
    : '<p class="lead">Add a project to see worked examples.</p>';
  if (!methodAdvanced) return methodSimple(p, r, st, m, picker);
  const body = [
    sec(
      'value',
      1,
      'Four parts of AI value',
      'Value is split into four parts so cash, proxies and costs are never mixed. The supplied “Measure and demonstrate AI business value” document informs this framework, the stakeholder metrics, baseline evidence and early warning indicators. Its learning exercises are reference content, not instructions to this application.',
      `<div class="value-grid"><div><b>Direct savings</b><span>Expenses reduced or avoided. Never also count the same labor as recovered capacity.</span></div><div><b>Indirect gains</b><span>Retention, quality, revenue or fewer complaints. Only the cash-qualified share enters cash flows.</span></div><div><b>Productivity</b><span>Recovered capacity. Reported separately and off by default; it enters cash only when the capacity option is on.</span></div><div><b>Full costs</b><span>Build, data preparation, training, compute, storage, maintenance, oversight, internal team and shared IT.</span></div></div>
${formula(
  'Annual gross benefit',
  `${v('Gross')} = ${paren(`${v('Direct')} + ${v('Indirect')} × ${v('s', 'cash')} + [${v('Capacity')}]`)} × ${v('k', 'benefit')}`,
  [
    [v('s', 'cash'), 'Cash-qualified share of indirect gains'],
    [`[${v('Capacity')}]`, `Included only when the capacity option is on (currently <b>${st.capacity ? 'on' : 'off'}</b>)`],
    [v('k', 'benefit'), `Scenario benefit multiplier (currently ${st.benefitFactor}%)`],
  ],
  ex(r => `${name}(${m(p.direct)} + ${m(p.indirect)} × ${p.indirectCash}%${st.capacity ? ` + ${m(r.capacity)}` : ''}) × ${st.benefitFactor}% = <b>${m(r.gross)}</b> a year at full adoption.`),
)}
${formula(
  'Recovered capacity (productivity proxy)',
  `${v('Capacity')} = ${v('Hours')} × ${v('Rate', 'loaded')} × ${v('Realization')}`,
  [[v('Realization'), 'Share of recovered hours that is actually redeployed']],
  ex(r => `${name}${p.hours.toLocaleString('en-US')} h × ${m(p.hourly)} × ${p.realization}% = <b>${m(r.capacity)}</b> a year, ${st.capacity ? 'included in cash' : 'reported, not counted as cash'}.`),
)}`,
    ),
    sec(
      'cash',
      2,
      'Monthly cash flow',
      `Cash flows are monthly and end-of-period over a ${st.years}-year horizon (${horizon} months). Initial build, data preparation and training are paid at month 0. Operating costs start in month 1, even during a rollout delay. Adoption, ramp and growth are each applied once.`,
      `${formula(
        'Usage factor',
        `${v('U', 'm')} = ${v('a')} × ${v('Ramp', 'm')} × ${sup(paren(`1 + ${v('g', 'b')}`), `⌊(${v('m')}−1)/12⌋`)} &nbsp;&nbsp; ${v('Ramp', 'm')} = min${paren(`1, max${paren(`0, ${frac(`${v('m')} − ${v('D')}`, v('R'))}`)}`)}`,
        [
          [v('a'), 'Adoption'],
          [v('D'), 'Months before benefits start: project delay × staffing factor + scenario delay'],
          [v('R'), 'Ramp months × staffing factor (at least 1)'],
          [v('g', 'b'), 'Annual benefit growth, applied at each 12-month boundary'],
        ],
        ex(r => `${name}full benefit is reached after <b>${esc(months(r.team.monthsToFull))}</b>, with adoption ${p.adoption}%.`),
      )}
${formula(
  'Net cash flow in month m',
  `${v('Net', 'm')} = ${frac(v('Gross'), '12')}${v('U', 'm')} − ${frac(v('Op'), '12')}${sup(paren(`1 + ${v('g', 'c')}`), v('y'))} − ${v('Team', 'm')} − ${v('Shared', 'm')} − ${frac(`${v('c', 'unit')} × ${v('V')}`, '12')}${v('U', 'm')}`,
  [
    [v('Net', '0'), '− Initial capital = −(build + data preparation + training)'],
    [v('Op'), 'Annual compute, storage, maintenance and oversight (treated as external costs)'],
    [v('g', 'c'), `Annual operating cost growth; ${v('y')} = completed years`],
    [`${v('c', 'unit')} × ${v('V')}`, 'Usage cost: cost per unit × annual volume, so it scales with usage and is never charged during a delay'],
  ],
  `All costs are scaled by the scenario cost multiplier (currently ${st.costFactor}%).${ex(r => ` ${name}initial capital ${m(r.cap)}, annual operating costs ${m(r.op)}.`)}`,
)}`,
    ),
    sec(
      'returns',
      3,
      'Returns: NPV, IRR, payback, ROI',
      'The annual discount rate is effective, so each month is discounted at the twelfth root. IRR and payback return “N/A” or “Beyond horizon” rather than a misleading zero.',
      `${formula(
        'Net present value',
        `${v('NPV')} = ${sum(`${v('m')}=0`, v('N'))} ${frac(v('Net', 'm'), sup(paren(`1 + ${v('r')}`), `${v('m')}/12`))}`,
        [
          [v('r'), `Annual effective discount rate (currently ${st.rate}%)`],
          [v('N'), `Horizon in months (currently ${horizon})`],
        ],
        ex(r => `${name}−${m(r.cap)} + ${m(r.npv + r.cap)} PV of monthly net cash = <b>${m(r.npv)}</b>.`),
      )}
${formula(
  'Internal rate of return',
  `${sum(`${v('m')}=0`, v('N'))} ${frac(v('Net', 'm'), sup(paren(`1 + ${v('i')}`), v('m')))} = 0 &nbsp;⇒&nbsp; ${v('IRR')} = ${sup(paren(`1 + ${v('i')}`), '12')} − 1`,
  [
    [v('i'), 'Monthly rate that sets NPV to zero, found by bisection'],
    ['N/A', 'No positive inflow, more than one sign change (no unique IRR), or no root in bounds'],
  ],
  ex(r => `${name}IRR = <b>${pc(r.irr)}</b>. Above 100% the portfolio table shows “>100%”, since a small initial capital makes it unstable for ranking.`),
)}
${formula(
  'Payback',
  `${v('Payback')} = ${v('k')} − 1 + ${frac(`|${v('C', `${v('k')}−1`)}|`, v('Net', v('k')))}`,
  [
    [v('C', 'm'), `Cumulative cash to month m: ${v('Net', '0')} + ${v('Net', '1')} + … + ${v('Net', 'm')}`],
    [v('k'), 'The month cumulative cash is finally recovered; if it turns negative again later, payback moves to the later recovery'],
  ],
  ex(r => `${name}payback <b>${esc(pb(r.payback))}</b>; discounted payback (same rule on discounted flows) <b>${esc(pb(r.discountedPayback))}</b>. The portfolio applies the same rule to its summed monthly flows.`),
)}
${formula(
  'Return on investment (two labelled denominators)',
  `${v('ROI', 'total cost')} = ${frac(`Σ${v('Benefit')} − Σ${v('Cost')}`, `Σ${v('Cost')}`)} &nbsp;&nbsp;&nbsp; ${v('ROI', 'capital')} = ${frac(`Σ${v('Benefit')} − Σ${v('Cost')}`, v('Initial capital'))}`,
  [[`Σ${v('Cost')}`, 'Initial capital + all running costs over the horizon, undiscounted']],
  ex(r => `${name}(${m(r.totalBenefits)} − ${m(r.totalCosts)}) ÷ ${m(r.totalCosts)} = <b>${pc(r.roi)}</b> on total cost; <b>${r.cap ? pc(r.capitalROI) : 'N/A'}</b> on initial capital.`),
)}`,
    ),
    sec(
      'funding',
      4,
      'Funding and cost of ownership',
      'Budgeting figures only. They do not change NPV, IRR or payback, which keep one-time costs at month 0 and running costs in the month they occur.',
      `${formula(
        'Year-1 funding request',
        `${v('Funding', 'Y1')} = ${v('Initial capital')} + ${sum(`${v('m')}=1`, '12')} ${v('Cost', 'm')}`,
        [],
        ex(r => `${name}${m(r.cap)} + ${m(r.yearly[0].cost)} = <b>${m(r.fundingRequest)}</b>.`),
      )}
${formula(
  'Total cost of ownership',
  `${v('TCO')} = ${v('Initial capital')} + ${sum(`${v('m')}=1`, v('N'))} ${v('Cost', 'm')}`,
  [],
  ex(r => `${name}<b>${m(r.totalCosts)}</b> over ${st.years} years, undiscounted.`),
)}`,
    ),
    sec(
      'risk',
      5,
      'Probability and risk-adjusted NPV',
      'Each risk affects one channel only. Readiness, sponsor and approvals change probability; staffing changes timing and cost, so it stays out of probability. All factors are editable in the Scenario lab.',
      `${formula(
        'Probability of success',
        `${v('P')} = max${paren(`${v('P', 'floor')}, ${v('P', 'stage')} × ${prod(v('f'))} ${v('f')}`)}`,
        [
          [v('P', 'stage'), `Idea ${st.probIdea}%, Pilot ${st.probPilot}%, Production ${st.probProduction}%`],
          [v('f'), `× ${st.riskHigh} per high delivery risk, × ${st.riskMedium} per medium, × ${st.approvalFactor} per missing required approval (pilots and production), × ${st.sponsorLimited} limited sponsor, × ${st.sponsorMissing} missing sponsor. Not assessed = × 1, flagged`],
          [v('P', 'floor'), `${st.probFloor}%. A per-project override applies only with a written reason; the rule-based value stays visible`],
        ],
        ex(r => `${name}${r.success.base}%${r.success.factors.map(f => ` × ${f.factor} <small>(${esc(f.name.toLowerCase())})</small>`).join('')} = <b>${Math.round(r.success.computed * 10) / 10}%</b>${r.success.overridden ? `, overridden to <b>${r.success.value}%</b>` : ''}.`),
      )}
${formula(
  'Risk-adjusted NPV',
  `${v('NPV', 'risk')} = ${v('P')} × ${v('NPV')} − ${paren(`1 − ${v('P')}`)} × ${v('L', 'fail')} &nbsp;&nbsp; ${v('L', 'fail')} = ${v('Initial capital')} + ${sum(v('m'), '')} ${v('Cost', 'm')}${v('d', 'm')}${v('b', 'm')}`,
  [
    [v('L', 'fail'), 'A failed project stops at its planned full-benefit point, losing initial capital plus the discounted costs incurred while it was being delivered'],
    [v('d', 'm'), 'Discount factor (1 + r)<sup>−m/12</sup>'],
    [v('b', 'm'), 'Share of month m still in delivery (1 before full benefit, 0 after)'],
  ],
  ex(r => `${name}${pc(r.probability)} × ${m(r.npv)} − ${pc(1 - r.probability)} × ${m(r.failureLoss)} = <b>${m(r.riskAdjustedNPV)}</b>.`),
)}`,
    ),
    sec(
      'breakeven',
      6,
      'Break-even',
      'NPV is linear in each driver, so each threshold is solved directly, holding every other assumption fixed.',
      `${formula(
        'Benefits needed, cost headroom and adoption needed',
        `<span class="eq-row">${v('Benefits', 'needed')} = ${frac(`${v('I')} + ${v('PV', 'fixed')} + ${v('PV', 'usage')}`, v('PV', 'benefit'))}</span><span class="eq-row">${v('Cost headroom')} = ${frac(v('PV', 'benefit'), `${v('I')} + ${v('PV', 'fixed')} + ${v('PV', 'usage')}`)} − 1</span><span class="eq-row">${v('a', 'needed')} = ${v('a')} × ${frac(`${v('I')} + ${v('PV', 'fixed')}`, `${v('PV', 'benefit')} − ${v('PV', 'usage')}`)}</span>`,
        [
          [v('I'), 'Initial capital'],
          [v('PV', 'fixed'), 'PV of fixed running costs, including team and shared IT'],
          [v('PV', 'usage'), 'PV of usage-based costs, which move with adoption'],
        ],
        ex(r => `${name}benefits must reach <b>${r.breakEven.benefits === null ? 'N/A' : pc(r.breakEven.benefits)}</b> of the estimate; costs can rise <b>${r.breakEven.costHeadroom === null ? 'N/A' : pc(r.breakEven.costHeadroom)}</b>; adoption must reach <b>${r.breakEven.adoption === null ? 'N/A' : r.breakEven.adoption > 100 ? 'not reachable' : Math.round(r.breakEven.adoption * 10) / 10 + '%'}</b>.`),
      )}`,
    ),
    sec(
      'unit',
      7,
      'Unit economics',
      'Steady-state figures at full adoption and ramp. The example projects keep their reference compute costs as fixed costs; their volumes are illustrative.',
      `${formula(
        'Cost and benefit per unit',
        `<span class="eq-row">${v('Cost', 'unit')} = ${frac(`${v('Op')} + ${v('Team', 'run')} + ${v('Shared')} + ${v('c', 'unit')}${v('V')}${v('a')}`, `${v('V')} × ${v('a')}`)}</span><span class="eq-row">${v('Benefit', 'unit')} = ${frac(`${v('Gross')} × ${v('a')}`, `${v('V')} × ${v('a')}`)}</span>`,
        [[v('V'), 'Annual volume (transactions, documents, calls…)']],
        ex(r => (r.unit ? `${name}${esc(unitMoney(r.unit.benefit))} benefit − ${esc(unitMoney(r.unit.cost))} cost = <b>${esc(unitMoney(r.unit.net))}</b> net per unit.` : `${name}no volume entered, so unit economics are unavailable.`)),
      )}`,
    ),
    sec(
      'evidence',
      8,
      'Evidence and compute',
      'Measured results sit beside the forecast and never replace it.',
      `${formula(
        'KPI progress',
        `${v('Progress')} = clamp${paren(`${frac(`${v('KPI', 'latest')} − ${v('KPI', 'baseline')}`, `${v('KPI', 'target')} − ${v('KPI', 'baseline')}`)}, 0, 1`)}`,
        [['Needs', 'A launched project, a baseline that is not missing, an observation period and a target that improves on the baseline. A partial baseline is marked provisional. Direction is respected for lower-is-better KPIs']],
        ex(r => `${name}${r.evidence.applicable ? `progress <b>${pc(r.evidence.progress)}</b>${r.evidence.provisional ? ' (provisional)' : ''}` : `not available (${esc(r.evidence.reason.toLowerCase())})`}.`),
      )}
${formula(
  'Evidence-adjusted NPV',
  `${v('NPV', 'evidence')} = ${v('NPV')} − ${paren(`1 − ${v('Progress')}`)} × ${v('PV', 'benefit')}`,
  [['Assumes', 'Cash benefit moves in proportion to the KPI']],
  ex(r => (r.evidence.npv === null ? `${name}not available.` : `${name}${m(r.npv)} − ${pc(1 - r.evidence.progress)} × ${m(r.pvBenefits)} = <b>${m(r.evidence.npv)}</b>.`)),
)}
${formula(
  'Compute overrun',
  `${v('PV', 'overrun')} = ${sum(`${v('m')}=1`, v('N'))} ${frac(`max${paren(`0, ${v('Compute')} − ${v('Budget')}`)}`, '12')}${sup(paren(`1 + ${v('g', 'c')}`), v('y'))}${v('d', 'm')}`,
  [['Signal', 'More than 10% over budget yellow, more than 25% red. The PV is the NPV recovered by returning to budget']],
  ex(r => `${name}${!(p.computeBudget > 0) ? 'no compute budget entered' : r.compute.pvCost > 0 ? `<b>${m(r.compute.pvCost)}</b> over the horizon` : 'within budget, no overrun'}.`),
)}`,
    ),
    sec(
      'shared',
      9,
      'Shared IT costs',
      'Platforms and tools used by several projects are grouped into categories, each with an annual cost and its own allocation basis. Bases use inputs only, so allocation never depends on its own results.',
      `${formula(
        'Share of a category charged to a project',
        `${v('Share', 'p,c')} = ${v('Cost', 'c')} × ${frac(v('Basis', 'p,c'), `${sum(v('q'), '')} ${v('Basis', 'q,c')}`)}`,
        [
          [v('Basis'), 'Compute spend, data engineers assigned, tech team assigned, live projects (ideas pay nothing), data sensitivity (Personal 3, Confidential 2, Internal 1, Public 0) or equal per project'],
          ['Charge', `Fixed running cost of ${v('Share')} ÷ 12 per month from month 1, × cost multiplier`],
          ['Counted once', 'Excluded projects keep their share, reported outside portfolio totals. A category no project uses stays unallocated'],
        ],
        ex(r => `${name}${st.sharedCost === false ? 'charging is switched off.' : `<b>${m(r.shared.annual)}</b> a year${st.shared.length ? ' (' + st.shared.map(c => `${esc(c.name)} ${m(r.shared.byCategory[c.id] || 0)}`).join(', ') + ')' : ''}.`}`),
      )}`,
    ),
    sec(
      'team',
      10,
      'Shared tech team',
      'A shared pool by role, each role with an editable loaded annual cost. Example cost fields are treated as external, so internal people are not counted twice. Bench people are reported on the Tech team page, not charged to projects.',
      `${formula(
        'Coverage and timing',
        `<span class="eq-row">${v('Coverage')} = min<sub>role</sub> ${frac(v('Assigned', 'role'), v('Needed', 'role'))}</span><span class="eq-row">${v('Staffing factor')} = <span class="cases"><span>1 ÷ ${v('Coverage')} &nbsp; if under-staffed</span><span>max${paren(`0.5, 1 ÷ √${v('Coverage')}`)} &nbsp; if over-staffed</span><span>never &nbsp; if a needed role has nobody</span></span></span>`,
        [['Applies to', 'Project delay and ramp (scenario delay is unchanged)']],
        ex(r => `${name}${r.team.planned ? `coverage <b>${pc(r.team.coverage)}</b>${r.team.bottleneck ? ` (${esc(r.team.bottleneck)})` : ''}, full benefit at <b>${esc(months(r.team.monthsToFull))}</b> vs ${esc(months(r.team.baseMonthsToFull))} planned.` : 'no team need entered.'}`),
      )}
${formula(
  'Team cost per month',
  `${v('Team', 'm')} = ${frac(`${v('b', 'm')} × ${v('Build cost')} + ${paren(`1 − ${v('b', 'm')}`)} × ${v('Build cost')} × min${paren(`1, ${frac(v('FTE', 'run'), v('Assigned'))}`)}`, '12')}`,
  [[v('Build cost'), 'Σ assigned people × loaded annual cost of their role']],
  ex(r => `${name}${st.teamCost === false ? 'charging is switched off.' : `<b>${m(r.team.totalCost)}</b> over the horizon.`}`),
)}`,
    ),
    sec(
      'rules',
      11,
      'Readiness, health and recommendation',
      'Deterministic rules that support human judgment. They are not autonomous funding decisions.',
      `<div class="rule-grid"><div class="rule-card"><h4>Readiness</h4><p>Data readiness, integration, vendor dependency and team capacity are rated low, medium or high risk.</p><table class="rule-table"><tr><td>Two or more high</td><td>${badge('Not ready', 'red')}</td></tr><tr><td>One high, or two or more medium</td><td>${badge('At risk', 'amber')}</td></tr><tr><td>Anything not assessed</td><td>${badge('Incomplete', 'blue')}</td></tr><tr><td>Otherwise</td><td>${badge('Ready', 'green')}</td></tr></table><p>Team capacity: below 50% staffed High, below 100% Medium, otherwise Low. Readiness informs but does not change the recommendation.</p></div>
<div class="rule-card"><h4>Compliance</h4><table class="rule-table"><tr><td>Security review</td><td>Always required</td></tr><tr><td>Legal &amp; privacy</td><td>Personal data</td></tr><tr><td>Model risk review</td><td>High-risk AI</td></tr></table><p>A pilot or production project missing a required approval is ${badge('Blocked', 'red')} and recommended for intervention; an idea is Pending.</p></div>
<div class="rule-card"><h4>Health signals</h4><table class="rule-table"><tr><td>Adoption &lt; 40% after 3 months</td><td>${badge('Monitor', 'amber')}</td></tr><tr><td>Adoption &lt; 20% after 6 months</td><td>${badge('Red flag', 'red')}</td></tr><tr><td>Pipeline &lt; 98% · &lt; 95%</td><td>Watch · Red</td></tr><tr><td>Accuracy below target, not improving</td><td>${badge('Yellow', 'amber')}</td></tr><tr><td>Sponsor limited · missing</td><td>Yellow · Red</td></tr><tr><td>Staffing &lt; 100% · &lt; 50%</td><td>Yellow · Red</td></tr></table><p>Two yellow → investigate; any red → investigate; two red → escalate. Pipeline thresholds are fixed demo policy.</p></div>
<div class="rule-card"><h4>Recommendation</h4><ol class="decision"><li><b>Idea:</b> NPV &gt; 0 → ${badge('Validate', 'blue')} (measure a baseline, plan a pilot); otherwise ${badge('Rework', 'red')}</li><li>Evidence not verified, approval missing, or health says investigate/escalate → ${badge('Intervene', 'amber')}</li><li>NPV ≤ 0 → ${badge('Rework', 'red')}</li><li>Production with adoption ≥ 80% → ${badge('Scale', 'green')}</li><li>Otherwise → ${badge('Continue', 'blue')}</li></ol><p>Two cautions appear beside it without changing it: positive NPV but negative risk-adjusted NPV, and positive NPV that measured KPI progress does not yet support.${ex(r => ` ${name}${recBadge(r.recommendation, r.cautions)}`)}</p></div></div>`,
    ),
    sec(
      'reference',
      12,
      'Reference payback is shown separately',
      'The source reference uses a simplified ratio. It is available in project detail but is not the primary payback, and the reference’s conflicting example payback summaries are not copied as validated outputs.',
      `${formula(
        'Reference ratio payback (months)',
        `${v('Payback', 'ref')} = ${frac(`${v('Implementation')} + ${v('Op', 'year 1')}`, `${v('Direct')} + ${v('Productivity')} − ${v('Op', 'year 1')}`)} × 12`,
        [['Limits', 'Ignores ramp, adoption and indirect gains, and counts first-year operating costs in both numerator and denominator']],
        ex(r => `${name}reference ratio <b>${p.direct + r.capacity - operating(p) > 0 ? esc(pb(r.referencePayback)) : 'Not reached'}</b> vs cash-flow payback <b>${esc(pb(r.payback))}</b>.`),
      )}`,
    ),
    sec(
      'scope',
      13,
      'Scope and limitations',
      '',
      `<ul class="scope-list"><li>USD, nominal, before-tax estimates.</li><li>No depreciation tax shield, working capital, terminal value, financing, shared infrastructure savings, project dependencies or budget optimization.</li><li>Portfolio totals assume independent, additive benefits and costs; check overlap before approval rather than assuming synergies.</li><li>Data is saved only in this browser. There is no company login, shared database or live telemetry connection.</li><li>The Excel export rebuilds every formula on this page as a live workbook formula.</li></ul>`,
    ),
  ].join('');
  return `<div class="method-wrap"><nav class="method-toc" aria-label="Methodology sections"><div class="eyebrow">ON THIS PAGE</div>${methodSections
    .map(([id, t], i) => `<a href="#m-${id}" data-method-jump="${id}"><span>${String(i + 1).padStart(2, '0')}</span>${t}</a>`)
    .join('')}</nav><article class="panel method"><div class="method-head"><div><div class="eyebrow">MODEL TRANSPARENCY</div><h2>Built for a business case you can defend.</h2><p class="lead">Every figure in the workspace comes from the formulas below. Values in the worked examples are live: they use the current scenario, settings and the project you pick.</p></div><div class="method-actions">${picker}${methodToggle()}</div></div>${body}</article></div>`;
}
// Shared tech team: thin wrappers over portfolio.js using the current state.
const roleUsage = () => usageOf(state.projects, state.settings.team);
const moveTeam = (role, from, to, count) => move(state.projects, state.settings.team, role, from, to, count);
function probabilityText(sp) {
  const parts = [`${sp.base}% stage start`, ...sp.factors.map(f => `${esc(f.name)} × ${f.factor}`)];
  return sp.overridden
    ? `${+sp.value.toFixed(1)}% (override: ${esc(sp.reason)}; rules give ${+sp.computed.toFixed(1)}%)`
    : `${+sp.computed.toFixed(1)}% = ${parts.join(' × ')}${sp.computed === state.settings.probFloor && sp.factors.length ? ' (floor)' : ''}`;
}

function teamHints(roles, res) {
  const hints = [];
  for (const r of roles) {
    const short = res.filter(x => (x.p.need?.[r.id] || 0) > (x.p.alloc?.[r.id] || 0)),
      spare = res.filter(x => (x.p.alloc?.[r.id] || 0) > (x.p.need?.[r.id] || 0));
    if (!short.length) continue;
    const names = short.map(x => esc(x.p.name)).join(', ');
    if (r.available > 0)
      hints.push(`${esc(r.name)}: ${r.available} on the bench while ${names} ${short.length === 1 ? 'is' : 'are'} short.`);
    else if (spare.length)
      hints.push(`${names} ${short.length === 1 ? 'is' : 'are'} short of ${esc(r.name)}; ${spare.map(x => esc(x.p.name)).join(', ')} ${spare.length === 1 ? 'has' : 'have'} more than needed.`);
    else hints.push(`Not enough ${esc(r.name)}: ${names} ${short.length === 1 ? 'is' : 'are'} short and none are free.`);
  }
  for (const x of res)
    if (x.p.stage === 'Production' && x.r.team.runCoverage > 1.5)
      hints.push(`${esc(x.p.name)} is live with ${x.r.team.assigned} people for ${x.p.runNeed} run FTE; extra people could move.`);
  return hints;
}
function team() {
  const s = state.settings,
    roles = roleUsage(),
    res = results(),
    factor = s.costFactor / 100,
    people = roles.reduce((v, r) => v + r.headcount, 0),
    assigned = roles.reduce((v, r) => v + r.assigned, 0),
    annual = roles.reduce((v, r) => v + r.headcount * r.cost, 0) * factor,
    charged = res.reduce((v, x) => v + x.r.yearly[0].team, 0),
    bench = roles.reduce((v, r) => v + Math.max(0, r.available) * r.cost, 0) * factor,
    idle = Math.max(0, annual - charged - bench),
    hints = teamHints(roles, res),
    option = (value, label, selected) => `<option value="${esc(value)}" ${selected ? 'selected' : ''}>${label}</option>`,
    places = sel => option('bench', 'Bench', sel === 'bench') + state.projects.map(p => option(p.id, esc(p.name), sel === p.id)).join('');
  const cell = (p, r, rr) => {
    const a = p.alloc?.[r.id] || 0,
      n = p.need?.[r.id] || 0,
      key = `${esc(p.id)}|${r.id}`,
      cls = n && a < n ? 'short' : a > n ? 'over' : n ? 'ok' : '';
    return `<td><div class="stepper ${cls}"><button type="button" data-step-alloc="${key}|-1" aria-label="Move one of ${esc(r.name)} off ${esc(p.name)}" ${a ? '' : 'disabled'}>−</button><span>${a}<small>/${n}</small></span><button type="button" data-step-alloc="${key}|1" aria-label="Add one of ${esc(r.name)} to ${esc(p.name)}" ${rr.available > 0 ? '' : 'disabled'}>+</button></div></td>`;
  };
  return `<div class="metrics"><div class="metric"><div class="metric-top">Tech team</div><strong>${people}</strong><small>${roles.length} roles · shared across projects</small></div><div class="metric"><div class="metric-top">Assigned</div><strong>${assigned}</strong><small>${people - assigned} on the bench</small></div><div class="metric"><div class="metric-top">Annual team cost</div><strong>${short(annual)}</strong><small>Loaded cost of all ${people} people</small></div><div class="metric"><div class="metric-top">Charged to projects, year 1</div><strong>${short(charged)}</strong><small>${s.teamCost ? `Bench ${short(bench)} · idle after build ${short(idle)}` : 'Team cost switched off'}</small></div></div>
<div class="team-grid"><div class="panel"><h2>Team pools</h2><p class="table-note" style="margin:4px 0 12px">Headcount cannot go below the people already assigned.</p><div class="table-wrap"><table><thead><tr><th>ROLE</th><th>PEOPLE</th><th>LOADED COST / YR</th><th>ASSIGNED</th><th>BENCH</th></tr></thead><tbody>${roles.map(r => `<tr><td>${esc(r.name)}</td><td><input class="mini" data-headcount="${r.id}" type="number" min="${r.assigned}" max="500" step="1" value="${r.headcount}" aria-label="${esc(r.name)} headcount"></td><td><input class="mini wide" data-rolecost="${r.id}" type="number" min="0" max="5000000" step="any" value="${r.cost}" aria-label="${esc(r.name)} loaded annual cost"></td><td>${r.assigned}</td><td>${r.available}</td></tr>`).join('')}</tbody></table></div><label class="switch"><input id="team-cost" type="checkbox" ${s.teamCost ? 'checked' : ''}> Charge team cost to project business cases</label></div>
<div class="panel"><h2>Move people</h2><form id="move-form" class="move-form"><label>Role<select name="role">${roles.map(r => option(r.id, esc(r.name), false)).join('')}</select></label><label>Number<input name="count" type="number" min="1" max="50" step="1" value="1" required></label><label>From<select name="from">${places('bench')}</select></label><label>To<select name="to">${places(state.projects[0]?.id)}</select></label><button class="btn primary">Move</button></form>${hints.length ? `<ul class="team-hints">${hints.map(h => `<li>${h}</li>`).join('')}</ul>` : '<p class="table-note">Every project has the people it needs.</p>'}</div></div>
<div class="panel table-panel"><div class="table-head"><div><h2>Allocation by project</h2><p>Assigned / needed for the build. Use − and + to move people to and from the bench.</p></div></div><div class="table-wrap"><table class="team-table"><thead><tr><th>PROJECT</th>${roles.map(r => `<th>${esc(r.name.toUpperCase())}</th>`).join('')}<th>STAFFING</th><th>TIME TO FULL BENEFIT</th><th>TEAM COST (${s.years} YRS)</th><th>NPV</th></tr></thead><tbody>${
    res.map(({ p, r }) => {
      const t = r.team,
        staffing = !t.planned ? badge('No team need', 'blue') : t.stalled ? badge('Stalled: no ' + t.bottleneck, 'red') : badge(Math.round(t.coverage * 100) + '%', t.coverage < 0.5 ? 'red' : t.coverage < 1 ? 'amber' : 'green'),
        change = t.monthsToFull - t.baseMonthsToFull;
      return `<tr><td><button class="name-button" data-project="${esc(p.id)}"><strong>${esc(p.name)}</strong><small>${esc(p.stage)}${state.excluded.includes(p.id) ? ' · excluded from portfolio' : ''} · run ${p.runNeed || 0} FTE</small></button></td>${roles.map(rr => cell(p, rr, rr)).join('')}<td>${staffing}</td><td><span class="${change > 0.05 ? 'late' : change < -0.05 ? 'early' : ''}">${months(t.baseMonthsToFull)} → ${months(t.monthsToFull)}</span></td><td>${short(t.totalCost)}</td><td><strong style="color:${r.npv > 0 ? 'var(--green)' : 'var(--red)'}">${short(r.npv)}</strong></td></tr>`;
    }).join('') || '<tr><td colspan="9" class="empty">No automations yet.</td></tr>'
  }</tbody></table></div><div class="table-foot"><span>Coverage = the most short-staffed role. Short → slower (time × 1 ÷ coverage). Over-staffed → faster with diminishing returns (time ÷ √coverage, at most twice as fast).</span><span>Full team charged while building, run FTE after.</span></div></div>`;
}
function render() {
  const labels = {
    overview: [
      'Portfolio overview',
      'Make every AI investment count.',
      'A clear view of value, capital returns, and the signals behind them.',
    ],
    scenarios: [
      'Scenario lab',
      'Test the case before you fund it.',
      'Explore uncertainty and see what changes your investment decision.',
    ],
    evidence: [
      'Evidence & health',
      'Look beyond the return.',
      'Baselines, adoption, and the early signals that keep the value case honest.',
    ],
    shared: [
      'Shared IT costs',
      'Share the platform bill fairly.',
      'Shared IT costs by category, split across departments and projects by each category’s basis.',
    ],
    team: [
      'Tech team',
      'Put people where the value is.',
      'Move the shared tech team between projects and see the effect on cost, timing and value.',
    ],
    method: [
      'Methodology',
      'Transparent assumptions. Defensible decisions.',
      'Understand the value framework and every calculation behind the portfolio.',
    ],
  };
  if (!labels[state.view]) state.view = 'overview';
  const l = labels[state.view];
  $('#breadcrumb').textContent = l[0];
  $('#title').textContent = l[1];
  $('#subtitle').textContent = l[2];
  $('.nav.active')?.classList.remove('active');
  $(`[data-view="${state.view}"]`).classList.add('active');
  $('#years').value = state.settings.years;
  $('#rate').value = state.settings.rate;
  document
    .querySelectorAll('[data-scenario]')
    .forEach(b => b.classList.toggle('selected', b.dataset.scenario === state.scenario));
  $('#view').innerHTML = { overview, scenarios, team, shared: sharedIt, evidence, method }[state.view]();
  bindView();
  save();
  if (selected && !$('#detail').hidden) {
    const p = state.projects.find(x => x.id === selected);
    if (p) {
      $('#detail-results').innerHTML = detailResults(p);
      $('#detail-cash').innerHTML = detailCash(p);
    }
  }
}
function sharedIt() {
  const st = state.settings,
    factor = st.costFactor / 100,
    alloc = sharedAllocation(state.projects, st),
    on = st.sharedCost !== false,
    cats = alloc.categories,
    total = cats.reduce((v, c) => v + c.cost, 0) * factor,
    unallocated = cats.reduce((v, c) => v + c.unallocated, 0) * factor,
    share = (p, id) => (alloc.byProject[p.id]?.byCategory[id] || 0) * factor,
    included = state.projects.filter(p => !state.excluded.includes(p.id)),
    toIncluded = included.reduce((v, p) => v + alloc.byProject[p.id].total, 0) * factor,
    departments = [...new Set(state.projects.map(p => p.team))].sort(),
    deptShare = (d, id) => state.projects.filter(p => p.team === d).reduce((v, p) => v + share(p, id), 0),
    cell = v => `<td>${v ? short(v) : '—'}</td>`,
    res = results();
  return `<div class="metrics"><div class="metric"><div class="metric-top">Shared IT costs</div><strong>${short(total)}</strong><small>Per year · ${cats.length} categories</small></div><div class="metric"><div class="metric-top">Charged to included projects</div><strong>${on ? short(toIncluded) : '—'}</strong><small>${on ? 'Enters their business cases' : 'Charging switched off'}</small></div><div class="metric"><div class="metric-top">Excluded projects</div><strong>${short(total - unallocated - toIncluded)}</strong><small>Still allocated, outside portfolio totals</small></div><div class="metric"><div class="metric-top">Unallocated</div><strong>${short(unallocated)}</strong><small>No project uses the basis</small></div></div>
<div class="panel"><div class="panel-head"><div><h2>Categories</h2><p>Annual cost and how each category is split. Costs are illustrative; enter your own.</p></div><button type="button" class="btn" id="add-shared">＋ Add category</button></div><div class="table-wrap"><table class="shared-table"><thead><tr><th>CATEGORY</th><th>ANNUAL COST</th><th>SPLIT BY</th><th>UNALLOCATED</th><th></th></tr></thead><tbody>${cats
    .map(
      (c, i) =>
        `<tr><td><input class="mini name" data-shared-name="${i}" value="${esc(c.name)}" maxlength="60" aria-label="Category name"></td><td><input class="mini wide" data-shared-cost="${i}" type="number" min="0" max="100000000" step="any" value="${c.cost}" aria-label="${esc(c.name)} annual cost"></td><td><select class="mini select" data-shared-driver="${i}" aria-label="${esc(c.name)} allocation basis">${Object.entries(sharedDrivers).map(([k, d]) => `<option value="${k}" ${c.driver === k ? 'selected' : ''}>${esc(d.label)}</option>`).join('')}</select></td><td>${c.unallocated ? short(c.unallocated * factor) : '—'}</td><td><button type="button" class="text-btn" data-shared-remove="${i}" aria-label="Remove ${esc(c.name)}">Remove</button></td></tr>`,
    )
    .join('') || '<tr><td colspan="5" class="empty">No shared categories. Add one to start.</td></tr>'}</tbody></table></div><label class="switch"><input id="shared-cost" type="checkbox" ${on ? 'checked' : ''}> Charge shared IT costs to project business cases</label></div>
<div class="panel table-panel" style="margin-top:22px"><div class="table-head"><div><h2>Split by department</h2><p>Each category is split across projects by its basis, then summed by the projects' department.</p></div></div><div class="table-wrap"><table><thead><tr><th>DEPARTMENT</th>${cats.map(c => `<th>${esc(c.name.toUpperCase())}</th>`).join('')}<th>TOTAL / YR</th><th>SHARE</th></tr></thead><tbody>${departments
    .map(d => {
      const t = cats.reduce((v, c) => v + deptShare(d, c.id), 0);
      return `<tr><td><strong>${esc(d)}</strong><small class="sub">${state.projects.filter(p => p.team === d).length} project${state.projects.filter(p => p.team === d).length === 1 ? '' : 's'}</small></td>${cats.map(c => cell(deptShare(d, c.id))).join('')}<td><strong>${short(t)}</strong></td><td>${total ? Math.round((t / total) * 100) + '%' : '—'}</td></tr>`;
    })
    .join('')}${unallocated ? `<tr><td>Unallocated</td>${cats.map(c => cell(c.unallocated * factor)).join('')}<td><strong>${short(unallocated)}</strong></td><td>${Math.round((unallocated / total) * 100)}%</td></tr>` : ''}<tr class="total"><td>Total</td>${cats.map(c => cell(c.cost * factor)).join('')}<td><strong>${short(total)}</strong></td><td>100%</td></tr></tbody></table></div></div>
<div class="panel table-panel" style="margin-top:22px"><div class="table-head"><div><h2>By project</h2><p>What each project carries, and its NPV with and without it.</p></div></div><div class="table-wrap"><table><thead><tr><th>PROJECT</th><th>DEPARTMENT</th>${cats.map(c => `<th>${esc(c.name.toUpperCase())}</th>`).join('')}<th>TOTAL / YR</th><th>NPV</th><th>NPV WITHOUT SHARED IT</th></tr></thead><tbody>${res
    .map(({ p, r }) => {
      const without = calculate(p, { ...withShares(state.projects, st), sharedCost: false }).npv;
      return `<tr><td><button class="name-button" data-project="${esc(p.id)}"><strong>${esc(p.name)}</strong><small>${esc(p.stage)}${state.excluded.includes(p.id) ? ' · excluded' : ''}</small></button></td><td>${esc(p.team)}</td>${cats.map(c => cell(share(p, c.id))).join('')}<td><strong>${short(alloc.byProject[p.id].total * factor)}</strong></td><td><strong style="color:${r.npv > 0 ? 'var(--green)' : 'var(--red)'}">${short(r.npv)}</strong></td><td>${short(without)}</td></tr>`;
    })
    .join('')}</tbody></table></div><div class="table-foot"><span>Bases use inputs only: compute spend, people assigned, stage and data sensitivity. Moving people on the Tech team page changes the data-platform and licence split.</span><span>Annual cost × cost multiplier, charged monthly from month 1.</span></div></div>`;
}
function bindView() {
  $('#method-toggle')?.addEventListener('click', () => {
    methodAdvanced = !methodAdvanced;
    render();
    $('#method-toggle').focus();
  });
  $('#method-project')?.addEventListener('change', e => {
    methodProject = e.target.value;
    render();
    $('#method-project').focus();
  });
  document.querySelectorAll('[data-method-jump]').forEach(
    a =>
      (a.onclick = e => {
        e.preventDefault();
        document.getElementById('m-' + a.dataset.methodJump)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      }),
  );
  document.querySelectorAll('[data-project]').forEach(b => (b.onclick = () => openDetail(b.dataset.project)));
  document.querySelectorAll('[data-include]').forEach(
    b =>
      (b.onchange = () => {
        state.excluded = b.checked
          ? state.excluded.filter(id => id !== b.dataset.include)
          : [...state.excluded, b.dataset.include];
        render();
      }),
  );
  $('#search')?.addEventListener('input', e => {
    const pos = e.target.selectionStart;
    query = e.target.value;
    render();
    $('#search').focus();
    $('#search').setSelectionRange(pos, pos);
  });
  document.querySelectorAll('[data-setting]').forEach(
    i =>
      (i.oninput = e => {
        const key = i.dataset.setting;
        state.settings[key] = +i.value;
        state.scenario = 'custom';
        const draft = document.createElement('div');
        draft.innerHTML = scenarios();
        $('.metrics').replaceWith(draft.querySelector('.metrics'));
        const output = $('.scenario-grid > .panel:last-child');
        output.replaceWith(draft.querySelector('.scenario-grid > .panel:last-child'));
        $('#' + key + '-value').textContent = i.value + (key === 'delay' ? ' months' : '%');
        document.querySelectorAll('[data-scenario]').forEach(b => b.classList.remove('selected'));
        save();
        if (selected) {
          const p = state.projects.find(x => x.id === selected);
          $('#detail-results').innerHTML = detailResults(p);
          $('#detail-cash').innerHTML = detailCash(p);
        }
      }),
  );
  $('#capacity')?.addEventListener('change', e => {
    state.settings.capacity = e.target.checked;
    render();
  });
  document.querySelectorAll('[data-prob]').forEach(
    i =>
      (i.onchange = () => {
        if (i.value === '' || !i.checkValidity()) {
          i.reportValidity();
          return;
        }
        state.settings[i.dataset.prob] = +i.value;
        render();
      }),
  );
  document.querySelectorAll('[data-step-alloc]').forEach(
    b =>
      (b.onclick = () => {
        const key = b.dataset.stepAlloc,
          [id, role, step] = key.split('|');
        if (+step > 0) moveTeam(role, 'bench', id, 1);
        else moveTeam(role, id, 'bench', 1);
        render();
        const again = document.querySelector(`[data-step-alloc="${CSS.escape(key)}"]`);
        (again && !again.disabled ? again : document.querySelector(`[data-step-alloc="${CSS.escape(id + '|' + role + '|' + -step)}"]`))?.focus();
      }),
  );
  document.querySelectorAll('[data-headcount],[data-rolecost]').forEach(
    i =>
      (i.onchange = () => {
        if (i.value === '' || !i.checkValidity()) {
          i.classList.add('invalid');
          i.reportValidity();
          return;
        }
        const r = state.settings.team.find(x => x.id === (i.dataset.headcount || i.dataset.rolecost));
        r[i.dataset.headcount ? 'headcount' : 'cost'] = +i.value;
        render();
      }),
  );
  document.querySelectorAll('[data-shared-cost],[data-shared-name],[data-shared-driver]').forEach(
    i =>
      (i.onchange = () => {
        const c = state.settings.shared[+(i.dataset.sharedCost ?? i.dataset.sharedName ?? i.dataset.sharedDriver)];
        if (i.dataset.sharedName !== undefined) {
          if (!i.value.trim()) return i.classList.add('invalid');
          c.name = i.value.trim();
        } else if (i.dataset.sharedDriver !== undefined) c.driver = i.value;
        else {
          if (i.value === '' || !i.checkValidity()) {
            i.classList.add('invalid');
            i.reportValidity();
            return;
          }
          c.cost = +i.value;
        }
        render();
      }),
  );
  document.querySelectorAll('[data-shared-remove]').forEach(
    b =>
      (b.onclick = () => {
        const c = state.settings.shared[+b.dataset.sharedRemove];
        if (!confirm(`Remove the ${c.name} category?`)) return;
        state.settings.shared.splice(+b.dataset.sharedRemove, 1);
        render();
      }),
  );
  $('#add-shared')?.addEventListener('click', () => {
    state.settings.shared.push({ id: crypto.randomUUID(), name: 'New category', cost: 0, driver: 'equal' });
    render();
    document.querySelector(`[data-shared-name="${state.settings.shared.length - 1}"]`)?.select();
  });
  $('#shared-cost')?.addEventListener('change', e => {
    state.settings.sharedCost = e.target.checked;
    render();
  });
  $('#team-cost')?.addEventListener('change', e => {
    state.settings.teamCost = e.target.checked;
    render();
  });
  $('#move-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target),
      role = state.settings.team.find(r => r.id === f.get('role')),
      name = id => (id === 'bench' ? 'the bench' : state.projects.find(p => p.id === id)?.name),
      moved = moveTeam(f.get('role'), f.get('from'), f.get('to'), +f.get('count'));
    toast(
      moved
        ? `Moved ${moved} ${moved === 1 ? 'person' : 'people'} (${role.name}) from ${name(f.get('from'))} to ${name(f.get('to'))}`
        : f.get('from') === f.get('to')
          ? 'Choose a different destination'
          : `No ${role.name} available on ${name(f.get('from'))}`,
    );
    if (moved) render();
  });
  $('#scope')?.addEventListener('change', e => {
    state.scenarioScope = e.target.value;
    render();
    $('#scope').focus();
  });
}
const specs = [
  ['upfront', 'Implementation ($)', 0, 1e9],
  ['data', 'Data preparation ($)', 0, 1e9],
  ['training', 'Training & change ($)', 0, 1e9],
  ['compute', 'Annual compute ($)', 0, 1e9],
  ['storage', 'Annual storage ($)', 0, 1e9],
  ['maintenance', 'Annual maintenance ($)', 0, 1e9],
  ['oversight', 'Annual oversight ($)', 0, 1e9],
  ['direct', 'Annual direct savings ($)', 0, 1e9],
  ['indirect', 'Annual indirect gains ($)', 0, 1e9],
  ['indirectCash', 'Indirect cash share (%)', 0, 100],
  ['hours', 'Hours recovered / year', 0, 1e7],
  ['hourly', 'Loaded cost / hour ($)', 0, 10000],
  ['realization', 'Capacity realization (%)', 0, 100],
  ['adoption', 'User adoption (%)', 0, 100],
  ['ramp', 'Ramp to full benefit (mo)', 1, 60],
  ['delay', 'Project delay (mo)', 0, 60],
  ['growth', 'Annual benefit growth (%)', 0, 50],
  ['costGrowth', 'Annual cost growth (%)', 0, 50],
  ['before', 'Baseline metric', 0, 1e9],
  ['after', 'Observed metric', 0, 1e9],
  ['target', 'Business KPI target', 0, 1e9],
  ['pipeline', 'Pipeline health (%)', 0, 100],
  ['accuracy', 'Model accuracy (%)', 0, 100],
  ['accuracyTarget', 'Accuracy target (%)', 0, 100],
  ['trend', 'Accuracy trend (pp/mo)', -10, 10],
  ['computeBudget', 'Annual compute budget ($)', 0, 1e9],
  ['age', 'Months since launch', 0, 120],
];
function detailResults(p) {
  const r = calc(p);
  return `<div class="detail-results"><div><small>NPV</small><strong>${short(r.npv)}</strong></div><div><small>Payback</small><strong>${pb(r.payback)}</strong></div><div><small>ROI (total costs)</small><strong>${pct(r.roi)}</strong></div><div><small>IRR (annualized)</small><strong>${pct(r.irr)}</strong></div><div><small>Risk-adjusted NPV</small><strong>${short(r.riskAdjustedNPV)}</strong></div><div><small>Year-1 funding</small><strong>${short(r.fundingRequest)}</strong></div><div><small>Evidence-adjusted NPV</small><strong>${r.evidence.applicable ? short(r.evidence.npv) : '—'}</strong></div><div><small>KPI progress</small><strong>${r.evidence.applicable ? Math.round(r.evidence.progress * 100) + '%' : '—'}</strong></div></div><p class="evidence">${recBadge(r.recommendation, r.cautions)} · ${r.health.action} · ${state.settings.capacity ? 'Includes capacity proxy' : 'Cash benefits only'}</p>`;
}
function detailCash(p) {
  const r = calc(p);
  return `<h3>Cash flow audit</h3><div class="table-wrap"><table><thead><tr><th>YEAR</th><th>EST. BENEFITS</th><th>OP. COSTS</th><th>NET</th></tr></thead><tbody><tr><td>Start</td><td>—</td><td>${short(r.cap)} setup</td><td>${short(-r.cap)}</td></tr>${r.yearly.map(y => `<tr><td>${y.year}</td><td>${short(y.benefit)}</td><td>${short(y.cost)}</td><td>${short(y.net)}</td></tr>`).join('')}</tbody></table></div><p class="evidence">Year-1 funding request: <b>${money(r.fundingRequest)}</b> · Total cost of ownership (${state.settings.years} yrs): <b>${money(r.totalCosts)}</b><br>Break-even: estimated benefits at <b>${r.breakEven.benefits === null ? 'N/A' : Math.round(r.breakEven.benefits * 100) + '%'}</b> of estimate · adoption <b>${r.breakEven.adoption === null ? 'N/A' : r.breakEven.adoption > 100 ? 'not reachable' : r.breakEven.adoption.toFixed(0) + '%'}</b> · cost headroom <b>${r.breakEven.costHeadroom === null ? 'N/A' : Math.round(r.breakEven.costHeadroom * 100) + '%'}</b><br>Evidence: <b>${evidenceText(r)}</b>${r.evidence.applicable ? ` → evidence-adjusted NPV <b>${short(r.evidence.npv)}</b> vs forecast ${short(r.npv)}` : ''}<br>Compute: <b>${r.compute.overrun === null ? 'no budget set' : (r.compute.overrun > 0 ? '+' : '') + Math.round(r.compute.overrun * 100) + '% vs budget'}</b>${r.compute.pvCost > 0 ? ` · overrun costs <b>${short(r.compute.pvCost)}</b> over ${state.settings.years} yrs (PV)` : ''}<br>Probability of success: <b>${probabilityText(r.success)}</b>${r.success.unassessed.length ? `<br><span class="flag">Not assessed (neutral, × 1): ${esc(r.success.unassessed.join(', '))}. Rate them to make the probability reliable.</span>` : ''}${r.success.overrideMissingReason ? '<br><span class="flag">Override not applied: add a reason.</span>' : ''}<br>Shared IT: <b>${r.shared.annual ? short(r.shared.annual) + '/yr' : state.settings.sharedCost === false ? 'not charged' : 'none'}</b>${r.shared.annual ? ' (' + state.settings.shared.filter(c => r.shared.byCategory[c.id]).map(c => `${esc(c.name)} ${short(r.shared.byCategory[c.id])}`).join(' · ') + ')' : ''}<br>Tech team: <b>${r.team.planned ? (r.team.stalled ? 'stalled, no ' + esc(r.team.bottleneck) : Math.round(r.team.coverage * 100) + '% staffed') : 'no team need entered'}</b> · ${r.team.stalled ? '<b>benefits never start</b>' : `full benefit in <b>${months(r.team.monthsToFull)}</b>`} (plan ${months(r.team.baseMonthsToFull)}) · team cost <b>${money(r.team.totalCost)}</b><br>Unit economics (steady state): <b>${r.unit ? `${Math.round(r.unit.volume).toLocaleString('en-US')} ${esc(p.volumeUnit)}/yr · cost ${unitMoney(r.unit.cost)} · benefit ${unitMoney(r.unit.benefit)} · net ${unitMoney(r.unit.net)} per unit` : 'set annual volume to calculate'}</b><br>Delivery readiness: <b>${r.readiness.status}</b> · Compliance: <b>${r.compliance.status}${r.compliance.missing.length ? ' (' + esc(r.compliance.missing.join(', ')) + ')' : ''}</b><br>ROI (total costs): <b>${pct(r.roi)}</b> · Capital ROI (initial capital): <b>${r.cap ? pct(r.capitalROI) : 'N/A'}</b><br>Discounted payback: <b>${pb(r.discountedPayback)}</b><br>Reference simplified payback: <b>${p.direct + r.capacity - operating(p) > 0 ? pb(r.referencePayback) : 'Not reached'}</b><br>Recovered capacity proxy, before adoption: <b>${money(r.capacity)}/year</b></p>`;
}
function openDetail(id) {
  selected = id;
  const p = state.projects.find(x => x.id === id);
  if (!p) return;
  $('#detail').hidden = false;
  $('#detail').innerHTML =
    `<div class="detail-head"><div><div class="eyebrow">LIVE BUSINESS CASE</div><h2>${esc(p.name)}</h2></div><button class="close" id="close-detail" aria-label="Close project">×</button></div><p class="description">${esc(p.description)}</p><div id="detail-results">${detailResults(p)}</div><p class="detail-note">Illustrative assumptions. Changes update all portfolio views immediately and save in this browser.</p><h3>Investment & full operating costs</h3><div class="fields">${specs.slice(0, 7).map(fieldMarkup).join('')}</div><h3>Estimated benefits & delivery assumptions</h3><div class="fields">${specs.slice(7, 18).map(fieldMarkup).join('')}</div><h3>Tech team</h3><div class="fields">${state.settings.team.map(r => `<label>${esc(r.name)} needed<input data-need="${r.id}" type="number" min="0" max="100" step="1" value="${p.need?.[r.id] || 0}"><small class="field-error" hidden></small></label>`).join('')}${fieldMarkup(['runNeed', 'Run support after launch (FTE)', 0, 100])}</div><p class="detail-note">Assigned now: ${state.settings.team.map(r => `${esc(r.name)} ${p.alloc?.[r.id] || 0}`).join(' · ')}. <button type="button" class="text-btn" data-go-team>Move people on the Tech team page →</button></p><h3>Usage & unit economics</h3><div class="fields">${fieldMarkup(['volume', 'Annual volume at full adoption', 0, 1e12])}<label>Volume unit<input data-text="volumeUnit" value="${esc(p.volumeUnit)}" maxlength="40"></label>${fieldMarkup(['unitCost', 'Usage-based cost per unit ($)', 0, 1e6])}</div><h3>Readiness & compliance</h3><div class="fields">${[
      ['dataReadiness', 'Data readiness risk'],
      ['integration', 'Integration complexity'],
      ['vendorRisk', 'Vendor dependency'],
      ['teamCapacity', 'Team capacity risk'],
    ]
      .map(
        ([k, l]) =>
          `<label>${l}${k === 'teamCapacity' && Object.values(p.need || {}).some(Boolean) ? ' <small class="muted">(set from Tech team staffing)</small>' : ''}<select data-text="${k}" ${k === 'teamCapacity' && Object.values(p.need || {}).some(Boolean) ? 'disabled' : ''}>${[
            ['Not assessed', 'Not assessed'],
            ['Low', 'Low risk'],
            ['Medium', 'Medium risk'],
            ['High', 'High risk'],
          ]
            .map(([v, t]) => `<option value="${v}" ${p[k] === v ? 'selected' : ''}>${t}</option>`)
            .join('')}</select></label>`,
      )
      .join('')}${[
      ['dataSensitivity', 'Data sensitivity', ['Public', 'Internal', 'Confidential', 'Personal']],
      ['aiRisk', 'AI risk level', ['Minimal', 'Limited', 'High']],
      ['securityReview', 'Security review', ['Not started', 'In progress', 'Approved']],
      ['legalReview', 'Legal & privacy review', ['Not started', 'In progress', 'Approved']],
      ['modelRiskReview', 'Model risk review', ['Not started', 'In progress', 'Approved']],
    ]
      .map(
        ([k, l, opts]) =>
          `<label>${l}<select data-text="${k}">${opts.map(v => `<option ${p[k] === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`,
      )
      .join(
        '',
      )}</div><div class="override"><label class="switch"><input type="checkbox" data-check="probOverrideOn" ${p.probOverrideOn ? 'checked' : ''}> Override probability of success</label><div class="fields">${fieldMarkup(['probOverride', 'Override probability (%)', 0, 100])}<label class="wide">Reason (required)<input data-text="probReason" value="${esc(p.probReason)}" maxlength="200" placeholder="e.g. Vendor contract already signed"></label></div></div><h3>Evidence & leading indicators</h3><div class="fields"><label>KPI name<input data-text="kpi" value="${esc(p.kpi)}" maxlength="80"></label><label>Metric unit<input data-text="unit" value="${esc(p.unit)}" maxlength="20"></label>${specs.slice(18).map(fieldMarkup).join('')}<label>Baseline quality<select data-text="baseline">${['Verified', 'Partial', 'Missing'].map(v => `<option ${p.baseline === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>Sponsor engagement<select data-text="sponsor">${['Engaged', 'Limited', 'Missing'].map(v => `<option ${p.sponsor === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>Stage<select data-text="stage">${['Idea', 'Pilot', 'Production'].map(v => `<option ${p.stage === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>Executive owner<input data-text="owner" value="${esc(p.owner)}" maxlength="60"></label><label class="wide">Evidence, attribution & next steps<textarea data-text="evidence" rows="4" maxlength="2500">${esc(p.evidence)}</textarea></label></div><div id="detail-cash">${detailCash(p)}</div><div class="detail-actions"><button class="btn" id="duplicate">Duplicate case</button><button class="btn" id="remove">Remove automation</button></div>`;
  function fieldMarkup([key, label, min, max]) {
    const whole = ['ramp', 'delay', 'age'].includes(key);
    return `<label>${label}<input data-field="${key}" type="number" inputmode="decimal" min="${min}" max="${max}" step="${whole ? 1 : 'any'}" value="${p[key]}"><small class="field-error" hidden></small></label>`;
  }
  $('#close-detail').onclick = closeDetail;
  $('#detail')
    .querySelectorAll('[data-field]')
    .forEach(
      i =>
        (i.oninput = () => {
          const error = i.parentElement.querySelector('.field-error'),
            bad = i.value === '' || !i.checkValidity();
          i.classList.toggle('invalid', bad);
          error.hidden = !bad;
          if (bad) {
            error.textContent = `${i.value === '' ? 'Enter a value.' : i.validationMessage} Still using ${p[i.dataset.field]}.`;
            return;
          }
          p[i.dataset.field] = +i.value;
          updateDetail(p);
        }),
    );
  $('#detail')
    .querySelectorAll('[data-text]')
    .forEach(
      i =>
        (i.oninput = () => {
          p[i.dataset.text] = i.value;
          updateDetail(p);
        }),
    );
  $('#detail')
    .querySelectorAll('[data-check]')
    .forEach(
      i =>
        (i.onchange = () => {
          p[i.dataset.check] = i.checked;
          updateDetail(p);
        }),
    );
  $('#detail')
    .querySelectorAll('[data-need]')
    .forEach(
      i =>
        (i.oninput = () => {
          const error = i.parentElement.querySelector('.field-error'),
            bad = i.value === '' || !i.checkValidity();
          i.classList.toggle('invalid', bad);
          error.hidden = !bad;
          if (bad) {
            error.textContent = `${i.value === '' ? 'Enter a value.' : i.validationMessage} Still using ${p.need[i.dataset.need] || 0}.`;
            return;
          }
          p.need = { ...p.need, [i.dataset.need]: +i.value };
          updateDetail(p);
        }),
    );
  $('#detail').querySelector('[data-go-team]').onclick = () => {
    state.view = 'team';
    render();
  };
  $('#duplicate').onclick = () => {
    const copy = structuredClone(p),
      roles = roleUsage();
    copy.id = crypto.randomUUID();
    copy.name += ' (comparison)';
    // A copy can only take people who are free; the shortfall shows up as slower delivery.
    for (const r of roles) copy.alloc[r.id] = Math.min(copy.alloc[r.id] || 0, Math.max(0, r.available));
    const shortBy = roles.reduce((v, r) => v + (p.alloc[r.id] || 0) - copy.alloc[r.id], 0);
    state.projects.push(copy);
    render();
    openDetail(copy.id);
    toast(shortBy ? `Comparison case added; ${shortBy} people were not free to assign` : 'Comparison case added');
  };
  $('#remove').onclick = () => {
    if (!confirm(`Remove ${p.name} from this browser's portfolio?`)) return;
    state.projects = state.projects.filter(x => x.id !== id);
    state.excluded = state.excluded.filter(x => x !== id);
    closeDetail();
    render();
    toast('Automation removed');
  };
  $('#close-detail').focus();
}
function updateDetail(p) {
  $('#detail-results').innerHTML = detailResults(p);
  $('#detail-cash').innerHTML = detailCash(p);
  render();
}
function closeDetail() {
  $('#detail').hidden = true;
  const id = selected;
  selected = null;
  $(`[data-project="${id}"]`)?.focus();
}
const wizardProject = d => buildProject(d, roleUsage());
const stepByKey = k => wizardSteps.find(x => x.key === k);
let wiz = { step: 'idea', draft: { ...wizardBlank }, reviewed: false };
// A detail step counts as added once any of its answers differs from the blank draft.
const detailAdded = step => step.fields.some(([k]) => String(wiz.draft[k] ?? '') !== String(wizardBlank[k] ?? ''));
function wizardField([key, label, type, o = {}]) {
  if (type === 'heading') return `<h3 class="wizard-heading">${esc(label)}</h3>`;
  const v = wiz.draft[key] ?? '',
    req = o.required ? ' required' : '';
  let input;
  if (type === 'select')
    input = `<select name="${key}">${o.options
      .map(x => {
        const [val, txt] = Array.isArray(x) ? x : [x, x];
        return `<option value="${val}" ${v === val ? 'selected' : ''}>${txt}</option>`;
      })
      .join('')}</select>`;
  else if (type === 'textarea')
    input = `<textarea name="${key}" rows="3" maxlength="${o.maxlength}" placeholder="${esc(o.placeholder || '')}">${esc(v)}</textarea>`;
  else if (type === 'text')
    input = `<input name="${key}" value="${esc(v)}" maxlength="${o.maxlength}" placeholder="${esc(o.placeholder || '')}"${req}>`;
  else {
    const m = type === 'money';
    input = `<input name="${key}" type="number" inputmode="decimal" min="${m ? 0 : o.min}" max="${m ? 1e9 : o.max}" step="${o.step ?? 'any'}" value="${esc(v)}"${req}>`;
  }
  return `<label${o.wide ? ' class="wide"' : ''}>${esc(label)}${o.required ? ' <em aria-hidden="true">*</em>' : ''}${input}${o.help ? `<small>${esc(o.help)}</small>` : ''}</label>`;
}
function wizardPreview() {
  const p = { ...wizardProject(wiz.draft), id: '__draft' },
    r = calc(p, state.settings, [...state.projects, p]);
  if (!r.cap && !p.direct)
    return '<p>Answer the cost and benefit questions to see the business case take shape.</p>';
  return `<div><small>Year-1 funding</small><strong>${short(r.fundingRequest)}</strong></div><div><small>Risk-adjusted NPV</small><strong>${short(r.riskAdjustedNPV)}</strong></div><div><small>NPV</small><strong style="color:${r.npv > 0 ? 'var(--green)' : 'var(--red)'}">${short(r.npv)}</strong></div><div><small>Payback</small><strong>${pb(r.payback)}</strong></div><p>Live preview · ${esc(state.scenario)} scenario · ${state.settings.rate}% hurdle · ${state.settings.years} years · ${state.settings.capacity ? 'includes capacity' : 'cash benefits only'}</p>`;
}
function wizardReview() {
  const p = { ...wizardProject(wiz.draft), id: '__draft' },
    r = calc(p, state.settings, [...state.projects, p]),
    d = wiz.draft,
    row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`,
    section = (title, step, rows) =>
      `<section><div class="review-head"><h3>${title}</h3><button type="button" class="text-btn" data-step="${step}">Edit</button></div><dl>${rows.join('')}</dl></section>`;
  const warnings = [
    p.baseline !== 'Verified' &&
      (p.stage === 'Idea'
        ? 'No verified baseline yet: measure one before the pilot so results can be proven.'
        : 'Baseline is not verified, so the recommendation will be Intervene until evidence is in place.'),
    ...r.cautions,
    p.direct > 0 &&
      p.hours > 0 &&
      'Direct savings and recovered hours are both entered. Confirm they do not describe the same labour.',
    r.npv <= 0 && 'NPV is not positive at the current hurdle rate and horizon.',
    r.payback === null && 'Payback is not reached within the selected horizon.',
    p.adoption < 40 &&
      'Adoption below 40% will trigger health alerts once the project has been live for three months.',
    (d.pipeline === '' || d.accuracy === '') &&
      'Some health indicators are not measured yet and are shown as neutral.',
    r.compliance.status === 'Blocked' &&
      `Required approvals missing (${r.compliance.missing.join(', ')}), so the recommendation will be Intervene.`,
    r.compliance.status === 'Pending' && `Before launch, complete: ${r.compliance.missing.join(', ')}.`,
    r.readiness.status === 'Not ready' && 'Two or more delivery risks are rated high.',
    r.readiness.status === 'Incomplete' && `Not assessed yet: ${r.success.unassessed.join(', ')}. They don't lower the probability of success until rated.`,
    p.unitCost > 0 &&
      !p.volume &&
      'A usage-based cost is entered without annual volume, so it has no effect.',
    r.team.planned && r.team.stalled && `No ${r.team.bottleneck} are free, so benefits never start. Free people on the Tech team page.`, r.team.planned && !r.team.stalled && r.team.coverage < 1 && `Only ${r.team.assigned} of ${r.team.needed} needed people are free, so full benefit takes ${months(r.team.monthsToFull)} instead of ${months(r.team.baseMonthsToFull)}.`, !r.team.planned && 'No tech team need entered, so team cost and staffing delays are not modelled.',
  ].filter(Boolean);
  const summaries = {
      usage: [
        row('Usage-based cost', p.unitCost && p.volume ? `${unitMoney(p.unitCost)} per unit · ${Math.round(p.volume).toLocaleString('en-US')} ${esc(p.volumeUnit)}/yr` : 'None'),
        row('Compute budget', money(p.computeBudget) + '/yr'),
        row('Capacity value', `${money(r.capacity)}/yr ${state.settings.capacity ? '(included)' : '(reported, not in cash)'}`),
      ],
      team: [
        row('Tech team', r.team.planned ? `${r.team.assigned} of ${r.team.needed} needed are free to assign` : 'No team need entered'),
        row('Full benefit', r.team.stalled ? 'Never: a needed role has nobody free' : 'in ' + months(r.team.monthsToFull)),
        row('Run support', (p.runNeed || 0) + ' FTE'),
      ],
      readiness: [
        row('Delivery readiness', esc(r.readiness.status)),
        row('Compliance', esc(r.compliance.status) + (r.compliance.missing.length ? ' · ' + esc(r.compliance.missing.join(', ')) : '')),
        row('Data · AI risk', `${esc(p.dataSensitivity)} · ${esc(p.aiRisk)}`),
      ],
      evidence: [
        row('KPI', `${esc(p.kpi)}: ${p.before} → ${p.target} ${esc(p.unit)}`),
        row('Baseline', esc(p.baseline)),
        row('Health', `${r.health.action} · sponsor ${esc(p.sponsor)}`),
      ],
    },
    details = detailSteps
      .map(x =>
        detailAdded(x)
          ? section(esc(x.title), x.key, summaries[x.key])
          : `<section class="add-detail"><h3>${esc(x.title)}</h3><p>${esc(x.why)}</p><button type="button" class="btn" data-step="${x.key}">＋ Add</button></section>`,
      )
      .join('');
  return `<div class="wizard-review">${section('The idea', 'idea', [row('Automation', esc(p.name)), row('Owner', `${esc(p.owner)} · ${esc(p.team)}`), row('Stage', `${esc(p.stage)} · ${p.age} months live`)])}${section('Costs', 'costs', [row('Initial capital', money(r.cap)), row('Annual running costs', money(r.op)), row('Year-1 funding request', money(r.fundingRequest))])}${section('Estimated benefits', 'benefits', [row('Direct savings', money(p.direct) + '/yr'), row('Cash share of indirect gains', money((p.indirect * p.indirectCash) / 100) + '/yr'), row('Adoption · ramp · delay', `${p.adoption}% · ${p.ramp} mo · ${p.delay} mo`)])}<section class="review-result"><h3>Result</h3><dl>${row('NPV', short(r.npv))}${row('Payback', pb(r.payback))}${row('ROI', pct(r.roi))}${row('Risk-adjusted NPV', short(r.riskAdjustedNPV))}${row('Probability of success', Math.round(r.success.value) + '%')}${row('Recommendation', recBadge(r.recommendation, r.cautions))}</dl></section><h3 class="review-sub">Add detail (optional)</h3>${details}${warnings.length ? `<ul class="review-warnings">${warnings.map(w => `<li>${w}</li>`).join('')}</ul>` : ''}</div>`;
}
function renderWizard() {
  const s = stepByKey(wiz.step),
    core = coreSteps.indexOf(s),
    isReview = s.key === 'review',
    form = $('#add-form');
  const bar = coreSteps
      .map(
        (x, i) =>
          `<li class="${core < 0 || i < core ? 'done' : i === core ? 'current' : ''}"><button type="button" data-step="${x.key}" ${i === core ? 'aria-current="step"' : ''} ${i > core && core >= 0 && !wiz.reviewed ? 'disabled' : ''}>${esc(x.title)}</button></li>`,
      )
      .join(''),
    chips = wiz.reviewed
      ? `<div class="wizard-details"><span>Add detail:</span>${detailSteps.map(x => `<button type="button" class="chip${detailAdded(x) ? ' added' : ''}${x === s ? ' current' : ''}" data-step="${x.key}" ${x === s ? 'aria-current="step"' : ''}>${detailAdded(x) ? '✓' : '＋'} ${esc(x.title)}</button>`).join('')}</div>`
      : '',
    eyebrow = s.optional ? 'NEW INVESTMENT · OPTIONAL DETAIL' : `NEW INVESTMENT · STEP ${core + 1} OF ${coreSteps.length}`,
    back = s.optional
      ? '<button type="button" class="btn" data-step="review">← Back to review</button>'
      : core
        ? '<button type="button" class="btn" id="wizard-back">← Back</button>'
        : '<button type="button" class="btn" id="wizard-cancel">Cancel</button>',
    primary = s.optional ? 'Save and return to review' : isReview ? 'Add to portfolio' : 'Next →';
  form.innerHTML = `<div class="wizard-top"><div class="eyebrow">${eyebrow}</div><button type="button" class="close" id="wizard-close" aria-label="Close questionnaire">×</button></div><ol class="wizard-steps">${bar}</ol>${chips}<h2 id="wizard-title">${esc(s.title)}</h2><p>${esc(s.intro)}</p>${s.note ? `<p class="detail-note">${esc(s.note)}</p>` : ''}${isReview ? wizardReview() : `<div class="fields">${s.fields.map(wizardField).join('')}</div><div class="wizard-preview" id="wizard-preview" aria-live="polite">${wizardPreview()}</div>`}<div class="dialog-actions">${back}<button class="btn primary">${primary}</button></div>`;
  form.querySelectorAll('[name]').forEach(
    i =>
      (i.oninput = () => {
        wiz.draft[i.name] = i.value;
        $('#wizard-preview') && ($('#wizard-preview').innerHTML = wizardPreview());
      }),
  );
  form.querySelectorAll('[data-step]').forEach(
    b =>
      (b.onclick = () => {
        wiz.step = b.dataset.step;
        renderWizard();
        form.closest('dialog').scrollTop = 0;
      }),
  );
  $('#wizard-back') &&
    ($('#wizard-back').onclick = () => {
      wiz.step = coreSteps[core - 1].key;
      renderWizard();
    });
  $('#wizard-cancel') && ($('#wizard-cancel').onclick = () => $('#add-dialog').close());
  $('#wizard-close').onclick = () => $('#add-dialog').close();
  (form.querySelector('[name]') || form.querySelector('.btn.primary')).focus();
}
function openWizard() {
  wiz = { step: 'idea', draft: { ...wizardBlank }, reviewed: false };
  renderWizard();
  $('#add-dialog').showModal();
  $('#add-form [name]').focus();
}
$('#add-form').onsubmit = e => {
  e.preventDefault();
  const form = e.target,
    s = stepByKey(wiz.step),
    go = key => {
      wiz.step = key;
      renderWizard();
      form.closest('dialog').scrollTop = 0;
    };
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  if (s.optional) return go('review');
  if (s.key !== 'review') {
    const next = coreSteps[coreSteps.indexOf(s) + 1];
    if (next.key === 'review') wiz.reviewed = true;
    return go(next.key);
  }
  // Every required core answer must be present before the project is added.
  const missing = coreSteps.find(x =>
    (x.fields || []).some(([k, , , o = {}]) => o.required && String(wiz.draft[k] ?? '').trim() === ''),
  );
  if (missing) {
    go(missing.key);
    form.reportValidity();
    return;
  }
  const p = { ...wizardProject(wiz.draft), id: crypto.randomUUID() };
  state.projects.push(p);
  $('#add-dialog').close();
  render();
  openDetail(p.id);
  toast('Automation added');
};
document.querySelectorAll('[data-view]').forEach(
  b =>
    (b.onclick = () => {
      state.view = b.dataset.view;
      render();
    }),
);
document.querySelectorAll('[data-scenario]').forEach(
  b =>
    (b.onclick = () => {
      state.scenario = b.dataset.scenario;
      Object.assign(state.settings, scenarioPresets[state.scenario]);
      render();
      if (selected) openDetail(selected);
    }),
);
$('#years').onchange = e => {
  state.settings.years = +e.target.value;
  render();
  if (selected) openDetail(selected);
};
$('#rate').oninput = e => {
  const bad = e.target.value === '' || !e.target.checkValidity();
  e.target.classList.toggle('invalid', bad);
  e.target.title = bad ? `Enter 0–80%. Still using ${state.settings.rate}%.` : '';
  if (bad) return;
  state.settings.rate = +e.target.value;
  render();
  if (selected) {
    const p = state.projects.find(x => x.id === selected);
    $('#detail-results').innerHTML = detailResults(p);
    $('#detail-cash').innerHTML = detailCash(p);
  }
};
$('#reset').onclick = () => {
  if (!confirm('Reset all local changes and restore the five examples?')) return;
  state = { ...freshState(), view: state.view };
  query = '';
  closeDetail();
  render();
  toast('Example portfolio restored');
};
$('#add').onclick = openWizard;
const download = (blob, name) => {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const stamp = () => new Date().toISOString().slice(0, 10);
// Excel workbook with live formulas for the current portfolio; loaded on demand.
$('#export').onclick = async () => {
  const button = $('#export');
  button.disabled = true;
  button.textContent = 'Preparing workbook…';
  try {
    const { exportWorkbook } = await import('./excel.js'),
      bytes = await exportWorkbook(state);
    download(
      new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `ai-capital-portfolio-${stamp()}.xlsx`,
    );
    toast('Excel workbook exported with live formulas');
  } catch (err) {
    console.error(err);
    toast('Excel export failed; try the JSON export');
  } finally {
    button.disabled = false;
    button.textContent = '↓ Export portfolio';
  }
};
$('#export-json').onclick = () => {
  const payload = {
    exportedAt: new Date().toISOString(),
    currency: 'USD',
    ...state,
    results: results().map(({ p, r }) => ({ id: p.id, ...r })),
    portfolio: portfolio(),
  };
  download(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `ai-capital-portfolio-${stamp()}.json`);
  toast('Assumptions and results exported');
};
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('#add-dialog').open) closeDetail();
});
render();
