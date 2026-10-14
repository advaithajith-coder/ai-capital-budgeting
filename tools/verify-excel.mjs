// Verifies the exported workbook against the app model using real Excel (Windows + Excel required).
// Generates workbooks for several app states, lets Excel calculate them, and compares every result.
// Run: node tools/verify-excel.mjs
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { buildWorkbook } from '../dist/excel.js';
import { freshState, scenarioPresets } from '../dist/portfolio.js';
import { expected, split } from './excel-check.mjs';

const dir = mkdtempSync(join(tmpdir(), 'ai-capital-excel-'));

// App states to verify: defaults plus edge cases for every rule the workbook reproduces.
function variants() {
  const v = [];
  v.push(['default', freshState()]);
  const down = freshState();
  Object.assign(down.settings, scenarioPresets.downside);
  down.scenario = 'downside';
  v.push(['downside', down]);
  const long = freshState();
  Object.assign(long.settings, { years: 10, rate: 8, capacity: true });
  long.scenario = 'base';
  v.push(['10y-capacity-8pct', long]);
  const off = freshState();
  Object.assign(off.settings, { teamCost: false, sharedCost: false, years: 3 });
  v.push(['costs-off-3y', off]);
  const edge = freshState();
  Object.assign(edge.settings, { benefitFactor: 110, costFactor: 115, delay: 2, years: 2, rate: 15 });
  edge.scenario = 'custom';
  edge.excluded = ['demand'];
  const [vision, support, invoice, demand, maint] = edge.projects;
  Object.assign(support, {
    unitCost: 0.05,
    volume: 400000,
    sponsor: 'Limited',
    probOverrideOn: true,
    probOverride: 45,
    probReason: 'Vendor contract signed',
  });
  Object.assign(invoice, { upfront: 0, data: 0, training: 0, delay: 3, computeBudget: 15000, after: 7 });
  Object.assign(demand, {
    stage: 'Production',
    alloc: { ...demand.alloc, ops: 0 },
    dataSensitivity: 'Personal',
    legalReview: 'In progress',
  });
  Object.assign(maint, {
    aiRisk: 'High',
    sponsor: 'Missing',
    alloc: { ml: 4, data: 2, sw: 1, ops: 1 },
    after: 5,
  });
  edge.settings.team = edge.settings.team.map(r => (r.id === 'ml' ? { ...r, headcount: 10 } : r));
  edge.projects.push({
    ...structuredClone(vision),
    id: 'idea',
    name: 'Idea: contract review',
    team: 'Legal',
    stage: 'Idea',
    age: 0,
    baseline: 'Missing',
    need: { ml: 0, data: 0, sw: 0, ops: 0 },
    alloc: { ml: 0, data: 0, sw: 0, ops: 0 },
    runNeed: 0,
    dataReadiness: 'Not assessed',
    integration: 'High',
    vendorRisk: 'Medium',
    securityReview: 'Not started',
  });
  edge.settings.shared = [
    ...edge.settings.shared,
    { id: 'none', name: 'Unused category', cost: 25000, driver: 'data' },
  ];
  edge.projects.forEach(p => (p.alloc = { ...p.alloc, data: p.id === 'idea' ? 0 : p.alloc.data }));
  v.push(['edge-cases', edge]);
  const noData = freshState();
  noData.projects.forEach(p => (p.alloc = { ...p.alloc, data: 0 }));
  v.push(['unallocated-shared', noData]);
  return v;
}

const jobs = [];
for (const [name, state] of variants()) {
  const wb = buildWorkbook(state, new Date('2026-10-14T00:00:00Z')),
    file = join(dir, `${name}.xlsx`);
  writeFileSync(file, await wb.toBytes());
  const exp = expected(state),
    checks = [];
  exp.projects.forEach((e, i) =>
    Object.entries(e).forEach(([k, v]) => {
      const key = k === 'cautionsCount' ? 'cautions' : k;
      if (wb.refs.projects[i][key])
        checks.push({
          label: `${state.projects[i].id}.${k}`,
          ref: split(wb.refs.projects[i][key]),
          expect: v,
          kind: k,
        });
    }),
  );
  Object.entries(exp.portfolio).forEach(([k, v]) => {
    if (wb.refs.portfolio[k])
      checks.push({ label: `portfolio.${k}`, ref: split(wb.refs.portfolio[k]), expect: v, kind: k });
  });
  jobs.push({ name, file, checks, edits: [] });
}

// Live edit: change inputs inside Excel and compare with the app after the same edits.
{
  const base = freshState(),
    wb = buildWorkbook(base, new Date('2026-10-14T00:00:00Z')),
    file = join(dir, 'live-edit.xlsx'),
    I = wb.refs.inputs,
    edits = [
      [I.settings.Scenario, 'Downside'],
      [I.projects[4].alloc_ml, 2],
      [I.projects[1].adoption, 0.5],
      [I.shared.dataplat.basis, 'Equal per project'],
      [I.team.ml.cost, 200000],
      [I.projects[0].include, 'No'],
      [I.settings.ProbPilot, 0.5],
      [I.projects[2].stage, 'Pilot'],
    ];
  writeFileSync(file, await wb.toBytes());
  const edited = freshState();
  edited.scenario = 'downside';
  Object.assign(edited.settings, scenarioPresets.downside, { probPilot: 50 });
  edited.projects[4].alloc.ml = 2;
  edited.projects[1].adoption = 50;
  edited.settings.shared.find(c => c.id === 'dataplat').driver = 'equal';
  edited.settings.team.find(r => r.id === 'ml').cost = 200000;
  edited.excluded = [edited.projects[0].id];
  edited.projects[2].stage = 'Pilot';
  const exp = expected(edited),
    checks = [];
  exp.projects.forEach((e, i) =>
    Object.entries(e).forEach(([k, v]) => {
      const key = k === 'cautionsCount' ? 'cautions' : k;
      if (wb.refs.projects[i][key])
        checks.push({
          label: `${edited.projects[i].id}.${k}`,
          ref: split(wb.refs.projects[i][key]),
          expect: v,
          kind: k,
        });
    }),
  );
  Object.entries(exp.portfolio).forEach(([k, v]) => {
    if (wb.refs.portfolio[k])
      checks.push({ label: `portfolio.${k}`, ref: split(wb.refs.portfolio[k]), expect: v, kind: k });
  });
  jobs.push({ name: 'live-edit', file, checks, edits: edits.map(([ref, value]) => [...split(ref), value]) });
}

// Ask Excel for every referenced value.
const request = join(dir, 'request.json'),
  response = join(dir, 'response.json');
writeFileSync(
  request,
  JSON.stringify(jobs.map(j => ({ file: j.file, refs: j.checks.map(c => c.ref), edits: j.edits }))),
);
const ps = `
$ErrorActionPreference = 'Stop'
$jobs = Get-Content -Raw '${request}' | ConvertFrom-Json
$x = New-Object -ComObject Excel.Application
$x.Visible = $false; $x.DisplayAlerts = $false
$out = @()
try {
foreach ($j in $jobs) {
  $wb = $x.Workbooks.Open($j.file)
  foreach ($e in $j.edits) {
    $target = $wb.Worksheets.Item([string]$e[0]).Range([string]$e[1])
    if ($e[2] -is [string]) { $target.Value2 = [string]$e[2] } else { $target.Value2 = [double]$e[2] }
  }
  $x.CalculateFull()
  $vals = @()
  foreach ($r in $j.refs) {
    $c = $wb.Worksheets.Item($r[0]).Range($r[1])
    $v = $c.Value2
    if ($c.Text -like '#*') { $v = 'ERROR:' + $c.Text }
    $vals += ,@($v)
  }
  $errors = 0
  foreach ($ws in $wb.Worksheets) {
    $used = $ws.UsedRange
    foreach ($t in @(16)) { try { $e = $used.SpecialCells(-4123, 16); $errors += $e.Count } catch {} }
  }
  $out += [pscustomobject]@{ values = $vals; errors = $errors }
  $wb.Close($false)
}
} finally { $x.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($x) }
$out | ConvertTo-Json -Depth 5 -Compress | Set-Content -Encoding UTF8 '${response}'
`;
execFileSync('powershell', ['-NoProfile', '-Command', ps], { stdio: 'inherit', timeout: 600000 });
const answers = JSON.parse(readFileSync(response, 'utf8').replace(/^﻿/, ''));

let failures = 0,
  total = 0;
jobs.forEach((j, n) => {
  const { values, errors } = answers[n] ?? answers;
  if (errors) {
    failures++;
    console.log(`${j.name}: ${errors} formula error cell(s)`);
  }
  j.checks.forEach((c, k) => {
    total++;
    let got = values[k];
    if (Array.isArray(got)) got = got[0];
    let ok;
    if (c.kind === 'cautionsCount')
      ok = (got ? String(got).split('. ').filter(Boolean).length : 0) === c.expect;
    else if (typeof c.expect === 'number' && typeof got === 'number')
      ok = Math.abs(got - c.expect) <= 1e-6 * Math.max(1, Math.abs(c.expect));
    else ok = String(got ?? '') === String(c.expect);
    if (!ok) {
      failures++;
      console.log(`${j.name} ${c.label}: Excel ${JSON.stringify(got)} vs app ${JSON.stringify(c.expect)}`);
    }
  });
});
console.log(`${total} values compared across ${jobs.length} workbooks, ${failures} mismatch(es).`);
process.exit(failures ? 1 : 0);
