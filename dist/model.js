export const defaults = {
  rate: 12,
  years: 5,
  benefitFactor: 100,
  costFactor: 100,
  delay: 0,
  capacity: false,
  probIdea: 30,
  probPilot: 60,
  probProduction: 90,
  // Project adjustments to the stage probability. Unassessed ratings stay neutral (× 1).
  riskHigh: 0.8,
  riskMedium: 0.9,
  approvalFactor: 0.85,
  probFloor: 5,
  sponsorLimited: 0.9,
  sponsorMissing: 0.75,
  // Shared internal tech team. Loaded annual cost per person; headcount totals 25.
  teamCost: true,
  // Shared IT costs: this portfolio's annual share of company platforms per category, split across
  // projects by the category's basis.
  sharedCost: true,
  shared: [
    { id: 'ai', name: 'AI platform & model APIs', cost: 55000, driver: 'compute' },
    { id: 'dataplat', name: 'Data platform', cost: 45000, driver: 'data' },
    { id: 'mlops', name: 'MLOps & monitoring', cost: 25000, driver: 'live' },
    { id: 'security', name: 'Security & compliance tooling', cost: 20000, driver: 'sensitivity' },
    { id: 'tools', name: 'Licences & developer tools', cost: 15000, driver: 'people' },
  ],
  team: [
    { id: 'ml', name: 'ML engineers', headcount: 8, cost: 180000 },
    { id: 'data', name: 'Data engineers', headcount: 7, cost: 160000 },
    { id: 'sw', name: 'Software engineers', headcount: 6, cost: 150000 },
    { id: 'ops', name: 'MLOps & platform', headcount: 4, cost: 170000 },
  ],
};
// Neutral values for fields added after the first release; used for new and previously saved projects.
export const projectDefaults = {
  volume: 0,
  volumeUnit: 'transactions',
  unitCost: 0,
  dataReadiness: 'Not assessed',
  integration: 'Not assessed',
  vendorRisk: 'Not assessed',
  teamCapacity: 'Not assessed',
  dataSensitivity: 'Internal',
  aiRisk: 'Minimal',
  securityReview: 'Not started',
  legalReview: 'Not started',
  modelRiskReview: 'Not started',
  need: { ml: 0, data: 0, sw: 0, ops: 0 },
  alloc: { ml: 0, data: 0, sw: 0, ops: 0 },
  runNeed: 0,
  probOverrideOn: false,
  probOverride: 50,
  probReason: '',
};
export const examples = [
  {
    id: 'vision',
    name: 'Vision quality control',
    team: 'Operations',
    owner: 'COO',
    stage: 'Production',
    description: 'Detect defects on packaging lines before they reach customers.',
    upfront: 680000,
    data: 0,
    training: 20000,
    compute: 48000,
    storage: 12000,
    maintenance: 95000,
    oversight: 80000,
    direct: 1100000,
    indirect: 120000,
    indirectCash: 100,
    hours: 2736,
    hourly: 95,
    realization: 70,
    adoption: 94,
    ramp: 2,
    delay: 0,
    growth: 3,
    costGrowth: 5,
    baseline: 'Verified',
    kpi: 'Scrap rate',
    before: 3.2,
    after: 2.1,
    unit: '%',
    target: 2,
    direction: 'lower',
    pipeline: 99.2,
    sponsor: 'Engaged',
    accuracy: 97.3,
    trend: 0.2,
    accuracyTarget: 95,
    computeBudget: 48000,
    age: 8,
    volume: 12000000,
    volumeUnit: 'packages inspected',
    unitCost: 0,
    dataReadiness: 'Low',
    integration: 'Medium',
    vendorRisk: 'Low',
    teamCapacity: 'Low',
    dataSensitivity: 'Internal',
    aiRisk: 'Minimal',
    securityReview: 'Approved',
    legalReview: 'Approved',
    modelRiskReview: 'Approved',
    need: { ml: 1, data: 0, sw: 0, ops: 1 },
    alloc: { ml: 1, data: 0, sw: 0, ops: 1 },
    runNeed: 0.5,
    evidence:
      'Q3 2025 pilot baseline; sample scenario from reference. Validate full rollout and labor savings before approval.',
  },
  {
    id: 'support',
    name: 'Customer service copilot',
    team: 'Customer experience',
    owner: 'Chief Customer Officer',
    stage: 'Pilot',
    description: 'Automate routine requests and assist agents with complex cases.',
    upfront: 260000,
    data: 40000,
    training: 30000,
    compute: 72000,
    storage: 18000,
    maintenance: 42000,
    oversight: 60000,
    direct: 420000,
    indirect: 140000,
    indirectCash: 50,
    hours: 7200,
    hourly: 38,
    realization: 55,
    adoption: 76,
    ramp: 4,
    delay: 1,
    growth: 5,
    costGrowth: 8,
    baseline: 'Verified',
    kpi: 'Average handle time',
    before: 10,
    after: 6,
    unit: 'min',
    target: 6,
    direction: 'lower',
    pipeline: 99,
    sponsor: 'Engaged',
    accuracy: 91,
    trend: 0.6,
    accuracyTarget: 90,
    computeBudget: 60000,
    age: 4,
    volume: 480000,
    volumeUnit: 'customer requests',
    unitCost: 0,
    dataReadiness: 'Medium',
    integration: 'Medium',
    vendorRisk: 'High',
    teamCapacity: 'Medium',
    dataSensitivity: 'Personal',
    aiRisk: 'Limited',
    securityReview: 'Approved',
    legalReview: 'Approved',
    modelRiskReview: 'In progress',
    need: { ml: 1, data: 0, sw: 1, ops: 1 },
    alloc: { ml: 1, data: 0, sw: 1, ops: 1 },
    runNeed: 0.25,
    evidence:
      'Illustrative example; handle time and satisfaction metrics inspired by the reference. Annual savings need a staffing or avoided hiring plan.',
  },
  {
    id: 'invoice',
    name: 'Invoice processing automation',
    team: 'Finance',
    owner: 'CFO',
    stage: 'Production',
    description: 'Extract, validate, and route invoices for human approval.',
    upfront: 180000,
    data: 25000,
    training: 15000,
    compute: 24000,
    storage: 6000,
    maintenance: 30000,
    oversight: 35000,
    direct: 310000,
    indirect: 45000,
    indirectCash: 80,
    hours: 4200,
    hourly: 42,
    realization: 65,
    adoption: 89,
    ramp: 2,
    delay: 0,
    growth: 2,
    costGrowth: 4,
    baseline: 'Verified',
    kpi: 'Processing time',
    before: 18,
    after: 4,
    unit: 'min',
    target: 5,
    direction: 'lower',
    pipeline: 99.5,
    sponsor: 'Engaged',
    accuracy: 98,
    trend: 0.1,
    accuracyTarget: 97,
    computeBudget: 24000,
    age: 8,
    volume: 60000,
    volumeUnit: 'invoices',
    unitCost: 0,
    dataReadiness: 'Low',
    integration: 'Low',
    vendorRisk: 'Medium',
    teamCapacity: 'Low',
    dataSensitivity: 'Confidential',
    aiRisk: 'Minimal',
    securityReview: 'Approved',
    legalReview: 'Approved',
    modelRiskReview: 'Approved',
    need: { ml: 1, data: 0, sw: 1, ops: 0 },
    alloc: { ml: 1, data: 0, sw: 1, ops: 0 },
    runNeed: 0.25,
    evidence:
      'Illustrative finance example. Direct savings represent outsourced processing and late fees; hours recovered are a separate internal team benefit.',
  },
  {
    id: 'demand',
    name: 'AI demand forecasting',
    team: 'Supply chain',
    owner: 'CFO / CIO',
    stage: 'Pilot',
    description: 'Improve demand planning and reduce inventory carrying costs.',
    upfront: 420000,
    data: 80000,
    training: 35000,
    compute: 67000,
    storage: 24000,
    maintenance: 65000,
    oversight: 80000,
    direct: 520000,
    indirect: 180000,
    indirectCash: 40,
    hours: 1800,
    hourly: 62,
    realization: 50,
    adoption: 61,
    ramp: 6,
    delay: 2,
    growth: 4,
    costGrowth: 8,
    baseline: 'Partial',
    kpi: 'Forecast accuracy',
    before: 61,
    after: 81,
    unit: '%',
    target: 85,
    direction: 'higher',
    pipeline: 92,
    sponsor: 'Engaged',
    accuracy: 81,
    trend: 0,
    accuracyTarget: 85,
    computeBudget: 48000,
    age: 8,
    volume: 250000,
    volumeUnit: 'SKU forecasts',
    unitCost: 0,
    dataReadiness: 'High',
    integration: 'Medium',
    vendorRisk: 'Low',
    teamCapacity: 'Medium',
    dataSensitivity: 'Confidential',
    aiRisk: 'Minimal',
    securityReview: 'Approved',
    legalReview: 'In progress',
    modelRiskReview: 'In progress',
    need: { ml: 1, data: 1, sw: 0, ops: 1 },
    alloc: { ml: 1, data: 1, sw: 0, ops: 1 },
    runNeed: 0.25,
    evidence:
      'Reference identifies no formal prelaunch accuracy baseline. The 61% is a provisional historical proxy; reconcile comparable SKUs, seasonality, and data feed gaps.',
  },
  {
    id: 'maintenance',
    name: 'Predictive maintenance',
    team: 'Operations',
    owner: 'COO',
    stage: 'Pilot',
    description: 'Predict equipment failures and schedule maintenance proactively.',
    upfront: 1400000,
    data: 120000,
    training: 25000,
    compute: 65000,
    storage: 15000,
    maintenance: 45000,
    oversight: 80000,
    direct: 805000,
    indirect: 0,
    indirectCash: 0,
    hours: 1248,
    hourly: 75,
    realization: 60,
    adoption: 78,
    ramp: 4,
    delay: 2,
    growth: 2,
    costGrowth: 5,
    baseline: 'Partial',
    kpi: 'Unplanned failures / year',
    before: 4,
    after: 0,
    unit: 'events',
    target: 1,
    direction: 'lower',
    pipeline: 99,
    sponsor: 'Engaged',
    accuracy: 94.1,
    trend: 0.8,
    accuracyTarget: 92,
    computeBudget: 65000,
    age: 8,
    volume: 2000000,
    volumeUnit: 'sensor predictions',
    unitCost: 0,
    dataReadiness: 'Medium',
    integration: 'High',
    vendorRisk: 'Medium',
    teamCapacity: 'High',
    dataSensitivity: 'Internal',
    aiRisk: 'Minimal',
    securityReview: 'In progress',
    legalReview: 'Not started',
    modelRiskReview: 'Not started',
    need: { ml: 2, data: 1, sw: 1, ops: 1 },
    alloc: { ml: 1, data: 1, sw: 1, ops: 1 },
    runNeed: 0.25,
    evidence:
      'Reference: 0 failures in 6 months versus historical 4/year. This does not establish an annual zero-failure rate; validate seasonality and avoided-event attribution.',
  },
].map(e => ({ ...structuredClone(projectDefaults), ...e }));
export const setup = p => p.upfront + p.data + p.training;
// Allocation bases for shared IT categories. Each returns a project's weight, from inputs only
// (never from calculated results), so allocation cannot depend on itself.
export const sharedDrivers = {
  compute: {
    label: 'Compute spend',
    value: p => (p.compute || 0) + ((p.unitCost || 0) * (p.volume || 0) * (p.adoption || 0)) / 100,
  },
  data: { label: 'Data engineers assigned', value: p => p.alloc?.data || 0 },
  people: { label: 'Tech team assigned', value: p => Object.values(p.alloc || {}).reduce((v, n) => v + n, 0) },
  live: { label: 'Live projects (pilot or production)', value: p => (p.stage === 'Idea' ? 0 : 1) },
  sensitivity: {
    label: 'Data sensitivity (weighted)',
    value: p => ({ Personal: 3, Confidential: 2, Internal: 1, Public: 0 })[p.dataSensitivity] ?? 1,
  },
  equal: { label: 'Equal per project', value: () => 1 },
};
// Splits each shared category's annual cost across all projects by its basis. A category whose
// basis is zero for every project stays unallocated rather than being spread arbitrarily.
export function sharedAllocation(projects, s = defaults) {
  const byProject = Object.fromEntries(projects.map(p => [p.id, { total: 0, byCategory: {} }]));
  const categories = (s.shared || []).map(c => {
    const driver = sharedDrivers[c.driver] || sharedDrivers.equal,
      weights = projects.map(p => Math.max(0, driver.value(p) || 0)),
      sum = weights.reduce((v, w) => v + w, 0);
    projects.forEach((p, i) => {
      const amount = sum > 0 ? (c.cost * weights[i]) / sum : 0;
      byProject[p.id].byCategory[c.id] = amount;
      byProject[p.id].total += amount;
    });
    return { ...c, unallocated: sum > 0 ? 0 : c.cost };
  });
  return { byProject, categories };
}
export const operating = p => p.compute + p.storage + p.maintenance + p.oversight;
// Staffing from the shared team. Coverage is the weakest role's assigned ÷ needed. Time to full benefit
// stretches by 1 ÷ coverage when short, shrinks by 1 ÷ √coverage (never below half) when over-staffed,
// and the project stalls when a needed role has nobody. Build cost is the full assigned team; once
// benefits reach full ramp, only the run-support share stays charged.
export function staffing(p, s = defaults) {
  const roles = s.team || [],
    need = p.need || {},
    alloc = p.alloc || {},
    needed = roles.filter(r => (need[r.id] || 0) > 0),
    assigned = roles.reduce((v, r) => v + (alloc[r.id] || 0), 0),
    buildCost = roles.reduce((v, r) => v + (alloc[r.id] || 0) * r.cost, 0);
  if (!needed.length) return { planned: false, coverage: null, factor: 1, stalled: false, assigned, buildCost: 0, runCost: 0 };
  const ratio = r => (alloc[r.id] || 0) / need[r.id],
    weakest = needed.reduce((a, r) => (ratio(r) < ratio(a) ? r : a)),
    coverage = ratio(weakest),
    runNeed = p.runNeed || 0;
  return {
    planned: true,
    coverage,
    bottleneck: weakest.name,
    factor: coverage <= 0 ? Infinity : coverage < 1 ? 1 / coverage : Math.max(0.5, 1 / Math.sqrt(coverage)),
    stalled: coverage <= 0,
    assigned,
    needed: needed.reduce((v, r) => v + need[r.id], 0),
    buildCost,
    runCost: assigned > 0 ? buildCost * Math.min(1, runNeed / assigned) : 0,
    runCoverage: runNeed > 0 ? assigned / runNeed : null,
  };
}
// Build coverage, or run coverage once a project is in production.
function staffedShare(p, team) {
  return p.stage === 'Production' && team.runCoverage !== null ? team.runCoverage : team.coverage;
}
export function health(p, s = defaults) {
  if (p.stage === 'Idea') return { signals: [], action: 'Not launched' };
  const team = staffing(p, s),
    staffed = staffedShare(p, team),
    overrun = computeOverrun(p);
  const signals = [
    {
      name: 'Adoption',
      level: p.age >= 6 && p.adoption < 20 ? 2 : p.age >= 3 && p.adoption < 40 ? 1 : 0,
      value: p.adoption + '%',
    },
    { name: 'Data pipeline', level: p.pipeline < 95 ? 2 : p.pipeline < 98 ? 1 : 0, value: p.pipeline + '%' },
    {
      name: 'Sponsor',
      level: p.sponsor === 'Missing' ? 2 : p.sponsor === 'Limited' ? 1 : 0,
      value: p.sponsor,
    },
    {
      name: 'Accuracy',
      level: p.accuracy < p.accuracyTarget && p.trend <= 0 ? 1 : 0,
      value: p.accuracy + '% · ' + (p.trend >= 0 ? '+' : '') + p.trend + ' pp/mo',
    },
  ];
  if (team.planned)
    signals.push({
      name: 'Team staffing',
      level: staffed < 0.5 ? 2 : staffed < 1 ? 1 : 0,
      value:
        p.stage === 'Production' && team.runCoverage !== null
          ? `${team.assigned} assigned · ${p.runNeed} run FTE needed`
          : Math.round(staffed * 100) + '% of build team',
    });
  if (overrun !== null)
    signals.push({
      name: 'Compute vs budget',
      level: overrun > 0.25 ? 2 : overrun > 0.1 ? 1 : 0,
      value: (overrun > 0 ? '+' : '') + Math.round(overrun * 100) + '% vs budget',
    });
  const red = signals.filter(s => s.level === 2).length,
    yellow = signals.filter(s => s.level === 1).length;
  return {
    signals,
    action: red >= 2 ? 'Escalate' : red || yellow >= 2 ? 'Investigate' : yellow ? 'Monitor' : 'Healthy',
  };
}
const ratings = ['Low', 'Medium', 'High'];
// Compute run-rate over (+) or under (−) the approved budget, as a fraction; null without a budget.
export function computeOverrun(p) {
  return p.computeBudget > 0 ? p.compute / p.computeBudget - 1 : null;
}
// Team capacity comes from Tech team staffing when the project has a team need; otherwise the manual rating.
export function readiness(p, s = defaults) {
  const team = staffing(p, s),
    staffed = team.planned ? staffedShare(p, team) : null,
    teamValue = staffed === null ? p.teamCapacity : staffed < 0.5 ? 'High' : staffed < 1 ? 'Medium' : 'Low';
  const items = [
    ['Data readiness', p.dataReadiness],
    ['Integration', p.integration],
    ['Vendor dependency', p.vendorRisk],
    ['Team capacity', teamValue, staffed !== null],
  ].map(([name, value, derived = false]) => ({
    name,
    value,
    derived,
    level: value === 'High' ? 2 : value === 'Medium' ? 1 : value === 'Low' ? 0 : null,
  }));
  const high = items.filter(i => i.level === 2).length,
    medium = items.filter(i => i.level === 1).length,
    unknown = items.filter(i => i.level === null).length;
  return {
    items,
    status: high >= 2 ? 'Not ready' : high || medium >= 2 ? 'At risk' : unknown ? 'Incomplete' : 'Ready',
  };
}
export function compliance(p) {
  const required = [['Security review', p.securityReview]];
  if (p.dataSensitivity === 'Personal') required.push(['Legal & privacy review', p.legalReview]);
  if (p.aiRisk === 'High') required.push(['Model risk review', p.modelRiskReview]);
  const missing = required.filter(([, v]) => v !== 'Approved').map(([n]) => n);
  return {
    required: required.map(([n]) => n),
    missing,
    status: !missing.length ? 'Cleared' : p.stage === 'Idea' ? 'Pending' : 'Blocked',
  };
}
// Probability of success: stage starting point × delivery-risk and missing-approval adjustments,
// floored. A manual override applies only with a written reason.
export function successProbability(p, s = defaults) {
  const base = s['prob' + p.stage] ?? 100,
    factors = [],
    unassessed = [];
  for (const item of readiness(p, s).items) {
    if (item.level === 2) factors.push({ name: item.name + ' high risk', factor: s.riskHigh });
    else if (item.level === 1) factors.push({ name: item.name + ' medium risk', factor: s.riskMedium });
    else if (item.level === null) unassessed.push(item.name);
  }
  if (p.sponsor === 'Limited') factors.push({ name: 'Sponsor limited', factor: s.sponsorLimited });
  if (p.sponsor === 'Missing') factors.push({ name: 'Sponsor missing', factor: s.sponsorMissing });
  if (p.stage !== 'Idea')
    for (const name of compliance(p).missing) factors.push({ name: name + ' missing', factor: s.approvalFactor });
  const computed = Math.max(s.probFloor, factors.reduce((v, x) => v * x.factor, base)),
    reason = String(p.probReason || '').trim(),
    validPct = Number.isFinite(p.probOverride),
    overridden = !!p.probOverrideOn && reason !== '' && validPct;
  return {
    base,
    factors,
    unassessed,
    computed,
    overridden,
    overrideMissingReason: !!p.probOverrideOn && !reason,
    overrideMissingPct: !!p.probOverrideOn && !validPct,
    reason,
    value: overridden ? Math.min(100, Math.max(0, p.probOverride)) : computed,
  };
}
// Measured progress from baseline toward target, capped at 100%. Scales estimated benefits for the
// evidence-adjusted NPV; it assumes cash benefit moves in proportion to the business KPI.
export function evidenceProgress(p) {
  const better = p.direction === 'higher' ? p.target > p.before : p.target < p.before;
  if (p.stage === 'Idea') return { applicable: false, reason: 'Not launched yet' };
  if (p.baseline === 'Missing') return { applicable: false, reason: 'No baseline' };
  if (!(p.age > 0)) return { applicable: false, reason: 'No observation period yet' };
  if (!better) return { applicable: false, reason: 'Target is not an improvement on the baseline' };
  const raw = (p.direction === 'higher' ? p.after - p.before : p.before - p.after) / Math.abs(p.target - p.before);
  return { applicable: true, raw, progress: Math.min(1, Math.max(0, raw)), provisional: p.baseline === 'Partial' };
}
export function breakEven({ cap, pvBenefits, pvFixed, pvVariable }) {
  const costs = cap + pvFixed + pvVariable;
  return {
    benefits: pvBenefits > 0 ? costs / pvBenefits : null,
    costHeadroom: costs > 0 ? pvBenefits / costs - 1 : null,
  };
}
export function paybackMonths(flows) {
  let c = 0,
    negative = false,
    payback = null;
  for (let m = 0; m < flows.length; m++) {
    const before = c;
    c += flows[m];
    if (c < 0) {
      negative = true;
      payback = null;
    } else if (before < 0) payback ??= m - 1 + -before / flows[m];
  }
  return negative ? payback : 0;
}
export function irr(flows) {
  if (!flows.some(v => v > 0) || !flows.some(v => v < 0)) return null;
  let changes = 0;
  let prev = 0;
  for (const f of flows) {
    if (f) {
      const sign = Math.sign(f);
      if (prev && sign !== prev) changes++;
      prev = sign;
    }
  }
  if (changes !== 1) return null;
  const value = r => flows.reduce((s, f, i) => s + f / Math.pow(1 + r, i), 0);
  let lo = -0.9999,
    hi = 1;
  while (value(hi) > 0 && hi < 1e6) hi *= 2;
  if (value(lo) * value(hi) > 0) return null;
  for (let i = 0; i < 160; i++) {
    const m = (lo + hi) / 2;
    if (value(m) > 0) lo = m;
    else hi = m;
  }
  return Math.pow(1 + (lo + hi) / 2, 12) - 1;
}
export function calculate(p, s = defaults) {
  const cap = (setup(p) * s.costFactor) / 100,
    op = (operating(p) * s.costFactor) / 100;
  const capacity = (p.hours * p.hourly * p.realization) / 100;
  const gross =
    ((p.direct + (p.indirect * p.indirectCash) / 100 + (s.capacity ? capacity : 0)) * s.benefitFactor) / 100;
  const months = s.years * 12,
    flows = [-cap],
    pvFlows = [-cap],
    yearly = [],
    cumulative = [-cap];
  const share = s.sharedShares?.[p.id] || { total: 0, byCategory: {} },
    sharedAnnual = share.total;
  const team = staffing(p, s),
    effDelay = team.stalled ? Infinity : p.delay * team.factor,
    effRamp = Math.max(1, team.stalled ? p.ramp : p.ramp * team.factor),
    fullAt = effDelay + s.delay + effRamp;
  let totalBenefits = 0,
    totalCosts = cap,
    totalTeam = 0,
    totalShared = 0,
    npv = -cap,
    pvBenefits = 0,
    pvFixed = 0,
    pvVariable = 0,
    pvOverrun = 0,
    pvBuildLoss = 0;
  for (let m = 1; m <= months; m++) {
    const yr = Math.floor((m - 1) / 12),
      active = m - effDelay - s.delay;
    const ramp = active <= 0 ? 0 : Math.min(active / effRamp, 1);
    const building = Math.min(1, Math.max(0, fullAt - (m - 1))),
      teamCost =
        s.teamCost === false
          ? 0
          : ((((building * team.buildCost + (1 - building) * team.runCost) / 12) * s.costFactor) / 100);
    totalTeam += teamCost;
    const sharedCost = s.sharedCost === false ? 0 : (sharedAnnual / 12) * (s.costFactor / 100);
    totalShared += sharedCost;
    const usage = (p.adoption / 100) * ramp * Math.pow(1 + p.growth / 100, yr),
      benefit = (gross / 12) * usage,
      fixed = (op / 12) * Math.pow(1 + p.costGrowth / 100, yr) + teamCost + sharedCost,
      variable = ((((p.unitCost || 0) * (p.volume || 0)) / 12) * usage * s.costFactor) / 100,
      cost = fixed + variable,
      net = benefit - cost,
      d = Math.pow(1 + s.rate / 100, -m / 12);
    pvBenefits += benefit * d;
    pvFixed += fixed * d;
    pvVariable += variable * d;
    // Costs incurred while the project is still being delivered are lost if it fails.
    pvBuildLoss += cost * d * Math.min(1, Math.max(0, fullAt - (m - 1)));
    if (p.computeBudget > 0)
      pvOverrun +=
        ((((Math.max(0, p.compute - p.computeBudget) / 12) * Math.pow(1 + p.costGrowth / 100, yr) * s.costFactor) / 100) * d);
    flows.push(net);
    cumulative.push(cumulative.at(-1) + net);
    const pv = net * d;
    pvFlows.push(pv);
    npv += pv;
    totalBenefits += benefit;
    totalCosts += cost;
    yearly[yr] ??= { year: yr + 1, benefit: 0, cost: 0, net: 0, team: 0, shared: 0 };
    yearly[yr].shared += sharedCost;
    yearly[yr].team += teamCost;
    yearly[yr].benefit += benefit;
    yearly[yr].cost += cost;
    yearly[yr].net += net;
  }
  const success = successProbability(p, s),
    probability = success.value / 100,
    steadyVolume = ((p.volume || 0) * p.adoption) / 100,
    runTeam = s.teamCost === false ? 0 : (team.runCost * s.costFactor) / 100,
    runShared = s.sharedCost === false ? 0 : (sharedAnnual * s.costFactor) / 100,
    unitCost =
      steadyVolume > 0
        ? (op + runTeam + runShared + ((p.unitCost || 0) * steadyVolume * s.costFactor) / 100) / steadyVolume
        : 0,
    unitBenefit = steadyVolume > 0 ? (gross * p.adoption) / 100 / steadyVolume : 0;
  const h = health(p, s),
    ready = readiness(p, s),
    evidence = evidenceProgress(p),
    comply = compliance(p);
  let recommendation =
    p.stage === 'Idea'
      ? npv <= 0
        ? 'Rework'
        : 'Validate'
      : h.action === 'Escalate' ||
    h.action === 'Investigate' ||
    p.baseline !== 'Verified' ||
    comply.status === 'Blocked'
      ? 'Intervene'
      : npv <= 0
        ? 'Rework'
        : p.stage === 'Production' && p.adoption >= 80
          ? 'Scale'
          : 'Continue';
  const riskAdjustedNPV = probability * npv - (1 - probability) * (cap + pvBuildLoss),
    evidenceNPV = evidence.applicable ? npv - (1 - evidence.progress) * pvBenefits : null,
    cautions = [];
  if (npv > 0 && riskAdjustedNPV <= 0) cautions.push('Positive NPV, but negative once the chance of failure is priced in');
  if (npv > 0 && evidenceNPV !== null && evidenceNPV <= 0)
    cautions.push('Measured results do not yet support a positive NPV');
  return {
    npv,
    cautions,
    irr: irr(flows),
    payback: paybackMonths(flows),
    discountedPayback: paybackMonths(pvFlows),
    fundingRequest: cap + yearly[0].cost,
    probability,
    success,
    evidence: { ...evidence, npv: evidenceNPV },
    compute: { overrun: computeOverrun(p), pvCost: pvOverrun },
    failureLoss: cap + pvBuildLoss,
    riskAdjustedNPV,
    pvBenefits,
    pvFixed,
    pvVariable,
    breakEven: {
      ...breakEven({ cap, pvBenefits, pvFixed, pvVariable }),
      adoption:
        pvBenefits - pvVariable > 0 ? (p.adoption * (cap + pvFixed)) / (pvBenefits - pvVariable) : null,
    },
    unit:
      steadyVolume > 0
        ? { volume: steadyVolume, cost: unitCost, benefit: unitBenefit, net: unitBenefit - unitCost }
        : null,
    readiness: ready,
    compliance: comply,
    shared: {
      annual: runShared,
      byCategory: Object.fromEntries(
        Object.entries(share.byCategory).map(([k, v]) => [k, s.sharedCost === false ? 0 : (v * s.costFactor) / 100]),
      ),
      totalCost: totalShared,
    },
    team: {
      ...team,
      totalCost: totalTeam,
      monthsToFull: fullAt,
      baseMonthsToFull: p.delay + s.delay + Math.max(1, p.ramp),
    },
    roi: (totalBenefits - totalCosts) / totalCosts,
    capitalROI: (totalBenefits - totalCosts) / cap,
    referencePayback: ((setup(p) + operating(p)) / (p.direct + capacity - operating(p))) * 12,
    capacity,
    cap,
    op,
    gross,
    totalBenefits,
    totalCosts,
    flows,
    cumulative,
    yearly,
    health: h,
    recommendation,
  };
}
