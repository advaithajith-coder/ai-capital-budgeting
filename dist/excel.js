// Builds a live Excel workbook from the app state. Every figure is a formula over the exported
// inputs, mirroring model.js, so editing an input in Excel recalculates the whole portfolio.
import { Workbook, cell, col, sheetRef } from './xlsx.js';
import { sharedDrivers } from './model.js';
import { aggregate, scenarioPresets } from './portfolio.js';

const MONTHS = 120;
// Excel's IRR can fail to converge from a single guess, so try several before giving up.
const irrOf = range =>
  ['0.01', '-0.05', '-0.15', '-0.3', '-0.6', '0.2'].reduceRight(
    (inner, g) => `IFERROR(IRR(${range},${g}),${inner})`,
    '"N/A"',
  ); // longest horizon (10 years); later months are zeroed by the horizon flag
const STAGES = ['Idea', 'Pilot', 'Production'];
const RATINGS = ['Not assessed', 'Low', 'Medium', 'High'];
const REVIEWS = ['Not started', 'In progress', 'Approved'];
const BASIS = Object.entries(sharedDrivers); // order defines the CHOOSE index in Shared IT weights

// Style shorthands
const st = {
  title: { font: 'title' },
  sub: { font: 'subtitle' },
  muted: { font: 'muted' },
  wrapMuted: { font: 'muted', wrap: true },
  header: { font: 'header', fill: 'header', wrap: true },
  label: {},
  bold: { font: 'bold' },
  input: fmt => ({ font: 'input', fmt }),
  key: fmt => ({ font: 'input', fill: 'key', fmt }),
  link: fmt => ({ font: 'link', fmt }),
  calc: fmt => ({ fmt }),
  total: fmt => ({ font: 'bold', fill: 'total', fmt }),
};
const yesNo = v => (v ? 'Yes' : 'No');
const sheetTitle = (sheet, r, title, note) => {
  sheet.set(r, 0, title, st.title);
  if (note) sheet.set(r + 1, 0, note, st.muted);
};
const headerRow = (sheet, r, c0, labels) => {
  labels.forEach((l, i) => sheet.set(r, c0 + i, l, st.header));
  sheet.height(r, 30);
};
const safeName = (i, name) =>
  `P${i + 1} ${name}`
    .replace(/[\\/?*[\]:']/g, ' ')
    .slice(0, 31)
    .trim();

// Project input columns on the Projects sheet: [key, header, format, width, export(p, s), validation]
export function projectColumns(team) {
  const pct = k => p => (p[k] ?? 0) / 100;
  return [
    ['id', 'ID', 'general', 12, p => p.id],
    ['name', 'Automation', 'general', 30, p => p.name],
    ['team', 'Department', 'general', 18, p => p.team],
    ['owner', 'Executive owner', 'general', 18, p => p.owner],
    ['stage', 'Stage', 'general', 11, p => p.stage, STAGES],
    ['age', 'Months live', 'int', 9, p => p.age],
    [
      'include',
      'In portfolio',
      'general',
      10,
      (p, state) => yesNo(!state.excluded.includes(p.id)),
      ['Yes', 'No'],
    ],
    ['upfront', 'Implementation ($)', 'money', 14, p => p.upfront],
    ['data', 'Data preparation ($)', 'money', 14, p => p.data],
    ['training', 'Training & change ($)', 'money', 14, p => p.training],
    ['compute', 'Compute ($/yr)', 'money', 13, p => p.compute],
    ['storage', 'Storage & licences ($/yr)', 'money', 13, p => p.storage],
    ['maintenance', 'Maintenance ($/yr)', 'money', 13, p => p.maintenance],
    ['oversight', 'Human oversight ($/yr)', 'money', 13, p => p.oversight],
    ['costGrowth', 'Running cost growth (%/yr)', 'pct', 11, pct('costGrowth')],
    ['computeBudget', 'Compute budget ($/yr)', 'money', 13, p => p.computeBudget],
    ['volume', 'Annual volume', 'int', 13, p => p.volume || 0],
    ['volumeUnit', 'Volume unit', 'general', 16, p => p.volumeUnit],
    ['unitCost', 'Usage cost per unit ($)', 'unit', 12, p => p.unitCost || 0],
    ['direct', 'Direct savings ($/yr)', 'money', 14, p => p.direct],
    ['indirect', 'Indirect gains ($/yr)', 'money', 14, p => p.indirect],
    ['indirectCash', 'Indirect cash share (%)', 'pct', 11, pct('indirectCash')],
    ['growth', 'Benefit growth (%/yr)', 'pct', 11, pct('growth')],
    ['hours', 'Hours recovered / yr', 'int', 11, p => p.hours],
    ['hourly', 'Loaded cost / hour ($)', 'money', 11, p => p.hourly],
    ['realization', 'Capacity realization (%)', 'pct', 11, pct('realization')],
    ['adoption', 'Adoption (%)', 'pct', 10, pct('adoption')],
    ['ramp', 'Ramp (months)', 'months', 9, p => p.ramp],
    ['delay', 'Delay (months)', 'months', 9, p => p.delay],
    ...team.map(r => [`need_${r.id}`, `${r.name} needed`, 'int', 10, p => p.need?.[r.id] || 0]),
    ...team.map(r => [`alloc_${r.id}`, `${r.name} assigned`, 'int', 10, p => p.alloc?.[r.id] || 0]),
    ['runNeed', 'Run support (FTE)', 'num2', 9, p => p.runNeed || 0],
    ['dataReadiness', 'Data readiness risk', 'general', 13, p => p.dataReadiness, RATINGS],
    ['integration', 'Integration complexity', 'general', 13, p => p.integration, RATINGS],
    ['vendorRisk', 'Vendor dependency', 'general', 13, p => p.vendorRisk, RATINGS],
    ['teamCapacity', 'Team capacity risk (manual)', 'general', 13, p => p.teamCapacity, RATINGS],
    [
      'dataSensitivity',
      'Data sensitivity',
      'general',
      13,
      p => p.dataSensitivity,
      ['Public', 'Internal', 'Confidential', 'Personal'],
    ],
    ['aiRisk', 'AI risk level', 'general', 11, p => p.aiRisk, ['Minimal', 'Limited', 'High']],
    ['securityReview', 'Security review', 'general', 12, p => p.securityReview, REVIEWS],
    ['legalReview', 'Legal & privacy review', 'general', 12, p => p.legalReview, REVIEWS],
    ['modelRiskReview', 'Model risk review', 'general', 12, p => p.modelRiskReview, REVIEWS],
    ['sponsor', 'Sponsor engagement', 'general', 11, p => p.sponsor, ['Engaged', 'Limited', 'Missing']],
    ['baseline', 'Baseline quality', 'general', 11, p => p.baseline, ['Verified', 'Partial', 'Missing']],
    ['kpi', 'Business KPI', 'general', 20, p => p.kpi],
    ['unit', 'KPI unit', 'general', 9, p => p.unit],
    ['direction', 'Better is', 'general', 9, p => p.direction, ['lower', 'higher']],
    ['before', 'Baseline value', 'num2', 10, p => p.before],
    ['target', 'Target value', 'num2', 10, p => p.target],
    ['after', 'Latest value', 'num2', 10, p => p.after],
    ['pipeline', 'Data pipeline (%)', 'pct', 10, pct('pipeline')],
    ['accuracy', 'Model accuracy (%)', 'pct', 10, pct('accuracy')],
    ['accuracyTarget', 'Accuracy target (%)', 'pct', 10, pct('accuracyTarget')],
    ['trend', 'Accuracy trend (pp/mo)', 'num2', 10, p => p.trend],
    ['probOverrideOn', 'Override probability', 'general', 10, p => yesNo(p.probOverrideOn), ['Yes', 'No']],
    [
      'probOverride',
      'Override probability (%)',
      'pct',
      10,
      p => (Number.isFinite(p.probOverride) ? p.probOverride / 100 : 0),
    ],
    ['probReason', 'Override reason', 'general', 24, p => p.probReason || ''],
    ['description', 'Description', 'general', 36, p => p.description],
    ['evidence', 'Evidence & next steps', 'general', 48, p => p.evidence],
  ];
}

export function buildWorkbook(state, exportedAt = new Date()) {
  const s = state.settings,
    projects = state.projects,
    team = s.team,
    shared = s.shared || [],
    wb = new Workbook();

  // Sheets in display order (formulas may reference sheets defined later).
  const readme = wb.sheet('Read me'),
    overview = wb.sheet('Overview'),
    settings = wb.sheet('Settings'),
    proj = wb.sheet('Projects'),
    teamSheet = wb.sheet('Team'),
    sharedSheet = wb.sheet('Shared IT'),
    portfolio = wb.sheet('Portfolio'),
    scen = wb.sheet('Scenarios'),
    healthSheet = wb.sheet('Health'),
    calcNames = projects.map((p, i) => safeName(i, p.name)),
    calcs = calcNames.map(n => wb.sheet(n));
  overview.tab = 'FF315DE8';
  settings.tab = proj.tab = teamSheet.tab = sharedSheet.tab = 'FFDDA556';
  calcs.forEach(c => (c.tab = 'FF9B81D9'));

  // ---------------- Settings ----------------
  sheetTitle(
    settings,
    0,
    'Settings',
    'Blue cells are inputs. Yellow cells are the key levers. Everything else recalculates.',
  );
  settings.width(0, 44);
  settings.width(1, 16);
  settings.width(2, 14);
  settings.width(3, 16);
  settings.width(4, 70);
  headerRow(settings, 3, 0, ['Setting', 'Value', '', '', 'Notes']);
  const scenarioName = { base: 'Base', downside: 'Downside', upside: 'Upside' }[state.scenario] || 'Custom';
  const setRows = [
    // [name, label, value, format, note, validation, key?]
    [
      'Rate',
      'Discount (hurdle) rate',
      s.rate / 100,
      'pct',
      'Effective annual rate; monthly flows are discounted at (1 + rate)^(month/12).',
      null,
      true,
    ],
    [
      'Years',
      'Horizon (years)',
      s.years,
      'int',
      'Months beyond the horizon are zeroed.',
      ['2', '3', '5', '10'],
      true,
    ],
    [
      'Scenario',
      'Scenario',
      scenarioName,
      'general',
      'Base, Downside, Upside use the preset table below; Custom uses the three custom inputs.',
      ['Base', 'Downside', 'Upside', 'Custom'],
      true,
    ],
    [
      'CustomBenefit',
      'Custom: estimated benefits multiplier',
      s.benefitFactor / 100,
      'pct',
      'Used only when Scenario = Custom.',
    ],
    ['CustomCost', 'Custom: cost multiplier', s.costFactor / 100, 'pct', 'Used only when Scenario = Custom.'],
    [
      'CustomDelay',
      'Custom: additional rollout delay (months)',
      s.delay,
      'months',
      'Used only when Scenario = Custom.',
    ],
    ['BenefitFactor', 'Estimated benefits multiplier in use', null, 'pct', 'Formula: from the scenario.'],
    [
      'CostFactor',
      'Cost multiplier in use',
      null,
      'pct',
      'Formula: scales one-time, running, team and shared IT costs.',
    ],
    [
      'ExtraDelay',
      'Additional rollout delay in use (months)',
      null,
      'months',
      'Formula: added to every project delay.',
    ],
    [
      'CapacityOn',
      'Include recovered capacity value',
      yesNo(s.capacity),
      'general',
      'Capacity is an economic proxy, not cash. Off by default.',
      ['Yes', 'No'],
    ],
    [
      'TeamCostOn',
      'Charge tech team cost to projects',
      yesNo(s.teamCost !== false),
      'general',
      'Staffing delays apply either way.',
      ['Yes', 'No'],
    ],
    [
      'SharedCostOn',
      'Charge shared IT costs to projects',
      yesNo(s.sharedCost !== false),
      'general',
      'Each category is still split; this only stops the charge.',
      ['Yes', 'No'],
    ],
    [null, 'Probability of success', null, null, null],
    ['ProbIdea', 'Stage start: Idea', s.probIdea / 100, 'pct', 'Starting probability before adjustments.'],
    ['ProbPilot', 'Stage start: Pilot', s.probPilot / 100, 'pct', ''],
    ['ProbProduction', 'Stage start: Production', s.probProduction / 100, 'pct', ''],
    [
      'RiskHigh',
      'Each high delivery risk ×',
      s.riskHigh,
      'factor',
      'Not assessed ratings are neutral (× 1).',
    ],
    ['RiskMedium', 'Each medium delivery risk ×', s.riskMedium, 'factor', ''],
    [
      'ApprovalFactor',
      'Each missing required approval ×',
      s.approvalFactor,
      'factor',
      'Pilot and production projects only.',
    ],
    ['SponsorLimited', 'Sponsor limited ×', s.sponsorLimited, 'factor', ''],
    ['SponsorMissing', 'Sponsor missing ×', s.sponsorMissing, 'factor', ''],
    ['ProbFloor', 'Floor', s.probFloor / 100, 'pct', 'Probability never falls below this.'],
  ];
  const S = {}; // defined-name → address on Settings
  setRows.forEach(([name, label, value, fmt, note, validation, key], i) => {
    const r = 4 + i;
    if (!name) {
      settings.set(r, 0, label, st.sub);
      return;
    }
    settings.set(r, 0, label);
    S[name] = cell(r, 1, true);
    if (value !== null) settings.set(r, 1, value, key ? st.key(fmt) : st.input(fmt));
    if (note) settings.set(r, 4, note, st.muted);
    if (validation) settings.validate(cell(r, 1), validation);
    wb.define(name, 'Settings', S[name]);
  });
  // Scenario presets
  const presetRow = 4 + setRows.length + 2;
  settings.set(presetRow - 1, 0, 'Scenario presets', st.sub);
  headerRow(settings, presetRow, 0, ['Scenario', 'Benefits ×', 'Costs ×', 'Added delay (months)']);
  Object.entries(scenarioPresets).forEach(([k, v], i) => {
    const r = presetRow + 1 + i;
    settings.set(r, 0, k[0].toUpperCase() + k.slice(1), st.label);
    settings.set(r, 1, v.benefitFactor / 100, st.input('pct'));
    settings.set(r, 2, v.costFactor / 100, st.input('pct'));
    settings.set(r, 3, v.delay, st.input('months'));
  });
  const pr = presetRow + 1,
    presetRange = c => `${cell(pr, c, true)}:${cell(pr + 2, c, true)}`,
    fromPreset = (custom, c) => ({
      f: `IF(Scenario="Custom",${custom},INDEX(${presetRange(c)},MATCH(Scenario,${presetRange(0)},0)))`,
    });
  settings.set(+S.BenefitFactor.match(/\d+/)[0] - 1, 1, fromPreset('CustomBenefit', 1), st.calc('pct'));
  settings.set(+S.CostFactor.match(/\d+/)[0] - 1, 1, fromPreset('CustomCost', 2), st.calc('pct'));
  settings.set(+S.ExtraDelay.match(/\d+/)[0] - 1, 1, fromPreset('CustomDelay', 3), st.calc('months'));
  const hmRow = pr + 5;
  settings.set(hmRow, 0, 'Horizon in months');
  settings.set(hmRow, 1, { f: 'Years*12' }, st.calc('int'));
  wb.define('HorizonMonths', 'Settings', cell(hmRow, 1, true));
  // Shared IT basis list (validation source and CHOOSE order)
  const basisRow = hmRow + 3;
  settings.set(basisRow - 1, 0, 'Shared IT allocation bases (order is used by formulas)', st.sub);
  BASIS.forEach(([, d], i) => settings.set(basisRow + i, 0, d.label, st.muted));
  wb.define(
    'BasisList',
    'Settings',
    `${cell(basisRow, 0, true)}:${cell(basisRow + BASIS.length - 1, 0, true)}`,
  );

  // ---------------- Projects ----------------
  const cols = projectColumns(team),
    C = Object.fromEntries(cols.map(([k], i) => [k, i])),
    firstRow = 4;
  sheetTitle(
    proj,
    0,
    'Projects',
    'One row per automation. Blue cells are inputs; percentages are stored as fractions (75% = 0.75). Add projects in the app, then export again.',
  );
  headerRow(
    proj,
    3,
    0,
    cols.map(c => c[1]),
  );
  cols.forEach(([, , , w, , validation], i) => {
    proj.width(i, w);
    if (validation)
      proj.validate(
        `${col(i)}${firstRow + 1}:${col(i)}${firstRow + Math.max(1, projects.length)}`,
        validation,
      );
  });
  proj.freeze = { row: 4, col: 2 };
  projects.forEach((p, i) => {
    cols.forEach(([k, , fmt, , get], c) => {
      const v = get(p, state);
      proj.set(firstRow + i, c, v ?? '', c < 1 ? st.muted : st.input(fmt));
    });
  });
  // P(i, key) → absolute reference to a project's input
  const P = (i, k) => sheetRef('Projects', cell(firstRow + i, C[k], true));
  const projRange = k =>
    sheetRef('Projects', `${cell(firstRow, C[k], true)}:${cell(firstRow + projects.length - 1, C[k], true)}`);

  // ---------------- Team ----------------
  sheetTitle(
    teamSheet,
    0,
    'Tech team',
    'Headcount and loaded annual cost per role are inputs. Assignments are on the Projects sheet.',
  );
  [24, 12, 16, 12, 12, 16].forEach((w, i) => teamSheet.width(i, w));
  headerRow(teamSheet, 3, 0, [
    'Role',
    'People',
    'Loaded cost / yr ($)',
    'Assigned',
    'Bench',
    'Annual cost ($)',
  ]);
  const T = {}; // role id → { name, cost } absolute refs
  team.forEach((r, i) => {
    const row = 4 + i;
    teamSheet.set(row, 0, r.name);
    teamSheet.set(row, 1, r.headcount, st.input('int'));
    teamSheet.set(row, 2, r.cost, st.input('money'));
    teamSheet.set(row, 3, projects.length ? { f: `SUM(${projRange(`alloc_${r.id}`)})` } : 0, st.link('int'));
    teamSheet.set(row, 4, { f: `${cell(row, 1)}-${cell(row, 3)}` }, st.calc('int'));
    teamSheet.set(row, 5, { f: `${cell(row, 1)}*${cell(row, 2)}*CostFactor` }, st.calc('money'));
    T[r.id] = { name: sheetRef('Team', cell(row, 0, true)), cost: sheetRef('Team', cell(row, 2, true)) };
  });
  const tEnd = 4 + team.length,
    roleNames = sheetRef('Team', `${cell(4, 0, true)}:${cell(tEnd - 1, 0, true)}`);
  teamSheet.set(tEnd, 0, 'Total', st.total());
  teamSheet.set(tEnd, 1, { f: `SUM(${cell(4, 1)}:${cell(tEnd - 1, 1)})` }, st.total('int'));
  teamSheet.set(tEnd, 3, { f: `SUM(${cell(4, 3)}:${cell(tEnd - 1, 3)})` }, st.total('int'));
  teamSheet.set(tEnd, 4, { f: `SUM(${cell(4, 4)}:${cell(tEnd - 1, 4)})` }, st.total('int'));
  teamSheet.set(tEnd, 5, { f: `SUM(${cell(4, 5)}:${cell(tEnd - 1, 5)})` }, st.total('money'));

  // ---------------- Shared IT ----------------
  sheetTitle(
    sharedSheet,
    0,
    'Shared IT costs',
    'Each category is split across all projects by its basis, then summed by department. Cost, basis and names are inputs.',
  );
  sharedSheet.width(0, 30);
  sharedSheet.width(1, 18);
  sharedSheet.width(2, 34);
  for (let c = 3; c < 3 + Math.max(4, shared.length) + 2; c++) sharedSheet.width(c, 16);
  headerRow(sharedSheet, 3, 0, [
    'Category',
    'Annual cost ($)',
    'Split by',
    'Basis #',
    'Sum of weights',
    'Unallocated ($)',
  ]);
  const nC = shared.length,
    catRow = i => 4 + i;
  shared.forEach((c, i) => {
    const r = catRow(i);
    sharedSheet.set(r, 0, c.name, st.input());
    sharedSheet.set(r, 1, c.cost, st.input('money'));
    sharedSheet.set(r, 2, sharedDrivers[c.driver]?.label || sharedDrivers.equal.label, st.input());
    sharedSheet.set(r, 3, { f: `MATCH(${cell(r, 2)},BasisList,0)` }, st.calc('int'));
  });
  if (nC) sharedSheet.validate(`C5:C${4 + nC}`, 'BasisList');
  const wTop = 4 + nC + 3, // weights header row
    wRow = i => wTop + 1 + i,
    sTop = wTop + projects.length + 4, // shares header row
    sRow = i => sTop + 1 + i,
    catCol = j => 3 + j;
  sharedSheet.set(wTop - 1, 0, 'Weights by project (from the basis)', st.sub);
  headerRow(sharedSheet, wTop, 0, ['Project', 'Department', 'Stage', ...shared.map(c => c.name)]);
  sharedSheet.set(sTop - 1, 0, 'Annual share by project ($, before the cost multiplier)', st.sub);
  headerRow(sharedSheet, sTop, 0, [
    'Project',
    'Department',
    'Stage',
    ...shared.map(c => c.name),
    'Total ($/yr)',
  ]);
  const allocSum = i => team.map(r => P(i, `alloc_${r.id}`)).join('+') || '0',
    weightFormula = (i, j) => {
      const basis = sheetRef('Shared IT', cell(catRow(j), 3, true)),
        options = BASIS.map(([k]) => {
          if (k === 'compute')
            return `${P(i, 'compute')}+${P(i, 'unitCost')}*${P(i, 'volume')}*${P(i, 'adoption')}`;
          if (k === 'data') return C.alloc_data !== undefined ? P(i, 'alloc_data') : '0';
          if (k === 'people') return `(${allocSum(i)})`;
          if (k === 'live') return `IF(${P(i, 'stage')}="Idea",0,1)`;
          if (k === 'sensitivity')
            return `IFERROR(INDEX({3,2,1,0},MATCH(${P(i, 'dataSensitivity')},{"Personal","Confidential","Internal","Public"},0)),1)`;
          return '1';
        });
      return { f: `MAX(0,CHOOSE(${basis},${options.join(',')}))` };
    };
  projects.forEach((p, i) => {
    [wRow(i), sRow(i)].forEach(r => {
      sharedSheet.set(r, 0, { f: P(i, 'name') }, st.link());
      sharedSheet.set(r, 1, { f: P(i, 'team') }, st.link());
      sharedSheet.set(r, 2, { f: P(i, 'stage') }, st.link());
    });
    shared.forEach((c, j) => {
      sharedSheet.set(wRow(i), catCol(j), weightFormula(i, j), st.calc('num2'));
      const sum = sheetRef('Shared IT', cell(catRow(j), 4, true));
      sharedSheet.set(
        sRow(i),
        catCol(j),
        { f: `IF(${sum}>0,${cell(catRow(j), 1, true)}*${cell(wRow(i), catCol(j))}/${sum},0)` },
        st.calc('money'),
      );
    });
    sharedSheet.set(
      sRow(i),
      catCol(nC),
      nC ? { f: `SUM(${cell(sRow(i), catCol(0))}:${cell(sRow(i), catCol(nC - 1))})` } : 0,
      st.total('money'),
    );
  });
  shared.forEach((c, j) => {
    const r = catRow(j),
      wr = projects.length
        ? `${cell(wRow(0), catCol(j))}:${cell(wRow(projects.length - 1), catCol(j))}`
        : null;
    sharedSheet.set(r, 4, wr ? { f: `SUM(${wr})` } : 0, st.calc('num2'));
    sharedSheet.set(r, 5, { f: `IF(${cell(r, 4)}>0,0,${cell(r, 1)})` }, st.calc('money'));
  });
  const shareCell = i => sheetRef('Shared IT', cell(sRow(i), catCol(nC), true)),
    shareCatCell = (i, j) => sheetRef('Shared IT', cell(sRow(i), catCol(j), true));
  // Department summary
  const departments = [...new Set(projects.map(p => p.team))].sort(),
    dTop = sTop + projects.length + 3,
    shareRange = j => `${cell(sRow(0), catCol(j), true)}:${cell(sRow(projects.length - 1), catCol(j), true)}`,
    deptRange = `${cell(sRow(0), 1, true)}:${cell(sRow(projects.length - 1), 1, true)}`;
  sharedSheet.set(dTop - 1, 0, 'Split by department ($/yr, before the cost multiplier)', st.sub);
  headerRow(sharedSheet, dTop, 0, [
    'Department',
    '',
    '',
    ...shared.map(c => c.name),
    'Total ($/yr)',
    'Share',
  ]);
  const totalShared = `SUM(${cell(4, 1, true)}:${cell(Math.max(4, 3 + nC), 1, true)})`;
  departments.forEach((d, k) => {
    const r = dTop + 1 + k;
    sharedSheet.set(r, 0, d, st.bold);
    shared.forEach((c, j) =>
      sharedSheet.set(
        r,
        catCol(j),
        projects.length ? { f: `SUMIF(${deptRange},${cell(r, 0)},${shareRange(j)})` } : 0,
        st.calc('money'),
      ),
    );
    sharedSheet.set(
      r,
      catCol(nC),
      nC ? { f: `SUM(${cell(r, catCol(0))}:${cell(r, catCol(nC - 1))})` } : 0,
      st.total('money'),
    );
    sharedSheet.set(
      r,
      catCol(nC) + 1,
      { f: `IF(${totalShared}>0,${cell(r, catCol(nC))}/${totalShared},0)` },
      st.calc('pct'),
    );
  });
  const dEnd = dTop + 1 + departments.length;
  sharedSheet.set(dEnd, 0, 'Unallocated', st.label);
  shared.forEach((c, j) => sharedSheet.set(dEnd, catCol(j), { f: cell(catRow(j), 5) }, st.calc('money')));
  sharedSheet.set(
    dEnd,
    catCol(nC),
    nC ? { f: `SUM(${cell(4, 5)}:${cell(3 + nC, 5)})` } : 0,
    st.total('money'),
  );
  sharedSheet.set(dEnd + 1, 0, 'Total', st.total());
  shared.forEach((c, j) =>
    sharedSheet.set(dEnd + 1, catCol(j), { f: cell(catRow(j), 1) }, st.total('money')),
  );
  sharedSheet.set(dEnd + 1, catCol(nC), nC ? { f: totalShared } : 0, st.total('money'));
  sharedSheet.set(
    dEnd + 3,
    0,
    'Departments are listed as exported. If you rename a department on the Projects sheet, add it here to see its total.',
    st.muted,
  );

  // ---------------- Project calculation sheets ----------------
  // Monthly table columns (0-based) and summary block keys.
  const M = {
      m: 5,
      m1: 6,
      yr: 7,
      inH: 8,
      active: 9,
      ramp: 10,
      usage: 11,
      benefit: 12,
      building: 13,
      team: 14,
      shared: 15,
      fixed: 16,
      variable: 17,
      cost: 18,
      net: 19,
      d: 20,
      pv: 21,
      cum: 22,
      pvcum: 23,
      overrun: 24,
      loss: 25,
      sign: 26,
      change: 27,
    },
    top = 3, // header row of monthly table
    m0 = top + 1, // row of month 0
    mEnd = m0 + MONTHS,
    colRange = k => `${cell(m0, M[k], true)}:${cell(mEnd, M[k], true)}`,
    colRange1 = k => `${cell(m0 + 1, M[k], true)}:${cell(mEnd, M[k], true)}`; // months 1+
  const monthHeaders = {
    m: 'Month',
    m1: 'Month + 1',
    yr: 'Year index',
    inH: 'In horizon',
    active: 'Months active',
    ramp: 'Ramp',
    usage: 'Usage',
    benefit: 'Est. benefits ($)',
    building: 'Building share',
    team: 'Team cost ($)',
    shared: 'Shared IT ($)',
    fixed: 'Fixed running ($)',
    variable: 'Usage cost ($)',
    cost: 'Total cost ($)',
    net: 'Net cash ($)',
    d: 'Discount factor',
    pv: 'PV of net ($)',
    cum: 'Cumulative ($)',
    pvcum: 'Discounted cumulative ($)',
    overrun: 'PV compute overrun ($)',
    loss: 'PV build-phase cost ($)',
    sign: 'Last sign',
    change: 'Sign change',
  };
  const R = []; // per project: key → absolute address on its calc sheet
  projects.forEach((p, i) => {
    const sh = calcs[i],
      name = calcNames[i],
      A = {},
      at = k => A[k],
      in_ = k => P(i, k),
      roles = team;
    sh.width(0, 34);
    sh.width(1, 16);
    sh.width(2, 4);
    sh.width(3, 2);
    Object.keys(M).forEach(k =>
      sh.width(M[k], ['m', 'm1', 'yr', 'inH', 'sign', 'change'].includes(k) ? 8 : 13),
    );
    sh.freeze = { row: top + 1 };
    sh.set(0, 0, { f: `"${name.split(' ')[0]} · "&${in_('name')}` }, st.title);
    sh.set(
      1,
      0,
      'All figures are formulas over the Projects, Settings, Team and Shared IT sheets.',
      st.muted,
    );

    // Summary block: [key, label, formula builder or null for heading, format]
    const rows = [
      [null, 'Costs and benefits'],
      [
        'cap',
        'Initial capital ($)',
        () => `(${in_('upfront')}+${in_('data')}+${in_('training')})*CostFactor`,
        'money',
      ],
      [
        'op',
        'Fixed running costs, year-1 basis ($/yr)',
        () => `(${in_('compute')}+${in_('storage')}+${in_('maintenance')}+${in_('oversight')})*CostFactor`,
        'money',
      ],
      [
        'capacity',
        'Recovered capacity value ($/yr)',
        () => `${in_('hours')}*${in_('hourly')}*${in_('realization')}`,
        'money',
      ],
      [
        'gross',
        'Gross annual benefit at full adoption ($/yr)',
        () =>
          `(${in_('direct')}+${in_('indirect')}*${in_('indirectCash')}+IF(CapacityOn="Yes",${at('capacity')},0))*BenefitFactor`,
        'money',
      ],
      ['share', 'Shared IT share, before multiplier ($/yr)', () => shareCell(i), 'money', 'link'],
      [null, 'Tech team staffing'],
      ...roles.map(r => [
        `ratio_${r.id}`,
        `${r.name}: assigned ÷ needed`,
        () => `IF(${in_(`need_${r.id}`)}>0,${in_(`alloc_${r.id}`)}/${in_(`need_${r.id}`)},"")`,
        'pct',
      ]),
      [
        'planned',
        'Team need entered',
        () => `IF(OR(${roles.map(r => `${in_(`need_${r.id}`)}>0`).join(',') || 'FALSE'}),"Yes","No")`,
        'general',
      ],
      [
        'coverage',
        'Coverage (weakest role)',
        () => `IF(${at('planned')}="Yes",MIN(${roles.map(r => at(`ratio_${r.id}`)).join(',')}),"")`,
        'pct',
      ],
      [
        'bottleneck',
        'Weakest role',
        () =>
          `IF(${at('planned')}="Yes",INDEX(${roleNames},MATCH(${at('coverage')},${at(`ratio_${roles[0].id}`)}:${at(`ratio_${roles[roles.length - 1].id}`)},0)),"")`,
        'general',
      ],
      [
        'stalled',
        'Stalled (a needed role has nobody)',
        () => `IF(AND(${at('planned')}="Yes",N(${at('coverage')})<=0),"Yes","No")`,
        'general',
      ],
      [
        'factor',
        'Time factor',
        () =>
          `IF(${at('planned')}="No",1,IF(${at('stalled')}="Yes",0,IF(${at('coverage')}<1,1/${at('coverage')},MAX(0.5,1/SQRT(${at('coverage')})))))`,
        'factor',
      ],
      ['assigned', 'People assigned', () => roles.map(r => in_(`alloc_${r.id}`)).join('+'), 'num2'],
      [
        'buildCost',
        'Build team cost ($/yr)',
        () =>
          `IF(${at('planned')}="Yes",${roles.map(r => `${in_(`alloc_${r.id}`)}*${T[r.id].cost}`).join('+')},0)`,
        'money',
      ],
      [
        'runCost',
        'Run team cost ($/yr)',
        () =>
          `IF(AND(${at('planned')}="Yes",${at('assigned')}>0),${at('buildCost')}*MIN(1,${in_('runNeed')}/${at('assigned')}),0)`,
        'money',
      ],
      [
        'runCoverage',
        'Run coverage',
        () => `IF(${in_('runNeed')}>0,${at('assigned')}/${in_('runNeed')},"")`,
        'pct',
      ],
      [
        'staffed',
        'Staffing used for health',
        () =>
          `IF(${at('planned')}="Yes",IF(AND(${in_('stage')}="Production",${in_('runNeed')}>0),${at('runCoverage')},${at('coverage')}),"")`,
        'pct',
      ],
      [
        'effDelay',
        'Effective delay (months)',
        () => `IF(${at('stalled')}="Yes",1E+9,${in_('delay')}*${at('factor')})`,
        'months',
      ],
      [
        'effRamp',
        'Effective ramp (months)',
        () => `MAX(1,IF(${at('stalled')}="Yes",${in_('ramp')},${in_('ramp')}*${at('factor')}))`,
        'months',
      ],
      ['fullAt', 'Months to full benefit', () => `${at('effDelay')}+ExtraDelay+${at('effRamp')}`, 'months'],
      [
        'baseFull',
        'Months to full benefit, as planned',
        () => `${in_('delay')}+ExtraDelay+MAX(1,${in_('ramp')})`,
        'months',
      ],
      [null, 'Returns'],
      ['npv', 'NPV ($)', () => `SUM(${colRange('pv')})`, 'money'],
      [
        'pvB',
        'PV of estimated benefits ($)',
        () => `SUMPRODUCT(${colRange1('benefit')},${colRange1('d')})`,
        'money',
      ],
      [
        'pvF',
        'PV of fixed running costs ($)',
        () => `SUMPRODUCT(${colRange1('fixed')},${colRange1('d')})`,
        'money',
      ],
      [
        'pvV',
        'PV of usage costs ($)',
        () => `SUMPRODUCT(${colRange1('variable')},${colRange1('d')})`,
        'money',
      ],
      ['totalBenefits', 'Total estimated benefits ($)', () => `SUM(${colRange1('benefit')})`, 'money'],
      ['totalCosts', 'Total cost of ownership ($)', () => `${at('cap')}+SUM(${colRange1('cost')})`, 'money'],
      [
        'roi',
        'ROI (total cost basis)',
        () => `IFERROR((${at('totalBenefits')}-${at('totalCosts')})/${at('totalCosts')},"N/A")`,
        'pct',
      ],
      [
        'capitalRoi',
        'Capital ROI (initial capital basis)',
        () => `IF(${at('cap')}>0,(${at('totalBenefits')}-${at('totalCosts')})/${at('cap')},"N/A")`,
        'pct',
      ],
      [
        'lastNeg',
        'Last month in deficit + 1 (helper)',
        () => `_xlfn.MAXIFS(${colRange('m1')},${colRange('cum')},"<0",${colRange('m')},"<="&HorizonMonths)`,
        'int',
      ],
      [
        'payback',
        'Payback (months)',
        () =>
          `IF(${at('lastNeg')}=0,0,IF(${at('lastNeg')}-1>=HorizonMonths,"Beyond horizon",${at('lastNeg')}-1-INDEX(${colRange('cum')},${at('lastNeg')})/INDEX(${colRange('net')},${at('lastNeg')}+1)))`,
        'months',
      ],
      [
        'lastNegPv',
        'Last discounted month in deficit + 1 (helper)',
        () => `_xlfn.MAXIFS(${colRange('m1')},${colRange('pvcum')},"<0",${colRange('m')},"<="&HorizonMonths)`,
        'int',
      ],
      [
        'discPayback',
        'Discounted payback (months)',
        () =>
          `IF(${at('lastNegPv')}=0,0,IF(${at('lastNegPv')}-1>=HorizonMonths,"Beyond horizon",${at('lastNegPv')}-1-INDEX(${colRange('pvcum')},${at('lastNegPv')})/INDEX(${colRange('pv')},${at('lastNegPv')}+1)))`,
        'months',
      ],
      ['signChanges', 'Cash-flow sign changes', () => `SUM(${colRange('change')})`, 'int'],
      [
        'irr',
        'IRR (annualized)',
        () =>
          `IF(AND(COUNTIF(${colRange('net')},">0")>0,COUNTIF(${colRange('net')},"<0")>0,${at('signChanges')}=1),IF(ISNUMBER(${irrOf(colRange('net'))}),(1+${irrOf(colRange('net'))})^12-1,"N/A"),"N/A")`,
        'pct',
      ],
      [
        'funding',
        'Year-1 funding request ($)',
        () => `${at('cap')}+SUMIFS(${colRange('cost')},${colRange('m')},">=1",${colRange('m')},"<=12")`,
        'money',
      ],
      [
        'teamY1',
        'Team cost, year 1 ($)',
        () => `SUMIFS(${colRange('team')},${colRange('m')},">=1",${colRange('m')},"<=12")`,
        'money',
      ],
      ['teamTotal', 'Team cost over horizon ($)', () => `SUM(${colRange('team')})`, 'money'],
      [
        'sharedAnnual',
        'Shared IT charged ($/yr)',
        () => `IF(SharedCostOn="Yes",${at('share')}*CostFactor,0)`,
        'money',
      ],
      [
        'refPayback',
        'Reference ratio payback (months)',
        () =>
          `IFERROR(IF(${in_('direct')}+${at('capacity')}-(${in_('compute')}+${in_('storage')}+${in_('maintenance')}+${in_('oversight')})>0,(${in_('upfront')}+${in_('data')}+${in_('training')}+${in_('compute')}+${in_('storage')}+${in_('maintenance')}+${in_('oversight')})/(${in_('direct')}+${at('capacity')}-(${in_('compute')}+${in_('storage')}+${in_('maintenance')}+${in_('oversight')}))*12,"Not reached"),"Not reached")`,
        'months',
      ],
      [null, 'Break-even (one driver at a time)'],
      [
        'beBenefits',
        'Estimated benefits must reach (× estimate)',
        () => `IF(${at('pvB')}>0,(${at('cap')}+${at('pvF')}+${at('pvV')})/${at('pvB')},"N/A")`,
        'pct',
      ],
      [
        'beHeadroom',
        'Costs can rise by',
        () =>
          `IF(${at('cap')}+${at('pvF')}+${at('pvV')}>0,${at('pvB')}/(${at('cap')}+${at('pvF')}+${at('pvV')})-1,"N/A")`,
        'pct',
      ],
      [
        'beAdoption',
        'Adoption must reach',
        () =>
          `IF(${at('pvB')}-${at('pvV')}>0,${in_('adoption')}*(${at('cap')}+${at('pvF')})/(${at('pvB')}-${at('pvV')}),"N/A")`,
        'pct',
      ],
      [null, 'Unit economics (steady state)'],
      ['steadyVol', 'Volume at steady adoption (/yr)', () => `${in_('volume')}*${in_('adoption')}`, 'int'],
      [
        'unitCostPer',
        'Running cost per unit ($)',
        () =>
          `IF(${at('steadyVol')}>0,(${at('op')}+IF(TeamCostOn="Yes",${at('runCost')}*CostFactor,0)+IF(SharedCostOn="Yes",${at('share')}*CostFactor,0)+${in_('unitCost')}*${at('steadyVol')}*CostFactor)/${at('steadyVol')},"N/A")`,
        'unit',
      ],
      [
        'unitBenefitPer',
        'Benefit per unit ($)',
        () => `IF(${at('steadyVol')}>0,${at('gross')}*${in_('adoption')}/${at('steadyVol')},"N/A")`,
        'unit',
      ],
      [
        'overrun',
        'Compute vs budget',
        () => `IF(${in_('computeBudget')}>0,${in_('compute')}/${in_('computeBudget')}-1,"No budget")`,
        'pct',
      ],
      ['overrunPv', 'PV of compute overrun ($)', () => `SUM(${colRange('overrun')})`, 'money'],
      [null, 'Readiness and compliance'],
      ['rData', 'Data readiness risk', () => in_('dataReadiness'), 'general', 'link'],
      ['rInteg', 'Integration complexity', () => in_('integration'), 'general', 'link'],
      ['rVendor', 'Vendor dependency', () => in_('vendorRisk'), 'general', 'link'],
      [
        'rTeam',
        'Team capacity risk (from staffing when entered)',
        () =>
          `IF(${at('planned')}="Yes",IF(${at('staffed')}<0.5,"High",IF(${at('staffed')}<1,"Medium","Low")),${in_('teamCapacity')})`,
        'general',
      ],
      ['highs', 'High risks', () => `COUNTIF(${at('rData')}:${at('rTeam')},"High")`, 'int'],
      ['mediums', 'Medium risks', () => `COUNTIF(${at('rData')}:${at('rTeam')},"Medium")`, 'int'],
      [
        'unknown',
        'Not assessed',
        () => `4-COUNTIF(${at('rData')}:${at('rTeam')},"Low")-${at('highs')}-${at('mediums')}`,
        'int',
      ],
      [
        'readiness',
        'Delivery readiness',
        () =>
          `IF(${at('highs')}>=2,"Not ready",IF(OR(${at('highs')}=1,${at('mediums')}>=2),"At risk",IF(${at('unknown')}>0,"Incomplete","Ready")))`,
        'general',
      ],
      ['missSec', 'Security review missing', () => `IF(${in_('securityReview')}<>"Approved",1,0)`, 'int'],
      [
        'missLegal',
        'Legal & privacy review missing (personal data)',
        () => `IF(AND(${in_('dataSensitivity')}="Personal",${in_('legalReview')}<>"Approved"),1,0)`,
        'int',
      ],
      [
        'missModel',
        'Model risk review missing (high-risk AI)',
        () => `IF(AND(${in_('aiRisk')}="High",${in_('modelRiskReview')}<>"Approved"),1,0)`,
        'int',
      ],
      ['missing', 'Missing approvals', () => `${at('missSec')}+${at('missLegal')}+${at('missModel')}`, 'int'],
      [
        'missingText',
        'Missing approvals (names)',
        () =>
          `MID(IF(${at('missSec')}=1,", Security review","")&IF(${at('missLegal')}=1,", Legal & privacy review","")&IF(${at('missModel')}=1,", Model risk review",""),3,200)`,
        'general',
      ],
      [
        'compliance',
        'Compliance',
        () => `IF(${at('missing')}=0,"Cleared",IF(${in_('stage')}="Idea","Pending","Blocked"))`,
        'general',
      ],
      [null, 'Probability of success'],
      [
        'probBase',
        'Stage start',
        () =>
          `CHOOSE(MATCH(${in_('stage')},{"Idea","Pilot","Production"},0),ProbIdea,ProbPilot,ProbProduction)`,
        'pct',
      ],
      [
        'sponsorF',
        'Sponsor factor',
        () =>
          `IF(${in_('sponsor')}="Limited",SponsorLimited,IF(${in_('sponsor')}="Missing",SponsorMissing,1))`,
        'factor',
      ],
      [
        'approvalF',
        'Missing-approval factor',
        () => `IF(${in_('stage')}="Idea",1,ApprovalFactor^${at('missing')})`,
        'factor',
      ],
      [
        'probComputed',
        'Rule-based probability',
        () =>
          `MAX(ProbFloor,${at('probBase')}*RiskHigh^${at('highs')}*RiskMedium^${at('mediums')}*${at('sponsorF')}*${at('approvalF')})`,
        'pct',
      ],
      [
        'overridden',
        'Override applied',
        () =>
          `IF(AND(${in_('probOverrideOn')}="Yes",TRIM(${in_('probReason')})<>"",ISNUMBER(${in_('probOverride')})),"Yes","No")`,
        'general',
      ],
      [
        'probability',
        'Probability of success',
        () => `IF(${at('overridden')}="Yes",MIN(1,MAX(0,${in_('probOverride')})),${at('probComputed')})`,
        'pct',
      ],
      ['failureLoss', 'Loss if it fails ($)', () => `${at('cap')}+SUM(${colRange1('loss')})`, 'money'],
      [
        'rnpv',
        'Risk-adjusted NPV ($)',
        () => `${at('probability')}*${at('npv')}-(1-${at('probability')})*${at('failureLoss')}`,
        'money',
      ],
      [null, 'Evidence'],
      [
        'better',
        'Target improves on baseline',
        () =>
          `IF(${in_('direction')}="higher",${in_('target')}>${in_('before')},${in_('target')}<${in_('before')})`,
        'general',
      ],
      [
        'evReason',
        'Evidence status',
        () =>
          `IF(${in_('stage')}="Idea","Not launched yet",IF(${in_('baseline')}="Missing","No baseline",IF(NOT(${in_('age')}>0),"No observation period yet",IF(NOT(${at('better')}),"Target is not an improvement on the baseline","Measured"))))`,
        'general',
      ],
      [
        'evRaw',
        'Progress, uncapped',
        () =>
          `IF(${at('evReason')}="Measured",IF(${in_('direction')}="higher",${in_('after')}-${in_('before')},${in_('before')}-${in_('after')})/ABS(${in_('target')}-${in_('before')}),"")`,
        'pct',
      ],
      [
        'progress',
        'KPI progress (0–100%)',
        () => `IF(${at('evReason')}="Measured",MIN(1,MAX(0,${at('evRaw')})),"")`,
        'pct',
      ],
      [
        'evNpv',
        'Evidence-adjusted NPV ($)',
        () =>
          `IF(${at('evReason')}="Measured",${at('npv')}-(1-${at('progress')})*${at('pvB')},"Uses forecast")`,
        'money',
      ],
      [null, 'Health'],
      [
        'lAdoption',
        'Adoption level (0 ok, 1 watch, 2 red)',
        () =>
          `IF(AND(${in_('age')}>=6,${in_('adoption')}<0.2),2,IF(AND(${in_('age')}>=3,${in_('adoption')}<0.4),1,0))`,
        'int',
      ],
      [
        'lPipeline',
        'Data pipeline level',
        () => `IF(${in_('pipeline')}<0.95,2,IF(${in_('pipeline')}<0.98,1,0))`,
        'int',
      ],
      [
        'lSponsor',
        'Sponsor level',
        () => `IF(${in_('sponsor')}="Missing",2,IF(${in_('sponsor')}="Limited",1,0))`,
        'int',
      ],
      [
        'lAccuracy',
        'Accuracy level',
        () => `IF(AND(${in_('accuracy')}<${in_('accuracyTarget')},${in_('trend')}<=0),1,0)`,
        'int',
      ],
      [
        'lTeam',
        'Team staffing level',
        () => `IF(${at('planned')}="Yes",IF(${at('staffed')}<0.5,2,IF(${at('staffed')}<1,1,0)),0)`,
        'int',
      ],
      [
        'lCompute',
        'Compute vs budget level',
        () => `IF(${in_('computeBudget')}>0,IF(${at('overrun')}>0.25,2,IF(${at('overrun')}>0.1,1,0)),0)`,
        'int',
      ],
      ['reds', 'Red signals', () => `COUNTIF(${at('lAdoption')}:${at('lCompute')},2)`, 'int'],
      ['yellows', 'Yellow signals', () => `COUNTIF(${at('lAdoption')}:${at('lCompute')},1)`, 'int'],
      [
        'health',
        'Health',
        () =>
          `IF(${in_('stage')}="Idea","Not launched",IF(${at('reds')}>=2,"Escalate",IF(OR(${at('reds')}>=1,${at('yellows')}>=2),"Investigate",IF(${at('yellows')}=1,"Monitor","Healthy"))))`,
        'general',
      ],
      [null, 'Decision'],
      [
        'recommendation',
        'Recommendation',
        () =>
          `IF(${in_('stage')}="Idea",IF(${at('npv')}<=0,"Rework","Validate"),IF(OR(${at('health')}="Escalate",${at('health')}="Investigate",${in_('baseline')}<>"Verified",${at('compliance')}="Blocked"),"Intervene",IF(${at('npv')}<=0,"Rework",IF(AND(${in_('stage')}="Production",${in_('adoption')}>=0.8),"Scale","Continue"))))`,
        'general',
      ],
      [
        'cautions',
        'Cautions',
        () =>
          `TRIM(IF(AND(${at('npv')}>0,${at('rnpv')}<=0),"Positive NPV, but negative once the chance of failure is priced in. ","")&IF(AND(${at('npv')}>0,${at('evReason')}="Measured",N(${at('evNpv')})<=0),"Measured results do not yet support a positive NPV.",""))`,
        'general',
      ],
    ];
    // Assign addresses, then write formulas.
    let r = top;
    rows.forEach(([key]) => {
      if (key) A[key] = cell(r, 1, true);
      r++;
    });
    r = top;
    rows.forEach(([key, label, f, fmt, kind]) => {
      if (!key) sh.set(r, 0, label, st.sub);
      else {
        sh.set(r, 0, label);
        sh.set(r, 1, { f: f() }, kind === 'link' ? st.link(fmt) : st.calc(fmt));
      }
      r++;
    });

    // Monthly table
    headerRow(
      sh,
      top,
      M.m,
      Object.keys(M).map(k => monthHeaders[k]),
    );
    for (let m = 0; m <= MONTHS; m++) {
      const row = m0 + m,
        c = k => cell(row, M[k]),
        prev = k => cell(row - 1, M[k]),
        set = (k, v, fmt = 'money') => sh.set(row, M[k], v, st.calc(fmt));
      set('m', m, 'int');
      set('m1', { f: `${c('m')}+1` }, 'int');
      if (m === 0) {
        [
          'yr',
          'inH',
          'active',
          'ramp',
          'usage',
          'building',
          'benefit',
          'team',
          'shared',
          'fixed',
          'variable',
          'cost',
          'overrun',
          'loss',
          'change',
        ].forEach(k => set(k, 0, k === 'yr' || k === 'inH' || k === 'change' ? 'int' : 'money'));
        set('net', { f: `-${at('cap')}` });
        set('d', 1, 'factor');
        set('pv', { f: `${c('net')}*${c('d')}` });
        set('cum', { f: c('net') });
        set('pvcum', { f: c('pv') });
        set('sign', { f: `SIGN(${c('net')})` }, 'int');
        continue;
      }
      set('yr', { f: `INT((${c('m')}-1)/12)` }, 'int');
      set('inH', { f: `IF(${c('m')}<=HorizonMonths,1,0)` }, 'int');
      set('active', { f: `${c('m')}-${at('effDelay')}-ExtraDelay` }, 'months');
      set('ramp', { f: `IF(${c('active')}<=0,0,MIN(${c('active')}/${at('effRamp')},1))` }, 'pct');
      set('usage', { f: `${in_('adoption')}*${c('ramp')}*(1+${in_('growth')})^${c('yr')}` }, 'pct');
      set('benefit', { f: `${at('gross')}/12*${c('usage')}*${c('inH')}` });
      set('building', { f: `MIN(1,MAX(0,${at('fullAt')}-(${c('m')}-1)))` }, 'pct');
      set('team', {
        f: `IF(TeamCostOn="Yes",(${c('building')}*${at('buildCost')}+(1-${c('building')})*${at('runCost')})/12*CostFactor,0)*${c('inH')}`,
      });
      set('shared', { f: `IF(SharedCostOn="Yes",${at('share')}/12*CostFactor,0)*${c('inH')}` });
      set('fixed', {
        f: `${at('op')}/12*(1+${in_('costGrowth')})^${c('yr')}*${c('inH')}+${c('team')}+${c('shared')}`,
      });
      set('variable', { f: `${in_('unitCost')}*${in_('volume')}/12*${c('usage')}*CostFactor*${c('inH')}` });
      set('cost', { f: `${c('fixed')}+${c('variable')}` });
      set('net', { f: `${c('benefit')}-${c('cost')}` });
      set('d', { f: `(1+Rate)^(-${c('m')}/12)` }, 'factor');
      set('pv', { f: `${c('net')}*${c('d')}` });
      set('cum', { f: `${prev('cum')}+${c('net')}` });
      set('pvcum', { f: `${prev('pvcum')}+${c('pv')}` });
      set('overrun', {
        f: `IF(${in_('computeBudget')}>0,MAX(0,${in_('compute')}-${in_('computeBudget')})/12*(1+${in_('costGrowth')})^${c('yr')}*CostFactor*${c('d')}*${c('inH')},0)`,
      });
      set('loss', { f: `${c('cost')}*${c('d')}*${c('building')}` });
      set('sign', { f: `IF(${c('net')}=0,${prev('sign')},SIGN(${c('net')}))` }, 'int');
      set(
        'change',
        { f: `IF(AND(${c('net')}<>0,${prev('sign')}<>0,SIGN(${c('net')})<>${prev('sign')}),1,0)` },
        'int',
      );
    }
    R.push(Object.fromEntries(Object.entries(A).map(([k, v]) => [k, sheetRef(name, v)])));
    R[i].monthly = k => sheetRef(name, colRange(k));
    R[i].monthCell = (k, m) => sheetRef(name, cell(m0 + m, M[k], true));
  });

  // ---------------- Portfolio ----------------
  const inc = i => `(${P(i, 'include')}="Yes")`,
    sumInc = k => (projects.length ? projects.map((p, i) => `${R[i][k]}*${inc(i)}`).join('+') : '0');
  sheetTitle(
    portfolio,
    0,
    'Portfolio',
    'Included projects only. Monthly flows are summed before IRR and payback.',
  );
  portfolio.width(0, 38);
  portfolio.width(1, 16);
  for (let c = 2; c < 24; c++) portfolio.width(c, 13);
  const Q = {},
    pRows = [
      [null, 'Value'],
      ['count', 'Projects included', () => `COUNTIF(${projRange('include')},"Yes")`, 'int'],
      ['npv', 'NPV ($)', () => sumInc('npv'), 'money'],
      ['rnpv', 'Risk-adjusted NPV ($)', () => sumInc('rnpv'), 'money'],
      [
        'evNpv',
        'Evidence-adjusted NPV ($)',
        () =>
          projects.length
            ? projects
                .map((p, i) => `IF(ISNUMBER(${R[i].evNpv}),${R[i].evNpv},${R[i].npv})*${inc(i)}`)
                .join('+')
            : '0',
        'money',
      ],
      ['cap', 'Initial capital ($)', () => sumInc('cap'), 'money'],
      ['funding', 'Year-1 funding request ($)', () => sumInc('funding'), 'money'],
      ['benefit', 'Total estimated benefits ($)', () => sumInc('totalBenefits'), 'money'],
      ['cost', 'Total cost of ownership ($)', () => sumInc('totalCosts'), 'money'],
      [
        'roi',
        'ROI (total cost basis)',
        () => `IF(${Q.cost}>0,(${Q.benefit}-${Q.cost})/${Q.cost},"N/A")`,
        'pct',
      ],
      [
        'lastNeg',
        'Last month in deficit + 1 (helper)',
        () => `_xlfn.MAXIFS(${pCol('m1')},${pCol('cum')},"<0",${pCol('m')},"<="&HorizonMonths)`,
        'int',
      ],
      [
        'payback',
        'Payback (months)',
        () =>
          `IF(${Q.count}=0,"No projects",IF(${Q.lastNeg}=0,0,IF(${Q.lastNeg}-1>=HorizonMonths,"Beyond horizon",${Q.lastNeg}-1-INDEX(${pCol('cum')},${Q.lastNeg})/INDEX(${pCol('net')},${Q.lastNeg}+1))))`,
        'months',
      ],
      [
        'paybackYears',
        'Payback (years)',
        () => `IF(ISNUMBER(${Q.payback}),${Q.payback}/12,${Q.payback})`,
        'num2',
      ],
      ['signChanges', 'Cash-flow sign changes', () => `SUM(${pCol('change')})`, 'int'],
      [
        'irr',
        'IRR (annualized)',
        () =>
          `IF(AND(COUNTIF(${pCol('net')},">0")>0,COUNTIF(${pCol('net')},"<0")>0,${Q.signChanges}=1),IF(ISNUMBER(${irrOf(pCol('net'))}),(1+${irrOf(pCol('net'))})^12-1,"N/A"),"N/A")`,
        'pct',
      ],
      [null, 'What has to be true (one driver at a time)'],
      ['pvB', 'PV of estimated benefits ($)', () => sumInc('pvB'), 'money'],
      [
        'pvC',
        'PV of all costs incl. initial capital ($)',
        () =>
          projects.length
            ? projects.map((p, i) => `(${R[i].cap}+${R[i].pvF}+${R[i].pvV})*${inc(i)}`).join('+')
            : '0',
        'money',
      ],
      [
        'beBenefits',
        'Estimated benefits must reach (× estimate)',
        () => `IF(${Q.pvB}>0,${Q.pvC}/${Q.pvB},"N/A")`,
        'pct',
      ],
      ['beHeadroom', 'Costs can rise by', () => `IF(${Q.pvC}>0,${Q.pvB}/${Q.pvC}-1,"N/A")`, 'pct'],
      [
        'intervene',
        'Projects needing intervention',
        () =>
          projects.length
            ? projects.map((p, i) => `(${R[i].recommendation}="Intervene")*${inc(i)}`).join('+')
            : '0',
        'int',
      ],
    ];
  // Monthly portfolio table on the right
  const PM = { m: 14, m1: 15, benefit: 16, cost: 17, net: 18, d: 19, pv: 20, cum: 21, sign: 22, change: 23 },
    pTop = 3,
    pm0 = pTop + 1,
    pCol = k => `${cell(pm0, PM[k], true)}:${cell(pm0 + MONTHS, PM[k], true)}`;
  let qr = pTop;
  pRows.forEach(([k]) => {
    if (k) Q[k] = cell(qr, 1, true);
    qr++;
  });
  qr = pTop;
  pRows.forEach(([k, label, f, fmt]) => {
    if (!k) portfolio.set(qr, 0, label, st.sub);
    else {
      portfolio.set(qr, 0, label, ['npv', 'rnpv', 'payback', 'irr'].includes(k) ? st.bold : st.label);
      portfolio.set(qr, 1, { f: f() }, ['npv', 'rnpv', 'payback'].includes(k) ? st.total(fmt) : st.calc(fmt));
    }
    qr++;
  });
  headerRow(portfolio, pTop, PM.m, [
    'Month',
    'Month + 1',
    'Benefits ($)',
    'Costs ($)',
    'Net cash ($)',
    'Discount factor',
    'PV ($)',
    'Cumulative ($)',
    'Last sign',
    'Sign change',
  ]);
  for (let m = 0; m <= MONTHS; m++) {
    const row = pm0 + m,
      c = k => cell(row, PM[k]),
      prev = k => cell(row - 1, PM[k]),
      sum = k =>
        projects.length ? projects.map((p, i) => `${R[i].monthCell(k, m)}*${inc(i)}`).join('+') : '0';
    portfolio.set(row, PM.m, m, st.calc('int'));
    portfolio.set(row, PM.m1, { f: `${c('m')}+1` }, st.calc('int'));
    portfolio.set(row, PM.benefit, m ? { f: sum('benefit') } : 0, st.calc('money'));
    portfolio.set(row, PM.cost, m ? { f: sum('cost') } : { f: sumInc('cap') }, st.calc('money'));
    portfolio.set(row, PM.net, { f: sum('net') }, st.calc('money'));
    portfolio.set(row, PM.d, m ? { f: `(1+Rate)^(-${c('m')}/12)` } : 1, st.calc('factor'));
    portfolio.set(row, PM.pv, { f: `${c('net')}*${c('d')}` }, st.calc('money'));
    portfolio.set(row, PM.cum, m ? { f: `${prev('cum')}+${c('net')}` } : { f: c('net') }, st.calc('money'));
    portfolio.set(
      row,
      PM.sign,
      m ? { f: `IF(${c('net')}=0,${prev('sign')},SIGN(${c('net')}))` } : { f: `SIGN(${c('net')})` },
      st.calc('int'),
    );
    portfolio.set(
      row,
      PM.change,
      m ? { f: `IF(AND(${c('net')}<>0,${prev('sign')}<>0,SIGN(${c('net')})<>${prev('sign')}),1,0)` } : 0,
      st.calc('int'),
    );
  }
  portfolio.freeze = { row: pTop + 1 };
  // Funding plan by year
  const fTop = pTop + pRows.length + 2,
    yrs = 10,
    yearCond = (y, k) => {
      const lo = (y - 1) * 12 + 1,
        hi = y * 12;
      return `IF(${y}<=Years,SUMIFS(${pCol(k)},${pCol('m')},">=${lo}",${pCol('m')},"<=${hi}"),"")`;
    };
  portfolio.set(fTop - 1, 0, 'Funding plan (undiscounted)', st.sub);
  headerRow(portfolio, fTop, 0, ['', 'Total']);
  const fRows = [
    ['One-time (build, data, training)', y => (y === 1 ? `${Q.cap}` : `IF(${y}<=Years,0,"")`), () => Q.cap],
    ['Running costs', y => yearCond(y, 'cost'), () => `SUM(${pCol('cost')})-${pCol('cost').split(':')[0]}`],
    [
      'Total spend',
      y => `IF(${y}<=Years,${cell(fTop + 1, 1 + y)}+${cell(fTop + 2, 1 + y)},"")`,
      () => `${cell(fTop + 1, 1)}+${cell(fTop + 2, 1)}`,
    ],
    ['Estimated benefits', y => yearCond(y, 'benefit'), () => `SUM(${pCol('benefit')})`],
  ];
  for (let y = 1; y <= yrs; y++)
    portfolio.set(fTop, 1 + y, { f: `IF(${y}<=Years,"Year ${y}","")` }, st.header);
  fRows.forEach(([label, fy, ft], k) => {
    const r = fTop + 1 + k,
      bold = label === 'Total spend';
    portfolio.set(r, 0, label, bold ? st.bold : st.label);
    portfolio.set(r, 1, { f: ft() }, bold ? st.total('money') : st.calc('money'));
    for (let y = 1; y <= yrs; y++)
      portfolio.set(r, 1 + y, { f: fy(y) }, bold ? st.total('money') : st.calc('money'));
  });

  // ---------------- Overview ----------------
  sheetTitle(
    overview,
    0,
    'AI Capital: portfolio overview',
    `Exported ${exportedAt.toISOString().slice(0, 16).replace('T', ' ')} UTC. Illustrative forecasts in USD, before tax. Every figure below is a live formula.`,
  );
  overview.width(0, 32);
  for (let c = 1; c < 20; c++) overview.width(c, 16);
  const cards = [
    ['Portfolio NPV', Q.npv, 'money'],
    ['Risk-adjusted NPV', Q.rnpv, 'money'],
    ['Evidence-adjusted NPV', Q.evNpv, 'money'],
    ['Payback (months)', Q.payback, 'months'],
    ['ROI (total costs)', Q.roi, 'pct'],
    ['Portfolio IRR', Q.irr, 'pct'],
    ['Initial capital', Q.cap, 'money'],
    ['Year-1 funding request', Q.funding, 'money'],
  ];
  cards.forEach(([label, ref, fmt], k) => {
    overview.set(3, k + 1, label, st.header);
    overview.height(3, 30);
    overview.set(4, k + 1, { f: sheetRef('Portfolio', ref) }, st.total(fmt));
  });
  overview.set(4, 0, 'Portfolio (included projects)', st.bold);
  overview.set(
    5,
    0,
    {
      f: `"Scenario: "&Scenario&" · "&TEXT(Rate,"0.0%")&" hurdle · "&Years&" years · team cost "&TeamCostOn&" · shared IT "&SharedCostOn`,
    },
    st.muted,
  );
  const oCols = [
    ['Automation', i => P(i, 'name'), 'general', 'link'],
    ['Department', i => P(i, 'team'), 'general', 'link'],
    ['Stage', i => P(i, 'stage'), 'general', 'link'],
    ['In portfolio', i => P(i, 'include'), 'general', 'link'],
    ['Initial capital ($)', i => R[i].cap, 'money'],
    ['NPV ($)', i => R[i].npv, 'money'],
    ['Risk-adjusted NPV ($)', i => R[i].rnpv, 'money'],
    ['Evidence-adj. NPV ($)', i => R[i].evNpv, 'money'],
    ['Payback (months)', i => R[i].payback, 'months'],
    ['ROI', i => R[i].roi, 'pct'],
    ['IRR', i => R[i].irr, 'pct'],
    ['Year-1 funding ($)', i => R[i].funding, 'money'],
    ['Probability', i => R[i].probability, 'pct'],
    ['Health', i => R[i].health, 'general'],
    ['Readiness', i => R[i].readiness, 'general'],
    ['Compliance', i => R[i].compliance, 'general'],
    ['Recommendation', i => R[i].recommendation, 'general'],
    ['Cautions', i => R[i].cautions, 'general'],
  ];
  overview.set(7, 0, 'Projects', st.sub);
  headerRow(
    overview,
    8,
    0,
    oCols.map(c => c[0]),
  );
  overview.width(oCols.length - 1, 50);
  projects.forEach((p, i) =>
    oCols.forEach(([, f, fmt, kind], c) =>
      overview.set(9 + i, c, { f: f(i) }, kind === 'link' ? st.link(fmt) : st.calc(fmt)),
    ),
  );
  const oEnd = 9 + projects.length + 1;
  overview.set(oEnd, 0, 'Decision brief', st.sub);
  overview.set(
    oEnd + 1,
    0,
    {
      f: projects.length
        ? `${sheetRef('Portfolio', Q.intervene)}&" included initiative(s) need evidence or health intervention before additional capital is committed. Recommendations are rule based and require executive review."`
        : '"No automations exported."',
    },
    st.muted,
  );
  overview.freeze = { row: 9, col: 1 };

  // ---------------- Health ----------------
  sheetTitle(
    healthSheet,
    0,
    'Evidence & health',
    'Signal levels: 0 ok, 1 watch, 2 red. Two reds escalate; one red or two yellows investigate; one yellow monitors.',
  );
  healthSheet.width(0, 30);
  for (let c = 1; c < 24; c++) healthSheet.width(c, 13);
  const hCols = [
    ['Automation', i => P(i, 'name'), 'general', 'link'],
    ['Health', i => R[i].health],
    ['Adoption', i => R[i].lAdoption, 'int'],
    ['Data pipeline', i => R[i].lPipeline, 'int'],
    ['Sponsor', i => R[i].lSponsor, 'int'],
    ['Accuracy', i => R[i].lAccuracy, 'int'],
    ['Team staffing', i => R[i].lTeam, 'int'],
    ['Compute vs budget', i => R[i].lCompute, 'int'],
    ['Overrun', i => R[i].overrun, 'pct'],
    ['Overrun cost, PV ($)', i => R[i].overrunPv, 'money'],
    ['Readiness', i => R[i].readiness],
    ['Team capacity risk', i => R[i].rTeam],
    ['Compliance', i => R[i].compliance],
    ['Missing approvals', i => R[i].missingText],
    ['Probability', i => R[i].probability, 'pct'],
    ['Stage start', i => R[i].probBase, 'pct'],
    ['Override', i => R[i].overridden],
    ['Evidence status', i => R[i].evReason],
    ['KPI progress', i => R[i].progress, 'pct'],
    ['Evidence-adj. NPV ($)', i => R[i].evNpv, 'money'],
    ['Staffing', i => R[i].coverage, 'pct'],
    ['Months to full benefit', i => R[i].fullAt, 'months'],
    ['Team cost, horizon ($)', i => R[i].teamTotal, 'money'],
    ['Shared IT ($/yr)', i => R[i].sharedAnnual, 'money'],
  ];
  headerRow(
    healthSheet,
    3,
    0,
    hCols.map(c => c[0]),
  );
  projects.forEach((p, i) =>
    hCols.forEach(([, f, fmt = 'general', kind], c) =>
      healthSheet.set(4 + i, c, { f: f(i) }, kind === 'link' ? st.link(fmt) : st.calc(fmt)),
    ),
  );
  healthSheet.freeze = { row: 4, col: 1 };

  // ---------------- Scenarios ----------------
  sheetTitle(
    scen,
    0,
    'Scenarios and sensitivity',
    'Live: change Settings → Scenario, multipliers or rate and every sheet recalculates. Grids below are exact because NPV is linear in benefits and costs.',
  );
  scen.width(0, 36);
  for (let c = 1; c < 8; c++) scen.width(c, 14);
  const benefitSteps = [0.6, 0.8, 1, 1.2, 1.4],
    costSteps = [0.8, 0.9, 1, 1.1, 1.2],
    gTop = 4;
  scen.set(gTop - 1, 0, 'Portfolio NPV: estimated benefits (rows) × costs (columns)', st.sub);
  scen.set(gTop, 0, 'Benefits ↓ / Costs →', st.header);
  costSteps.forEach((c, k) => scen.set(gTop, 1 + k, c, { font: 'header', fill: 'header', fmt: 'pct' }));
  benefitSteps.forEach((b, j) => {
    const r = gTop + 1 + j;
    scen.set(r, 0, b, { font: 'bold', fmt: 'pct' });
    costSteps.forEach((c, k) =>
      scen.set(
        r,
        1 + k,
        {
          f: `${sheetRef('Portfolio', Q.pvB)}*${cell(r, 0, true)}/BenefitFactor-${sheetRef('Portfolio', Q.pvC)}*${cell(gTop, 1 + k, true)}/CostFactor`,
        },
        st.calc('money'),
      ),
    );
  });
  const rTop = gTop + benefitSteps.length + 3;
  scen.set(rTop - 1, 0, 'One assumption at a time (portfolio NPV)', st.sub);
  headerRow(scen, rTop, 0, ['Driver', 'Lower', 'Current', 'Higher', 'Lower value', 'Higher value']);
  const npvAtRate = rate =>
    `SUMPRODUCT(${sheetRef('Portfolio', pCol('net'))},(1+${rate})^(-${sheetRef('Portfolio', pCol('m'))}/12))`;
  const oneAtATime = [
    [
      'Estimated benefits ×',
      `${sheetRef('Portfolio', Q.pvB)}*0.8/BenefitFactor-${sheetRef('Portfolio', Q.pvC)}`,
      `${sheetRef('Portfolio', Q.pvB)}*1.2/BenefitFactor-${sheetRef('Portfolio', Q.pvC)}`,
      0.8,
      1.2,
      'pct',
    ],
    [
      'Costs ×',
      `${sheetRef('Portfolio', Q.pvB)}-${sheetRef('Portfolio', Q.pvC)}*0.8/CostFactor`,
      `${sheetRef('Portfolio', Q.pvB)}-${sheetRef('Portfolio', Q.pvC)}*1.2/CostFactor`,
      0.8,
      1.2,
      'pct',
    ],
    [
      'Hurdle rate',
      npvAtRate('MAX(0,Rate-0.03)'),
      npvAtRate('(Rate+0.03)'),
      { f: 'MAX(0,Rate-0.03)' },
      { f: 'Rate+0.03' },
      'pct',
    ],
  ];
  oneAtATime.forEach(([label, lo, hi, loV, hiV, fmt], k) => {
    const r = rTop + 1 + k;
    scen.set(r, 0, label);
    scen.set(r, 1, { f: lo }, st.calc('money'));
    scen.set(r, 2, { f: sheetRef('Portfolio', Q.npv) }, st.link('money'));
    scen.set(r, 3, { f: hi }, st.calc('money'));
    scen.set(r, 4, loV, st.calc(fmt));
    scen.set(r, 5, hiV, st.calc(fmt));
  });
  // Snapshot of delay-dependent comparisons (rollout delay changes the cash schedule itself).
  const snapTop = rTop + oneAtATime.length + 3,
    agg = settingsOverride => aggregate(projects, state.excluded, { ...s, ...settingsOverride }),
    num = v => (v === null || !Number.isFinite(v) ? 'N/A' : v);
  scen.set(snapTop - 1, 0, 'Snapshot at export (static): scenario presets and rollout delay', st.sub);
  scen.set(
    snapTop,
    0,
    'Delay changes the cash schedule, so these are values from the app at export. To see one live, set it on the Settings sheet.',
    st.muted,
  );
  headerRow(scen, snapTop + 1, 0, ['Case', 'NPV ($)', 'Payback (months)', 'ROI', 'IRR']);
  const snapCases = [
    ...Object.entries(scenarioPresets).map(([k, v]) => [`${k[0].toUpperCase() + k.slice(1)} scenario`, v]),
    [`Delay ${Math.max(0, s.delay - 3)} months`, { delay: Math.max(0, s.delay - 3) }],
    [`Delay ${s.delay + 3} months`, { delay: s.delay + 3 }],
  ];
  snapCases.forEach(([label, override], k) => {
    const a = agg(override),
      r = snapTop + 2 + k;
    scen.set(r, 0, label);
    scen.set(r, 1, num(a.npv), st.calc('money'));
    scen.set(r, 2, a.payback === null ? 'Beyond horizon' : num(a.payback), st.calc('months'));
    scen.set(r, 3, num(a.cost ? (a.benefit - a.cost) / a.cost : null), st.calc('pct'));
    scen.set(r, 4, num(a.irr), st.calc('pct'));
  });

  // ---------------- Read me ----------------
  readme.width(0, 110);
  const lines = [
    ['AI Capital: live portfolio workbook', st.title],
    [
      `Exported from the AI Capital workspace on ${exportedAt.toISOString().slice(0, 16).replace('T', ' ')} UTC. ${projects.length} automations, ${state.excluded.length} excluded from portfolio totals.`,
      st.muted,
    ],
    ['', {}],
    ['How it works', st.sub],
    [
      'Every result is a formula. Change any blue input and the whole workbook recalculates, exactly as the app does.',
      {},
    ],
    [
      'Settings: hurdle rate, horizon, scenario, cost switches and the probability-of-success policy (yellow cells are the key levers).',
      {},
    ],
    [
      'Projects: every input for every automation, one row each. Percentages are stored as fractions (75% = 0.75).',
      {},
    ],
    [
      'Team: headcount and loaded cost per role. Assignments live on the Projects sheet and drive staffing, delivery time and team cost.',
      {},
    ],
    [
      'Shared IT: categories, annual cost and allocation basis; the split by project and by department follows automatically.',
      {},
    ],
    [
      'P1, P2 …: one sheet per automation with its monthly cash schedule (120 months; months beyond the horizon are zeroed) and every derived figure.',
      {},
    ],
    ['Portfolio, Overview, Health and Scenarios summarise the included projects.', {}],
    ['', {}],
    ['Colour code', st.sub],
    ['Blue text: inputs you can change.', { font: 'input' }],
    ['Yellow fill: key levers.', { font: 'input', fill: 'key' }],
    ['Green text: links to another sheet.', { font: 'link' }],
    ['Black text: formulas.', {}],
    ['', {}],
    ['Notes', st.sub],
    [
      'Add or remove automations in the app and export again: each automation needs its own calculation sheet.',
      {},
    ],
    [
      'Scenario comparison and rollout-delay rows on the Scenarios sheet are a snapshot at export, because delay changes the cash schedule. Everything else is live.',
      {},
    ],
    [
      'Capacity hours are an economic proxy, not cash, and are off by default. Projects are assumed independent; check overlap before approval.',
      {},
    ],
    ['Methodology and formulas are described on the Methodology page of the app.', {}],
  ];
  lines.forEach(([text, style], k) => readme.set(k, 0, text, style));

  // Result cell addresses, for verification against the app model.
  wb.refs = {
    projects: R.map(r => Object.fromEntries(Object.entries(r).filter(([, v]) => typeof v === 'string'))),
    portfolio: Object.fromEntries(Object.entries(Q).map(([k, v]) => [k, sheetRef('Portfolio', v)])),
    inputs: {
      settings: Object.fromEntries(Object.entries(S).map(([k, v]) => [k, sheetRef('Settings', v)])),
      projects: projects.map((p, i) => Object.fromEntries(cols.map(([k]) => [k, P(i, k)]))),
      team: Object.fromEntries(
        team.map((r, i) => [
          r.id,
          { headcount: sheetRef('Team', cell(4 + i, 1, true)), cost: sheetRef('Team', cell(4 + i, 2, true)) },
        ]),
      ),
      shared: Object.fromEntries(
        shared.map((c, j) => [
          c.id,
          {
            cost: sheetRef('Shared IT', cell(catRow(j), 1, true)),
            basis: sheetRef('Shared IT', cell(catRow(j), 2, true)),
          },
        ]),
      ),
    },
  };
  return wb;
}

// Bytes of the .xlsx file for a state.
export async function exportWorkbook(state, exportedAt) {
  return buildWorkbook(state, exportedAt).toBytes();
}
