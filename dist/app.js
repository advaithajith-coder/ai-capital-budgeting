import {
  defaults,
  projectDefaults,
  examples,
  calculate,
  health,
  setup,
  operating,
  irr,
  breakEven,
} from './model.js';
const $ = q => document.querySelector(q),
  esc = v =>
    String(v).replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
const money = v =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
      notation: Math.abs(v) >= 1000000 ? 'compact' : 'standard',
    }).format(v),
  short = v => {
    const sign = v < 0 && Math.round(Math.abs(v) / 1000) > 0 ? '−' : '',
      a = Math.abs(v);
    return sign + (a >= 1000000 ? '$' + (a / 1000000).toFixed(2) + 'M' : '$' + Math.round(a / 1000) + 'K');
  },
  // Axis labels drop trailing zeros: $2M, $2.5M, −$500K.
  axisMoney = v => {
    const a = Math.abs(v),
      sign = v < 0 ? '−' : '';
    if (!a) return '$0';
    return sign + (a >= 1000000 ? '$' + +(a / 1000000).toFixed(2) + 'M' : '$' + Math.round(a / 1000) + 'K');
  },
  // Four to six evenly spaced round values covering [lo, hi].
  niceTicks = (lo, hi) => {
    const rough = (hi - lo) / 4,
      mag = Math.pow(10, Math.floor(Math.log10(rough))),
      step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= rough),
      ticks = [];
    for (let v = Math.floor(lo / step) * step; v <= Math.ceil(hi / step) * step + step / 2; v += step)
      ticks.push(Math.round(v / step) * step);
    return ticks;
  },
  pct = v => (v === null ? 'N/A' : (v * 100).toFixed(1) + '%'),
  pb = v => (v === null ? 'Beyond horizon' : v.toFixed(1) + ' mo'),
  irrShort = v => (v !== null && v > 1 ? '>100%' : pct(v));
const unitMoney = v =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.abs(v) < 1 ? 3 : 2,
  }).format(v);
const colors = ['#4265df', '#48a88d', '#9b81d9', '#dda556', '#688ca8'],
  icons = ['◉', '✧', '▤', '⌁', '⚙'];
let state = {
    projects: structuredClone(examples),
    settings: { ...defaults },
    excluded: [],
    view: 'overview',
    scenario: 'base',
  },
  storageOK = true,
  selected = null,
  query = '';
try {
  const saved = JSON.parse(localStorage.getItem('ai-capital-v1'));
  if (saved && Array.isArray(saved.projects) && saved.settings && typeof saved.settings === 'object') {
    saved.projects = saved.projects.map(p => ({
      ...projectDefaults,
      ...(examples.find(e => e.id === p?.id) || {}),
      ...p,
    }));
    saved.settings = { ...defaults, ...saved.settings };
  }
  if (
    saved &&
    Array.isArray(saved.projects) &&
    saved.projects.every(
      p =>
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        Object.keys(examples[0]).every(k => typeof p[k] === typeof examples[0][k]),
    ) &&
    saved.settings &&
    Object.keys(defaults).every(k => typeof saved.settings[k] === typeof defaults[k]) &&
    [2, 3, 5, 10].includes(saved.settings.years) &&
    saved.settings.rate >= 0 &&
    saved.settings.rate <= 80
  ) {
    state = { ...state, ...saved };
    state.view = 'overview';
  }
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
function results(s = state.settings) {
  return state.projects.map((p, i) => ({ p, i, r: calculate(p, s) }));
}
function portfolio(s = state.settings) {
  const all = results(s).filter(x => !state.excluded.includes(x.p.id));
  const flows = Array(s.years * 12 + 1).fill(0);
  all.forEach(x => x.r.flows.forEach((v, i) => (flows[i] += v)));
  let c = flows[0],
    payback = null;
  for (let m = 1; m < flows.length; m++) {
    if (payback === null && c < 0 && c + flows[m] >= 0) payback = m - 1 - c / flows[m];
    c += flows[m];
  }
  const sum = k => all.reduce((v, x) => v + x.r[k], 0);
  return {
    all,
    rnpv: sum('riskAdjustedNPV'),
    funding: sum('fundingRequest'),
    breakEven: breakEven({
      cap: sum('cap'),
      pvBenefits: sum('pvBenefits'),
      pvFixed: sum('pvFixed'),
      pvVariable: sum('pvVariable'),
    }),
    yearly: Array.from({ length: s.years }, (_, y) => ({
      year: y + 1,
      benefit: all.reduce((v, x) => v + x.r.yearly[y].benefit, 0),
      cost: all.reduce((v, x) => v + x.r.yearly[y].cost, 0),
    })),
    npv: all.reduce((v, x) => v + x.r.npv, 0),
    cap: all.reduce((v, x) => v + x.r.cap, 0),
    benefit: all.reduce((v, x) => v + x.r.totalBenefits, 0),
    cost: all.reduce((v, x) => v + x.r.totalCosts, 0),
    irr: irr(flows),
    payback,
    flows,
  };
}
const badge = (value, cls) => `<span class="badge ${cls}">${esc(value)}</span>`;
const recBadge = v =>
  badge(v, v === 'Scale' ? 'green' : v === 'Continue' ? 'blue' : v === 'Intervene' ? 'amber' : 'red');
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
  return `<div class="metrics"><div class="metric"><div class="metric-top">${label} NPV <span class="metric-icon">↗</span></div><strong>${short(a.npv)}</strong><small class="${a.npv > 0 ? 'green' : ''}">Risk-adjusted ${short(a.rnpv)} · ${state.settings.years} yrs at ${state.settings.rate}%</small></div><div class="metric"><div class="metric-top">${label} payback <span class="metric-icon">◷</span></div><strong>${a.payback === null ? '—' : a.payback.toFixed(1) + ' mo'}</strong><small>${a.payback === null ? 'Not reached in selected horizon' : 'Undiscounted monthly cash flows'}</small></div><div class="metric"><div class="metric-top">${label} ROI <span class="metric-icon">⌁</span></div><strong>${pct(roi)}</strong><small>Total cost basis · ${state.settings.years}-year horizon</small></div><div class="metric"><div class="metric-top">Initial capital <span class="metric-icon">▣</span></div><strong>${short(a.cap)}</strong><small>Year-1 funding ${short(a.funding)} incl. running costs</small></div></div>`;
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
  return `<div class="panel table-panel"><div class="table-head"><div><h2>Investment portfolio <span class="pill">${state.projects.length} automations</span></h2><p>Compare returns. Open an automation to change its business case.</p></div><input id="search" aria-label="Search automations" placeholder="⌕  Search automations" value="${esc(query)}"></div><div class="table-wrap"><table><thead><tr><th>INCLUDE / AUTOMATION</th><th>STAGE</th><th>INITIAL CAPITAL</th><th>NPV</th><th>PAYBACK</th><th>ROI</th><th>IRR</th><th>EVIDENCE</th><th>DECISION</th></tr></thead><tbody>${all.map(({ p, i, r }) => `<tr><td><div class="project-cell"><input type="checkbox" data-include="${esc(p.id)}" aria-label="Include ${esc(p.name)} in portfolio" ${state.excluded.includes(p.id) ? '' : 'checked'}><span class="project-icon" style="background:${colors[i % 5]}13;color:${colors[i % 5]}">${icons[i % 5]}</span><button class="name-button" data-project="${esc(p.id)}"><strong>${esc(p.name)}</strong><small>${esc(p.team)} · ${esc(p.owner)}</small></button></div></td><td>${badge(p.stage, p.stage === 'Production' ? 'green' : 'blue')}</td><td>${short(r.cap)}</td><td><strong style="color:${r.npv > 0 ? 'var(--green)' : 'var(--red)'}">${short(r.npv)}</strong><small class="sub">Risk-adj. ${short(r.riskAdjustedNPV)}</small></td><td>${pb(r.payback)}</td><td>${pct(r.roi)}</td><td title="Annualized IRR: ${pct(r.irr)}">${irrShort(r.irr)}</td><td>${badge(p.baseline, p.baseline === 'Verified' ? 'green' : 'amber')}</td><td>${recBadge(r.recommendation)}</td></tr>`).join('') || '<tr><td colspan="9" class="empty">No automations match your search.</td></tr>'}</tbody></table></div><div class="table-foot"><span>${portfolio().all.length} included in portfolio · ${state.settings.capacity ? 'Cash + capacity value' : 'Cash benefit case'} · Portfolio IRR ${pct(portfolio().irr)}</span><span>Live calculations · Click a project to inspect assumptions →</span></div></div>`;
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
const scenarioPresets = {
  base: { benefitFactor: 100, costFactor: 100, delay: 0 },
  downside: { benefitFactor: 75, costFactor: 120, delay: 3 },
  upside: { benefitFactor: 120, costFactor: 95, delay: 0 },
};
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
      const r = calculate(p, s);
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
      )}<label class="switch"><input id="capacity" type="checkbox" ${state.settings.capacity ? 'checked' : ''}> Include recovered capacity value</label><p class="detail-note">Capacity value is hours × loaded hourly cost × realization. It is an economic proxy. Validate redeployment and keep it separate from direct savings.</p><h3 class="prob-title">Probability of success by stage</h3><p style="font-size:10px">Used for risk-adjusted NPV. A failed project is assumed to lose its initial capital and stop.</p><div class="prob-fields">${[
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
      )}</div><p style="font-size:10px">Current scenario: ${esc(state.scenario)}. Adoption and project ramp still apply after the portfolio multiplier.</p></div><div class="panel"><div class="panel-head"><div><h2>How resilient is your investment?</h2><p>Two-variable sensitivity · ${sc.label === 'Project' ? esc(sc.name) : 'portfolio'} NPV</p></div><span class="pill">${state.settings.rate}% discount</span></div>${truth(a, sc)}<div class="table-wrap"><table class="heat"><thead><tr><th>Estimated benefits ↓ / Costs →</th>${costs.map(c => `<th>${c}%</th>`).join('')}</tr></thead><tbody>${benefits
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
function evidence() {
  return `<div class="insight" style="margin:0 0 22px"><b>▤</b><p><strong>Evidence before confidence.</strong> All five projects are examples. “Verified” describes the example's baseline quality, not a verification performed by this tool. Monetary figures remain forecasts; operational observations do not establish attributable cash savings.</p></div><div class="health-grid">${results()
    .map(
      ({ p, r }) =>
        `<article class="panel"><div class="panel-head"><div><h2><button class="name-button" data-project="${esc(p.id)}">${esc(p.name)} ↗</button></h2><p>${esc(p.owner)} · ${p.age} months since launch</p></div>${badge(r.health.action, r.health.action === 'Healthy' ? 'green' : r.health.action === 'Escalate' ? 'red' : 'amber')}</div><div class="health-row"><span>${esc(p.kpi)}</span><b>${p.baseline === 'Missing' ? 'Unmeasured' : p.before + ' ' + esc(p.unit)} → ${p.after} ${esc(p.unit)}</b></div><div class="health-row"><span>Baseline quality</span>${badge(p.baseline, p.baseline === 'Verified' ? 'green' : 'amber')}</div>${r.health.signals.map(s => `<div class="health-row"><span>${s.name}</span>${badge(s.value, s.level === 2 ? 'red' : s.level === 1 ? 'amber' : 'green')}</div>`).join('')}<div class="health-row"><span>Delivery readiness</span><span title="${esc(r.readiness.items.map(i => i.name + ': ' + i.value).join(' · '))}">${badge(r.readiness.status, r.readiness.status === 'Ready' ? 'green' : r.readiness.status === 'Not ready' ? 'red' : 'amber')}</span></div><div class="health-row"><span>Compliance</span>${badge(r.compliance.status === 'Cleared' ? 'Cleared' : r.compliance.status + ': ' + r.compliance.missing.join(', '), r.compliance.status === 'Cleared' ? 'green' : r.compliance.status === 'Blocked' ? 'red' : 'amber')}</div><div class="health-row"><span>Running cost per unit</span><b>${r.unit ? unitMoney(r.unit.cost) + ' · ' + esc(p.volumeUnit) : 'Volume not set'}</b></div><div class="health-row"><span>Compute variance vs budget</span><b>${p.computeBudget ? ((p.compute / p.computeBudget - 1) * 100).toFixed(0) + '%' : 'No budget'}</b></div><p class="evidence">${esc(p.evidence)}</p><p class="evidence"><strong>Next decision: ${r.recommendation}.</strong> ${r.compliance.status === 'Blocked' ? `Complete the ${esc(r.compliance.missing.join(', ').toLowerCase())} before further rollout. ` : ''}${r.readiness.status === 'Not ready' ? 'Resolve high delivery risks before committing more capital. ' : ''}${p.baseline !== 'Verified' ? 'Reconstruct a comparable baseline and validate value attribution. ' : ''}${r.health.action !== 'Healthy' ? 'Resolve flagged signals before expansion. ' : 'Validate sustained results and operating costs at the next monthly review. '}Reassess if NPV falls below zero or health deteriorates.</p></article>`,
    )
    .join('')}</div>`;
}
function method() {
  return `<article class="panel method"><div class="eyebrow">MODEL TRANSPARENCY</div><h2>Built for a business case you can defend.</h2><p>The supplied “Measure and demonstrate AI business value” document informs the four-part value framework, stakeholder metrics, baseline evidence, and early warning indicators. Its learning exercises are reference content, not instructions to this application.</p><h3>Four parts of AI value</h3><ul><li><b>Direct savings:</b> expenses reduced or avoided. Do not also count the same labor as recovered capacity.</li><li><b>Indirect gains:</b> retention, quality, revenue, or reduced complaints. Only the explicitly cash-qualified share enters the financial case.</li><li><b>Productivity:</b> hours recovered × loaded hourly rate × realization. Reported separately; included only when the capacity option is enabled.</li><li><b>Full costs:</b> build, data preparation, training, inference compute, storage, maintenance, and human oversight. Include integration and governance spend in the relevant cost fields.</li></ul><h3>Monthly cash flow model</h3><p>Implementation, data preparation, and training are paid at month zero. Operating costs begin in month one, including during rollout delays. Benefits begin after the project delay plus scenario delay and ramp linearly to full production over the entered ramp months. Benefits are multiplied by adoption and the scenario benefit factor. Yearly benefit and cost growth apply at each twelve-month boundary.</p><h3>Capital budgeting conventions</h3><p><b>NPV:</b> − initial capital + Σ monthly net benefit ÷ (1 + annual discount rate)<sup>month/12</sup>. <b>IRR:</b> the monthly rate that makes NPV zero, annualized as (1 + monthly IRR)<sup>12</sup> − 1. N/A means no unique conventional IRR, no positive inflow, or no root within the search bounds. <b>Payback:</b> first monthly cumulative cash crossing, with linear interpolation. Discounted payback uses discounted monthly flows. Returns beyond the horizon are shown explicitly.</p><p><b>ROI (total cost basis):</b> (horizon benefits − horizon costs) ÷ horizon costs. <b>Capital ROI:</b> the same net benefit ÷ initial capital. ROI on total cost basis is a headline portfolio and project metric; capital ROI appears in each project's cash-flow view. IRR above 100% is summarized as “>100%” in the portfolio table because small initial capital makes it unstable for ranking; the exact value is in project detail and on hover. The reference's capital deployed convention includes first-year operating costs; the tool labels its initial capital basis separately.</p><h3>Funding, risk and break-even</h3><p><b>Year-1 funding request:</b> initial capital + the first twelve months of scheduled running costs. It is a budgeting figure; it does not change NPV, IRR or payback, which keep one-time costs at month 0 and running costs in the month they occur. <b>Total cost of ownership:</b> initial capital + all running costs over the horizon, undiscounted. <b>Risk-adjusted NPV:</b> probability of success × NPV − (1 − probability) × initial capital, with editable probabilities by stage (defaults: Idea 30%, Pilot 60%, Production 90%). This simplification assumes a failed project loses its initial capital and stops. <b>Break-even:</b> NPV is linear in each driver, so the tool solves it directly. Estimated benefits must reach (initial capital + PV of all running costs) ÷ PV of benefits. Costs can rise by PV of benefits ÷ (initial capital + PV of costs) − 1. Adoption must reach current adoption × (initial capital + PV of fixed costs) ÷ (PV of benefits − PV of usage costs). Each holds every other assumption fixed.</p><h3>Unit economics</h3><p>Usage-based cost = cost per unit × annual volume × adoption × ramp × benefit growth, so it starts with usage and is never charged during a rollout delay. Fixed running costs are unchanged. Steady-state cost per unit = (fixed running costs + usage cost) ÷ (volume × adoption); benefit per unit uses the cash benefit case. The example projects keep their reference compute costs as fixed costs, and their volumes are illustrative.</p><h3>Readiness and compliance</h3><p>Data readiness, integration, vendor dependency and team capacity are rated low, medium or high risk. Two or more high risks → Not ready; one high or two or more medium → At risk; anything unassessed → Incomplete; otherwise Ready. Readiness informs the decision but does not change the recommendation. Security review is always required, legal & privacy review is required for personal data, and model risk review for high-risk AI. A pilot or production project missing a required approval is Blocked and recommended for intervention; an idea is Pending.</p><h3>Reference payback is shown separately</h3><p>The reference uses (implementation + first-year operating costs) ÷ (annual direct savings + productivity − annual operating costs), excluding indirect gains. This simplified ratio is available in project detail. It ignores actual ramp and adoption and counts first-year operating costs in the numerator as well as the annual net benefit denominator. Our primary payback uses the monthly cash schedule. The reference also contains conflicting example payback summaries, so they are not copied as validated outputs.</p><h3>Health signals and decision rules</h3><p>Reference adoption alerts: below 40% after three months → monitor; below 20% after six months → red flag requiring a recovery plan review. Two yellow signals → investigate; two red → escalate. Application policy additionally investigates any single red. Pipeline thresholds (98% watch, below 95% red) are configurable product assumptions represented here as fixed demo policy. Accuracy is yellow when below its project target and flat or declining. Missing sponsor is red; limited engagement is yellow.</p><p>Intervene when evidence is incomplete, required approvals are missing, or health requires investigation/escalation; otherwise rework when NPV ≤ 0, scale a production investment with ≥ 80% adoption and positive NPV, or continue. These deterministic recommendations support human judgment. They are not autonomous funding decisions.</p><h3>Scope and limitations</h3><p>USD, nominal, before-tax estimates. No depreciation tax shield, working capital, terminal value, financing, shared infrastructure savings, project dependencies, or budget optimization. Portfolio totals assume additive, independent benefits and costs; check overlap before approval. Data is saved only in this browser. There is no company login, shared database, or live telemetry connection. Export captures assumptions and monthly results for review.</p></article>`;
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
  $('#view').innerHTML = { overview, scenarios, evidence, method }[state.view]();
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
function bindView() {
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
  const r = calculate(p, state.settings);
  return `<div class="detail-results"><div><small>NPV</small><strong>${short(r.npv)}</strong></div><div><small>Payback</small><strong>${pb(r.payback)}</strong></div><div><small>ROI (total costs)</small><strong>${pct(r.roi)}</strong></div><div><small>IRR (annualized)</small><strong>${pct(r.irr)}</strong></div><div><small>Risk-adjusted NPV</small><strong>${short(r.riskAdjustedNPV)}</strong></div><div><small>Year-1 funding</small><strong>${short(r.fundingRequest)}</strong></div></div><p class="evidence">${recBadge(r.recommendation)} · ${r.health.action} · ${state.settings.capacity ? 'Includes capacity proxy' : 'Cash benefits only'}</p>`;
}
function detailCash(p) {
  const r = calculate(p, state.settings);
  return `<h3>Cash flow audit</h3><div class="table-wrap"><table><thead><tr><th>YEAR</th><th>EST. BENEFITS</th><th>OP. COSTS</th><th>NET</th></tr></thead><tbody><tr><td>Start</td><td>—</td><td>${short(r.cap)} setup</td><td>${short(-r.cap)}</td></tr>${r.yearly.map(y => `<tr><td>${y.year}</td><td>${short(y.benefit)}</td><td>${short(y.cost)}</td><td>${short(y.net)}</td></tr>`).join('')}</tbody></table></div><p class="evidence">Year-1 funding request: <b>${money(r.fundingRequest)}</b> · Total cost of ownership (${state.settings.years} yrs): <b>${money(r.totalCosts)}</b><br>Break-even: estimated benefits at <b>${r.breakEven.benefits === null ? 'N/A' : Math.round(r.breakEven.benefits * 100) + '%'}</b> of estimate · adoption <b>${r.breakEven.adoption === null ? 'N/A' : r.breakEven.adoption > 100 ? 'not reachable' : r.breakEven.adoption.toFixed(0) + '%'}</b> · cost headroom <b>${r.breakEven.costHeadroom === null ? 'N/A' : Math.round(r.breakEven.costHeadroom * 100) + '%'}</b><br>Unit economics (steady state): <b>${r.unit ? `${Math.round(r.unit.volume).toLocaleString('en-US')} ${esc(p.volumeUnit)}/yr · cost ${unitMoney(r.unit.cost)} · benefit ${unitMoney(r.unit.benefit)} · net ${unitMoney(r.unit.net)} per unit` : 'set annual volume to calculate'}</b><br>Delivery readiness: <b>${r.readiness.status}</b> · Compliance: <b>${r.compliance.status}${r.compliance.missing.length ? ' (' + esc(r.compliance.missing.join(', ')) + ')' : ''}</b><br>ROI (total costs): <b>${pct(r.roi)}</b> · Capital ROI (initial capital): <b>${r.cap ? pct(r.capitalROI) : 'N/A'}</b><br>Discounted payback: <b>${pb(r.discountedPayback)}</b><br>Reference simplified payback: <b>${p.direct + r.capacity - operating(p) > 0 ? pb(r.referencePayback) : 'Not reached'}</b><br>Recovered capacity proxy, before adoption: <b>${money(r.capacity)}/year</b></p>`;
}
function openDetail(id) {
  selected = id;
  const p = state.projects.find(x => x.id === id);
  if (!p) return;
  $('#detail').hidden = false;
  $('#detail').innerHTML =
    `<div class="detail-head"><div><div class="eyebrow">LIVE BUSINESS CASE</div><h2>${esc(p.name)}</h2></div><button class="close" id="close-detail" aria-label="Close project">×</button></div><p class="description">${esc(p.description)}</p><div id="detail-results">${detailResults(p)}</div><p class="detail-note">Illustrative assumptions. Changes update all portfolio views immediately and save in this browser.</p><h3>Investment & full operating costs</h3><div class="fields">${specs.slice(0, 7).map(fieldMarkup).join('')}</div><h3>Estimated benefits & delivery assumptions</h3><div class="fields">${specs.slice(7, 18).map(fieldMarkup).join('')}</div><h3>Usage & unit economics</h3><div class="fields">${fieldMarkup(['volume', 'Annual volume at full adoption', 0, 1e12])}<label>Volume unit<input data-text="volumeUnit" value="${esc(p.volumeUnit)}" maxlength="40"></label>${fieldMarkup(['unitCost', 'Usage-based cost per unit ($)', 0, 1e6])}</div><h3>Readiness & compliance</h3><div class="fields">${[
      ['dataReadiness', 'Data readiness risk'],
      ['integration', 'Integration complexity'],
      ['vendorRisk', 'Vendor dependency'],
      ['teamCapacity', 'Team capacity risk'],
    ]
      .map(
        ([k, l]) =>
          `<label>${l}<select data-text="${k}">${[
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
      )}</div><h3>Evidence & leading indicators</h3><div class="fields"><label>KPI name<input data-text="kpi" value="${esc(p.kpi)}" maxlength="80"></label><label>Metric unit<input data-text="unit" value="${esc(p.unit)}" maxlength="20"></label>${specs.slice(18).map(fieldMarkup).join('')}<label>Baseline quality<select data-text="baseline">${['Verified', 'Partial', 'Missing'].map(v => `<option ${p.baseline === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>Sponsor engagement<select data-text="sponsor">${['Engaged', 'Limited', 'Missing'].map(v => `<option ${p.sponsor === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>Stage<select data-text="stage">${['Idea', 'Pilot', 'Production'].map(v => `<option ${p.stage === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>Executive owner<input data-text="owner" value="${esc(p.owner)}" maxlength="60"></label><label class="wide">Evidence, attribution & next steps<textarea data-text="evidence" rows="4" maxlength="2500">${esc(p.evidence)}</textarea></label></div><div id="detail-cash">${detailCash(p)}</div><div class="detail-actions"><button class="btn" id="duplicate">Duplicate case</button><button class="btn" id="remove">Remove automation</button></div>`;
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
  $('#duplicate').onclick = () => {
    const copy = structuredClone(p);
    copy.id = crypto.randomUUID();
    copy.name += ' (comparison)';
    state.projects.push(copy);
    render();
    openDetail(copy.id);
    toast('Comparison case added');
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
// Add-automation questionnaire: every assumption is asked for explicitly; nothing is inherited from an example.
const wizardBlank = {
  name: '',
  team: '',
  owner: '',
  stage: 'Idea',
  age: 0,
  description: '',
  upfront: '',
  data: 0,
  training: 0,
  compute: '',
  storage: 0,
  maintenance: 0,
  oversight: 0,
  costGrowth: 0,
  computeBudget: '',
  direct: '',
  growth: 0,
  indirect: 0,
  indirectCash: 0,
  hours: 0,
  hourly: 0,
  realization: 0,
  adoption: '',
  ramp: '',
  delay: 0,
  kpi: '',
  unit: '',
  direction: 'lower',
  baseline: 'Missing',
  before: '',
  target: '',
  after: '',
  sponsor: 'Engaged',
  pipeline: '',
  accuracy: '',
  accuracyTarget: '',
  trend: 0,
  evidence: '',
  volume: '',
  volumeUnit: '',
  unitCost: '',
  dataReadiness: 'Not assessed',
  integration: 'Not assessed',
  vendorRisk: 'Not assessed',
  teamCapacity: 'Not assessed',
  dataSensitivity: 'Internal',
  aiRisk: 'Minimal',
  securityReview: 'Not started',
  legalReview: 'Not started',
  modelRiskReview: 'Not started',
};
const wizardSteps = [
  {
    title: 'The idea',
    intro: 'Describe the automation and who is accountable for its results.',
    fields: [
      [
        'name',
        'Automation name',
        'text',
        { required: 1, maxlength: 90, placeholder: 'e.g. Contract review assistant' },
      ],
      ['team', 'Department', 'text', { required: 1, maxlength: 60, placeholder: 'e.g. Legal' }],
      [
        'owner',
        'Executive owner',
        'text',
        { required: 1, maxlength: 60, placeholder: 'e.g. General Counsel' },
      ],
      ['stage', 'Current stage', 'select', { options: ['Idea', 'Pilot', 'Production'] }],
      [
        'age',
        'Months since launch',
        'number',
        { min: 0, max: 120, step: 1, help: 'Use 0 if it has not launched.' },
      ],
      [
        'description',
        'What problem does it solve?',
        'textarea',
        { maxlength: 300, wide: 1, placeholder: 'One or two sentences' },
      ],
    ],
  },
  {
    title: 'One-time costs',
    intro: 'Spent before go-live and counted at month 0.',
    fields: [
      [
        'upfront',
        'Implementation and integration ($)',
        'money',
        { required: 1, help: 'Build, vendor setup, integration.' },
      ],
      ['data', 'Data preparation ($)', 'money', { help: 'Cleaning, labeling, pipelines.' }],
      [
        'training',
        'Training and change management ($)',
        'money',
        { help: 'User training, process redesign.' },
      ],
    ],
  },
  {
    title: 'Running costs',
    intro:
      'Fixed annual costs are charged monthly from month 1, including during any rollout delay. Usage-based costs follow adoption and ramp.',
    fields: [
      ['compute', 'Compute and inference ($ per year)', 'money', { required: 1 }],
      ['storage', 'Storage and licences ($ per year)', 'money'],
      ['maintenance', 'Maintenance and support ($ per year)', 'money'],
      ['oversight', 'Human oversight and review ($ per year)', 'money'],
      ['costGrowth', 'Running cost growth (% per year)', 'number', { min: 0, max: 50 }],
      [
        'computeBudget',
        'Approved compute budget ($ per year)',
        'money',
        { help: 'Blank uses the fixed compute cost.' },
      ],
      [
        'volume',
        'Annual volume at full adoption',
        'number',
        { min: 0, max: 1e12, help: 'Requests, documents or items processed per year.' },
      ],
      ['volumeUnit', 'Volume unit', 'text', { maxlength: 40, placeholder: 'e.g. contracts reviewed' }],
      [
        'unitCost',
        'Usage-based cost per unit ($)',
        'number',
        { min: 0, max: 1e6, help: 'Inference or API cost that scales with use. 0 if compute is fixed.' },
      ],
    ],
  },
  {
    title: 'Estimated benefits',
    intro:
      'Annual benefits at full adoption. Only cash counts by default; recovered hours are reported separately as capacity.',
    note: 'Do not count the same labour twice. If headcount, hiring or contractor spend falls, enter it as direct savings and leave those hours out of capacity.',
    fields: [
      [
        'direct',
        'Direct cash savings ($ per year)',
        'money',
        { required: 1, help: 'Costs reduced or avoided.' },
      ],
      ['growth', 'Benefit growth (% per year)', 'number', { min: 0, max: 50 }],
      ['indirect', 'Indirect gains ($ per year)', 'money', { help: 'Quality, retention, revenue uplift.' }],
      [
        'indirectCash',
        'Share of indirect gains that is cash (%)',
        'number',
        { min: 0, max: 100, help: 'Only this share enters cash flows.' },
      ],
      [
        'hours',
        'Hours recovered per year',
        'number',
        { min: 0, max: 1e7, help: 'Capacity, not cash, unless redeployed.' },
      ],
      ['hourly', 'Loaded cost per hour ($)', 'number', { min: 0, max: 10000 }],
      ['realization', 'Share of hours put to productive use (%)', 'number', { min: 0, max: 100 }],
    ],
  },
  {
    title: 'Rollout',
    intro: 'How quickly the benefits arrive.',
    fields: [
      [
        'adoption',
        'Expected adoption at steady state (%)',
        'number',
        { required: 1, min: 0, max: 100, help: 'Share of intended users or volume.' },
      ],
      ['ramp', 'Months to reach full benefit', 'number', { required: 1, min: 1, max: 60, step: 1 }],
      [
        'delay',
        'Months before benefits start',
        'number',
        { min: 0, max: 60, step: 1, help: 'Running costs are still charged.' },
      ],
    ],
  },
  {
    title: 'Readiness',
    intro: 'Delivery risks and the approvals needed before rollout.',
    note: 'Security review is always required. Legal & privacy review is also required for personal data, and model risk review for high-risk AI. A pilot or production project without its required approvals is recommended for intervention.',
    fields: [
      [
        'dataReadiness',
        'Data readiness risk',
        'select',
        {
          options: [
            ['Not assessed', 'Not assessed'],
            ['Low', 'Low risk'],
            ['Medium', 'Medium risk'],
            ['High', 'High risk'],
          ],
        },
      ],
      [
        'integration',
        'Integration complexity',
        'select',
        {
          options: [
            ['Not assessed', 'Not assessed'],
            ['Low', 'Low risk'],
            ['Medium', 'Medium risk'],
            ['High', 'High risk'],
          ],
        },
      ],
      [
        'vendorRisk',
        'Vendor dependency',
        'select',
        {
          options: [
            ['Not assessed', 'Not assessed'],
            ['Low', 'Low risk'],
            ['Medium', 'Medium risk'],
            ['High', 'High risk'],
          ],
        },
      ],
      [
        'teamCapacity',
        'Team capacity risk',
        'select',
        {
          options: [
            ['Not assessed', 'Not assessed'],
            ['Low', 'Low risk'],
            ['Medium', 'Medium risk'],
            ['High', 'High risk'],
          ],
        },
      ],
      [
        'dataSensitivity',
        'Data sensitivity',
        'select',
        { options: ['Public', 'Internal', 'Confidential', 'Personal'] },
      ],
      [
        'aiRisk',
        'AI risk level',
        'select',
        {
          options: ['Minimal', 'Limited', 'High'],
          help: 'High: decisions about people, safety or credit, e.g. EU AI Act high-risk uses.',
        },
      ],
      [
        'securityReview',
        'Security review',
        'select',
        { options: ['Not started', 'In progress', 'Approved'] },
      ],
      [
        'legalReview',
        'Legal & privacy review',
        'select',
        { options: ['Not started', 'In progress', 'Approved'] },
      ],
      [
        'modelRiskReview',
        'Model risk review',
        'select',
        { options: ['Not started', 'In progress', 'Approved'] },
      ],
    ],
  },
  {
    title: 'Evidence',
    intro: 'What will prove it works, and what is measured today. Leave unknowns blank.',
    fields: [
      [
        'kpi',
        'Business KPI',
        'text',
        { required: 1, maxlength: 80, placeholder: 'e.g. Contract review time' },
      ],
      ['unit', 'KPI unit', 'text', { required: 1, maxlength: 20, placeholder: 'e.g. hours' }],
      [
        'direction',
        'Better is',
        'select',
        {
          options: [
            ['lower', 'Lower'],
            ['higher', 'Higher'],
          ],
        },
      ],
      [
        'baseline',
        'Baseline quality',
        'select',
        {
          options: ['Missing', 'Partial', 'Verified'],
          help: 'Verified = measured before launch on comparable work.',
        },
      ],
      ['before', 'Baseline value', 'number', { min: 0, max: 1e9 }],
      ['target', 'Target value', 'number', { min: 0, max: 1e9 }],
      ['after', 'Latest observed value', 'number', { min: 0, max: 1e9, help: 'Blank uses the baseline.' }],
      ['sponsor', 'Sponsor engagement', 'select', { options: ['Engaged', 'Limited', 'Missing'] }],
      [
        'pipeline',
        'Data pipeline success (%)',
        'number',
        { min: 0, max: 100, help: 'Blank if not live yet.' },
      ],
      ['accuracy', 'Model accuracy (%)', 'number', { min: 0, max: 100, help: 'Blank if not measured yet.' }],
      ['accuracyTarget', 'Accuracy target (%)', 'number', { min: 0, max: 100 }],
      ['trend', 'Accuracy trend (pp per month)', 'number', { min: -10, max: 10 }],
      [
        'evidence',
        'Evidence, attribution and next steps',
        'textarea',
        { maxlength: 2500, wide: 1, placeholder: 'Source of each estimate and how results will be verified' },
      ],
    ],
  },
  {
    title: 'Review',
    intro: 'Check the business case before it joins the portfolio. Everything stays editable afterwards.',
  },
];
let wiz = { step: 0, draft: { ...wizardBlank } };
function wizardProject(d) {
  const n = k => (d[k] === '' || d[k] == null ? 0 : +d[k]),
    t = k => String(d[k] ?? '').trim();
  const p = {
    ...projectDefaults,
    name: t('name'),
    team: t('team'),
    owner: t('owner'),
    stage: d.stage,
    description: t('description') || 'New AI investment business case.',
    kpi: t('kpi'),
    unit: t('unit'),
    direction: d.direction,
    baseline: d.baseline,
    sponsor: d.sponsor,
    volumeUnit: t('volumeUnit') || 'transactions',
    dataReadiness: d.dataReadiness,
    integration: d.integration,
    vendorRisk: d.vendorRisk,
    teamCapacity: d.teamCapacity,
    dataSensitivity: d.dataSensitivity,
    aiRisk: d.aiRisk,
    securityReview: d.securityReview,
    legalReview: d.legalReview,
    modelRiskReview: d.modelRiskReview,
  };
  for (const k of [
    'volume',
    'unitCost',
    'upfront',
    'data',
    'training',
    'compute',
    'storage',
    'maintenance',
    'oversight',
    'costGrowth',
    'direct',
    'growth',
    'indirect',
    'indirectCash',
    'hours',
    'hourly',
    'realization',
    'adoption',
    'ramp',
    'delay',
    'before',
    'target',
    'trend',
    'age',
  ])
    p[k] = n(k);
  p.ramp = Math.max(1, p.ramp);
  p.computeBudget = d.computeBudget === '' ? p.compute : n('computeBudget');
  p.after = d.after === '' ? p.before : n('after');
  const unmeasured = [];
  p.pipeline = d.pipeline === '' ? (unmeasured.push('data pipeline'), 100) : n('pipeline');
  p.accuracy = d.accuracy === '' ? (unmeasured.push('model accuracy'), 0) : n('accuracy');
  p.accuracyTarget = d.accuracy === '' ? 0 : d.accuracyTarget === '' ? p.accuracy : n('accuracyTarget');
  p.evidence =
    (t('evidence') ||
      'New forecast. Establish a prelaunch baseline and validate all cost and benefit assumptions.') +
    (unmeasured.length ? ` Not yet measured: ${unmeasured.join(', ')}.` : '');
  return p;
}
function wizardField([key, label, type, o = {}]) {
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
  const p = wizardProject(wiz.draft),
    r = calculate(p, state.settings);
  if (!r.cap && !p.direct)
    return '<p>Answer the cost and benefit questions to see the business case take shape.</p>';
  return `<div><small>Year-1 funding</small><strong>${short(r.fundingRequest)}</strong></div><div><small>Risk-adjusted NPV</small><strong>${short(r.riskAdjustedNPV)}</strong></div><div><small>NPV</small><strong style="color:${r.npv > 0 ? 'var(--green)' : 'var(--red)'}">${short(r.npv)}</strong></div><div><small>Payback</small><strong>${pb(r.payback)}</strong></div><p>Live preview · ${esc(state.scenario)} scenario · ${state.settings.rate}% hurdle · ${state.settings.years} years · ${state.settings.capacity ? 'includes capacity' : 'cash benefits only'}</p>`;
}
function wizardReview() {
  const p = wizardProject(wiz.draft),
    r = calculate(p, state.settings),
    d = wiz.draft,
    row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`,
    section = (title, step, rows) =>
      `<section><div class="review-head"><h3>${title}</h3><button type="button" class="text-btn" data-step="${step}">Edit</button></div><dl>${rows.join('')}</dl></section>`;
  const warnings = [
    p.baseline !== 'Verified' &&
      'Baseline is not verified, so the recommendation will be Intervene until evidence is in place.',
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
    r.readiness.status === 'Incomplete' && 'Some delivery risks are not assessed yet.',
    p.unitCost > 0 &&
      !p.volume &&
      'A usage-based cost is entered without annual volume, so it has no effect.',
  ].filter(Boolean);
  return `<div class="wizard-review">${section('The idea', 0, [row('Automation', esc(p.name)), row('Owner', `${esc(p.owner)} · ${esc(p.team)}`), row('Stage', `${esc(p.stage)} · ${p.age} months live`)])}${section('Costs', 1, [row('Initial capital', money(r.cap)), row('Annual running costs', money(r.op)), row('Year-1 funding request', money(r.fundingRequest)), row('Usage-based cost', p.unitCost && p.volume ? `${unitMoney(p.unitCost)} per unit · ${Math.round(p.volume).toLocaleString('en-US')} ${esc(p.volumeUnit)}/yr` : 'None')])}${section('Estimated benefits', 3, [row('Direct savings', money(p.direct) + '/yr'), row('Cash share of indirect gains', money((p.indirect * p.indirectCash) / 100) + '/yr'), row('Capacity value', `${money(r.capacity)}/yr ${state.settings.capacity ? '(included)' : '(reported, not in cash)'}`)])}${section('Rollout', 4, [row('Adoption', p.adoption + '%'), row('Ramp', p.ramp + (p.ramp === 1 ? ' month' : ' months')), row('Delay', p.delay + (p.delay === 1 ? ' month' : ' months'))])}${section('Readiness & compliance', 5, [row('Delivery readiness', esc(r.readiness.status)), row('Compliance', esc(r.compliance.status) + (r.compliance.missing.length ? ' · ' + esc(r.compliance.missing.join(', ')) : '')), row('Data · AI risk', `${esc(p.dataSensitivity)} · ${esc(p.aiRisk)}`)])}${section('Evidence', 6, [row('KPI', `${esc(p.kpi)}: ${p.before} → ${p.target} ${esc(p.unit)}`), row('Baseline', esc(p.baseline)), row('Health', `${r.health.action} · sponsor ${esc(p.sponsor)}`)])}<section class="review-result"><h3>Result</h3><dl>${row('NPV', short(r.npv))}${row('Payback', pb(r.payback))}${row('ROI', pct(r.roi))}${row('IRR', pct(r.irr))}${row('Risk-adjusted NPV', short(r.riskAdjustedNPV))}${row('Break-even benefits', r.breakEven.benefits === null ? 'N/A' : Math.round(r.breakEven.benefits * 100) + '% of estimate')}${row('Recommendation', recBadge(r.recommendation))}</dl></section>${warnings.length ? `<ul class="review-warnings">${warnings.map(w => `<li>${w}</li>`).join('')}</ul>` : ''}</div>`;
}
function renderWizard() {
  const s = wizardSteps[wiz.step],
    last = wiz.step === wizardSteps.length - 1,
    form = $('#add-form');
  form.innerHTML = `<div class="wizard-top"><div class="eyebrow">NEW INVESTMENT · STEP ${wiz.step + 1} OF ${wizardSteps.length}</div><button type="button" class="close" id="wizard-close" aria-label="Close questionnaire">×</button></div><ol class="wizard-steps">${wizardSteps.map((x, i) => `<li class="${i < wiz.step ? 'done' : i === wiz.step ? 'current' : ''}"><button type="button" data-step="${i}" ${i === wiz.step ? 'aria-current="step"' : ''} ${i > wiz.step ? 'disabled' : ''}>${esc(x.title)}</button></li>`).join('')}</ol><h2 id="wizard-title">${esc(s.title)}</h2><p>${esc(s.intro)}</p>${s.note ? `<p class="detail-note">${esc(s.note)}</p>` : ''}${last ? wizardReview() : `<div class="fields">${s.fields.map(wizardField).join('')}</div><div class="wizard-preview" id="wizard-preview" aria-live="polite">${wizardPreview()}</div>`}<div class="dialog-actions">${wiz.step ? '<button type="button" class="btn" id="wizard-back">← Back</button>' : '<button type="button" class="btn" id="wizard-cancel">Cancel</button>'}<button class="btn primary">${last ? 'Add to portfolio' : 'Next →'}</button></div>`;
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
        wiz.step = +b.dataset.step;
        renderWizard();
      }),
  );
  $('#wizard-back') &&
    ($('#wizard-back').onclick = () => {
      wiz.step--;
      renderWizard();
    });
  $('#wizard-cancel') && ($('#wizard-cancel').onclick = () => $('#add-dialog').close());
  $('#wizard-close').onclick = () => $('#add-dialog').close();
  (form.querySelector('[name]') || form.querySelector('.btn.primary')).focus();
}
function openWizard() {
  wiz = { step: 0, draft: { ...wizardBlank } };
  renderWizard();
  $('#add-dialog').showModal();
  $('#add-form [name]').focus();
}
$('#add-form').onsubmit = e => {
  e.preventDefault();
  const form = e.target;
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  if (wiz.step < wizardSteps.length - 1) {
    wiz.step++;
    renderWizard();
    form.closest('dialog').scrollTop = 0;
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
  state = {
    projects: structuredClone(examples),
    settings: { ...defaults },
    excluded: [],
    view: state.view,
    scenario: 'base',
  };
  query = '';
  closeDetail();
  render();
  toast('Example portfolio restored');
};
$('#add').onclick = openWizard;
$('#export').onclick = () => {
  const payload = {
    exportedAt: new Date().toISOString(),
    currency: 'USD',
    ...state,
    results: results().map(({ p, r }) => ({ id: p.id, ...r })),
    portfolio: portfolio(),
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ai-capital-portfolio.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Assumptions and results exported');
};
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('#add-dialog').open) closeDetail();
});
render();
