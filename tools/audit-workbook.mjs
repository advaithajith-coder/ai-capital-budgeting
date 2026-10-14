// Audits an AI Capital workbook (exported, or edited and saved in Excel). Excel reads the file,
// the inputs it contains are turned back into an app state, a fresh export of that state is read
// by Excel too, and every formula and input is compared. Results are then compared with the app
// model. The audited file is never modified. Requires Windows with Excel.
// Run: node tools/audit-workbook.mjs path/to/workbook.xlsx
import { readFileSync, writeFileSync, mkdtempSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { buildWorkbook, projectColumns } from '../dist/excel.js';
import { defaults, projectDefaults, sharedDrivers } from '../dist/model.js';
import { scenarioPresets } from '../dist/portfolio.js';
import { col } from '../dist/xlsx.js';
import { expected, split } from './excel-check.mjs';

if (process.platform !== 'win32') {
  console.log('This audit needs Windows with Microsoft Excel installed.');
  process.exit(2);
}
const file = resolve(process.argv[2] || ''),
  dir = mkdtempSync(join(tmpdir(), 'ai-capital-audit-'));

// Excel dump: every sheet's formulas and calculated values, defined names and error cells.
function dump(path) {
  const out = join(dir, `dump-${Math.random().toString(36).slice(2)}.json`);
  execFileSync(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      `$ErrorActionPreference='Stop'
$x = New-Object -ComObject Excel.Application; $x.Visible=$false; $x.DisplayAlerts=$false
try {
  $wb = $x.Workbooks.Open('${path}', 0, $true); $x.CalculateFull()
  $sheets = [ordered]@{}; $errors = @()
  foreach ($ws in $wb.Worksheets) {
    $ur = $ws.UsedRange; $allF = $ur.Formula; $allV = $ur.Value2; $rows = $ur.Rows.Count; $cols = $ur.Columns.Count
    $cells = New-Object System.Collections.ArrayList
    for ($i = 1; $i -le $rows; $i++) { for ($j = 1; $j -le $cols; $j++) {
      if ($rows -eq 1 -and $cols -eq 1) { $cf = $allF; $cv = $allV } else { $cf = $allF[$i,$j]; $cv = $allV[$i,$j] }
      if ($cf -ne $null -and $cf -ne '') { [void]$cells.Add(@(($ur.Row + $i - 1), ($ur.Column + $j - 1), [string]$cf, $cv)) }
    } }
    $sheets[$ws.Name] = $cells
    try { foreach ($e in $ur.SpecialCells(-4123, 16)) { $errors += $ws.Name + '!' + $e.Address(0,0) + ' ' + $e.Text } } catch {}
  }
  $names = [ordered]@{}; foreach ($n in $wb.Names) { $names[$n.Name] = [string]$n.RefersTo }
  [pscustomobject]@{ sheets = $sheets; names = $names; errors = $errors } | ConvertTo-Json -Depth 6 -Compress | Set-Content -Encoding UTF8 '${out}'
  $wb.Close($false)
} finally { $x.Quit() }`,
    ],
    { stdio: 'inherit', timeout: 600000 },
  );
  const raw = JSON.parse(readFileSync(out, 'utf8').replace(/^\uFEFF/, '')),
    sheets = {};
  for (const [name, cells] of Object.entries(raw.sheets)) {
    sheets[name] = {};
    for (const [r, c, f, v] of cells || [])
      sheets[name][`${col(c - 1)}${r}`] = f.startsWith('=') ? { f: f.slice(1), v } : { v };
  }
  return { sheets, names: raw.names || {}, errors: raw.errors || [] };
}

// Turn the workbook's inputs back into an app state.
function stateFrom(book) {
  const at = (sheet, ref) => book.sheets[sheet]?.[ref.replace(/\$/g, '')]?.v,
    named = n => {
      const [sheet, ref] = split(String(book.names[n]).replace(/^=/, ''));
      return at(sheet, ref);
    },
    scenario = String(named('Scenario')).toLowerCase(),
    s = structuredClone(defaults);
  Object.assign(s, {
    rate: named('Rate') * 100,
    years: +named('Years'),
    capacity: named('CapacityOn') === 'Yes',
    teamCost: named('TeamCostOn') === 'Yes',
    sharedCost: named('SharedCostOn') === 'Yes',
    probIdea: named('ProbIdea') * 100,
    probPilot: named('ProbPilot') * 100,
    probProduction: named('ProbProduction') * 100,
    riskHigh: named('RiskHigh'),
    riskMedium: named('RiskMedium'),
    approvalFactor: named('ApprovalFactor'),
    sponsorLimited: named('SponsorLimited'),
    sponsorMissing: named('SponsorMissing'),
    probFloor: named('ProbFloor') * 100,
  });
  if (scenarioPresets[scenario]) Object.assign(s, scenarioPresets[scenario]);
  else
    Object.assign(s, {
      benefitFactor: named('CustomBenefit') * 100,
      costFactor: named('CustomCost') * 100,
      delay: named('CustomDelay'),
    });
  s.team = [];
  for (let r = 5; at('Team', `A${r}`) && at('Team', `A${r}`) !== 'Total'; r++) {
    const name = at('Team', `A${r}`),
      known = defaults.team.find(t => t.name === name);
    s.team.push({
      id: known?.id || name.toLowerCase().replace(/\W+/g, ''),
      name,
      headcount: at('Team', `B${r}`),
      cost: at('Team', `C${r}`),
    });
  }
  s.shared = [];
  for (let r = 5; at('Shared IT', `A${r}`); r++) {
    const name = at('Shared IT', `A${r}`),
      label = at('Shared IT', `C${r}`),
      known = defaults.shared.find(c => c.name === name);
    s.shared.push({
      id: known?.id || 'c' + r,
      name,
      cost: at('Shared IT', `B${r}`),
      driver: Object.entries(sharedDrivers).find(([, d]) => d.label === label)?.[0] || 'equal',
    });
  }
  const cols = projectColumns(s.team),
    header = Object.entries(book.sheets.Projects).filter(([ref]) => /^[A-Z]+4$/.test(ref)),
    keyOfCol = Object.fromEntries(
      header.map(([ref, c]) => [ref.replace(/\d+/, ''), cols.find(x => x[1] === c.v)?.[0]]),
    ),
    pct = [
      'costGrowth',
      'indirectCash',
      'growth',
      'realization',
      'adoption',
      'pipeline',
      'accuracy',
      'accuracyTarget',
      'probOverride',
    ],
    text = [
      'id',
      'name',
      'team',
      'owner',
      'volumeUnit',
      'kpi',
      'unit',
      'probReason',
      'description',
      'evidence',
    ],
    projects = [],
    excluded = [];
  for (let r = 5; at('Projects', `A${r}`) !== undefined && at('Projects', `A${r}`) !== ''; r++) {
    const p = structuredClone(projectDefaults);
    for (const [letter, key] of Object.entries(keyOfCol)) {
      if (!key) continue;
      const v = at('Projects', `${letter}${r}`) ?? '';
      if (key.startsWith('need_')) p.need[key.slice(5)] = +v || 0;
      else if (key.startsWith('alloc_')) p.alloc[key.slice(6)] = +v || 0;
      else if (key === 'include') {
        if (v !== 'Yes') excluded.push(String(at('Projects', `A${r}`)));
      } else if (key === 'probOverrideOn') p.probOverrideOn = v === 'Yes';
      else if (pct.includes(key)) p[key] = (+v || 0) * 100;
      else p[key] = text.includes(key) ? String(v) : v;
    }
    projects.push(p);
  }
  return {
    projects,
    settings: s,
    excluded,
    scenario: scenarioPresets[scenario] ? scenario : 'custom',
    view: 'overview',
  };
}

// ---- 1. Excel reads the file ----
const copy = join(dir, 'audit.xlsx');
copyFileSync(file, copy);
const book = dump(copy),
  state = stateFrom(book),
  stamp = String(book.sheets['Read me']?.A2?.v || '').match(/(\d{4}-\d\d-\d\d \d\d:\d\d)/)?.[1],
  fresh = buildWorkbook(state, stamp ? new Date(stamp.replace(' ', 'T') + ':00Z') : new Date()),
  freshPath = join(dir, 'fresh.xlsx');
writeFileSync(freshPath, await fresh.toBytes());

// ---- 2. Excel reads a fresh export of the same inputs; compare cell by cell ----
const ref = dump(freshPath),
  findings = [],
  close = (a, b) =>
    typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b)),
  timestampCell = (sheet, r) => sheet === 'Read me' || (sheet === 'Overview' && r === 'A2');
for (const [sheet, cells] of Object.entries(ref.sheets)) {
  const mine = book.sheets[sheet];
  if (!mine) {
    findings.push(`Missing sheet: ${sheet}`);
    continue;
  }
  for (const [r, want] of Object.entries(cells)) {
    const got = mine[r] || { v: '' };
    if (want.f !== undefined) {
      if (got.f === undefined)
        findings.push(
          `${sheet}!${r}: formula replaced by a typed value (${JSON.stringify(got.v)}). Should be =${want.f}`,
        );
      else if (got.f !== want.f)
        findings.push(`${sheet}!${r}: formula differs\n      file:   =${got.f}\n      should: =${want.f}`);
    } else if (got.f !== undefined)
      findings.push(`${sheet}!${r}: formula =${got.f} where a plain value is expected`);
    else if (!(got.v === want.v || close(got.v, want.v)) && !timestampCell(sheet, r))
      findings.push(`${sheet}!${r}: ${JSON.stringify(got.v)} where ${JSON.stringify(want.v)} is expected`);
  }
  for (const r of Object.keys(mine))
    if (!cells[r])
      findings.push(
        `${sheet}!${r}: extra content ${JSON.stringify(mine[r].f ? '=' + mine[r].f : mine[r].v)}`,
      );
}
for (const sheet of Object.keys(book.sheets)) if (!ref.sheets[sheet]) findings.push(`Extra sheet: ${sheet}`);
for (const [n, v] of Object.entries(ref.names))
  if (!n.startsWith('_xlfn.') && book.names[n] !== v)
    findings.push(`Defined name ${n}: ${book.names[n]} where ${v} is expected`);

// ---- 3. results vs the app model ----
const exp = expected(state),
  wrong = [],
  check = (label, address, want, kind) => {
    const [sheet, r] = split(address),
      got = book.sheets[sheet]?.[r.replace(/\$/g, '')]?.v;
    const ok =
      kind === 'cautionsCount'
        ? (got ? String(got).split('. ').filter(Boolean).length : 0) === want
        : typeof want === 'number' && typeof got === 'number'
          ? Math.abs(got - want) <= 1e-6 * Math.max(1, Math.abs(want))
          : String(got ?? '') === String(want);
    if (!ok) wrong.push(`${label}: Excel ${JSON.stringify(got)} vs app ${JSON.stringify(want)}`);
  };
let compared = 0;
exp.projects.forEach((e, i) =>
  Object.entries(e).forEach(([k, v]) => {
    const a = fresh.refs.projects[i][k === 'cautionsCount' ? 'cautions' : k];
    if (a) compared++, check(`${state.projects[i].name} · ${k}`, a, v, k);
  }),
);
Object.entries(exp.portfolio).forEach(
  ([k, v]) =>
    fresh.refs.portfolio[k] && (compared++, check(`Portfolio · ${k}`, fresh.refs.portfolio[k], v, k)),
);

const formulas = Object.values(book.sheets).reduce(
  (v, c) => v + Object.values(c).filter(x => x.f !== undefined).length,
  0,
);
console.log(`File: ${file}`);
console.log(
  `${Object.keys(book.sheets).length} sheets, ${formulas} formulas; ${state.projects.length} projects (${state.excluded.length} excluded); scenario ${state.scenario}; ${state.settings.years} years at ${+state.settings.rate.toFixed(4)}%.`,
);
console.log(`\n1. Formula errors after Excel recalculation: ${book.errors.length}`);
book.errors.slice(0, 20).forEach(e => console.log('   - ' + e));
console.log(
  `2. Formulas and inputs vs a fresh export of the same inputs: ${findings.length ? findings.length + ' difference(s)' : 'identical'}`,
);
findings.slice(0, 40).forEach(f => console.log('   - ' + f));
if (findings.length > 40) console.log(`   … ${findings.length - 40} more`);
console.log(`3. Results vs the app model: ${compared} compared, ${wrong.length} mismatch(es)`);
wrong.slice(0, 40).forEach(w => console.log('   - ' + w));
process.exitCode = book.errors.length || findings.length || wrong.length ? 1 : 0;
