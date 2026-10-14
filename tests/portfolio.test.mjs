import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, examples, calculate, paybackMonths } from '../dist/model.js';
import { freshState, migrateSaved, aggregate, roleUsage, moveTeam } from '../dist/portfolio.js';
import { wizardBlank, buildProject } from '../dist/wizard.js';

// A save from before the readiness, team and probability fields existed.
const oldSave = () => {
  const projects = structuredClone(examples).map(p => {
    for (const k of ['need', 'alloc', 'runNeed', 'volume', 'dataReadiness', 'probOverrideOn', 'probReason']) delete p[k];
    return p;
  });
  projects[0].direct = 1111111;
  projects.push({ ...structuredClone(projects[2]), id: 'custom', name: 'Custom case' });
  const { team, teamCost, riskHigh, ...settings } = structuredClone(defaults);
  return { projects, settings, excluded: ['demand'], scenario: 'base', view: 'team' };
};

test('Older saves keep their edits and gain the new fields', () => {
  const s = migrateSaved(oldSave());
  assert.ok(s);
  assert.equal(s.projects[0].direct, 1111111);
  assert.deepEqual(s.projects[0].alloc, examples[0].alloc);
  assert.equal(s.projects[0].dataReadiness, examples[0].dataReadiness);
  const custom = s.projects.find(p => p.id === 'custom');
  assert.deepEqual(custom.alloc, { ml: 0, data: 0, sw: 0, ops: 0 });
  assert.equal(custom.probReason, '');
  assert.equal(s.settings.team.length, 4);
  assert.equal(s.view, 'overview');
  assert.deepEqual(s.excluded, ['demand']);
  for (const p of s.projects) assert.ok(Number.isFinite(calculate(p, s.settings).riskAdjustedNPV));
});

test('Migrated projects do not share nested objects', () => {
  const s = migrateSaved(oldSave()),
    a = s.projects.find(p => p.id === 'custom'),
    b = s.projects.find(p => p.id === 'invoice');
  a.alloc.ml = 9;
  assert.notEqual(b.alloc.ml, 9);
  assert.equal(examples[2].alloc.ml, 1);
});

test('Invalid saves are rejected rather than half loaded', () => {
  assert.equal(migrateSaved(null), null);
  assert.equal(migrateSaved({ projects: 'x', settings: {} }), null);
  const badYears = oldSave();
  badYears.settings.years = 7;
  assert.equal(migrateSaved(badYears), null);
  const badTeam = oldSave();
  badTeam.settings.team = [{ id: 'ml', headcount: -1, cost: 1 }];
  assert.equal(migrateSaved(badTeam), null);
  const badProject = oldSave();
  badProject.projects[1].upfront = 'lots';
  assert.equal(migrateSaved(badProject), null);
});

test('Portfolio totals sum included projects and share the project payback rule', () => {
  const st = freshState(),
    a = aggregate(st.projects, ['demand'], st.settings),
    included = st.projects.filter(p => p.id !== 'demand').map(p => calculate(p, st.settings));
  assert.equal(a.all.length, 4);
  assert.ok(Math.abs(a.npv - included.reduce((v, r) => v + r.npv, 0)) < 1e-6);
  assert.ok(Math.abs(a.rnpv - included.reduce((v, r) => v + r.riskAdjustedNPV, 0)) < 1e-6);
  assert.equal(a.payback, paybackMonths(a.flows));
  const tenYears = aggregate(st.projects, [], { ...st.settings, years: 10 });
  assert.equal(tenYears.payback, paybackMonths(tenYears.flows));
  assert.equal(aggregate(st.projects, st.projects.map(p => p.id), st.settings).payback, null);
});

test('Portfolio payback waits for final recovery when cash turns negative again', () => {
  const s = { ...defaults, rate: 0, years: 2, teamCost: false },
    base = { ...examples[2], upfront: 1000, data: 0, training: 0, compute: 0, storage: 0, maintenance: 0, oversight: 0, indirect: 0, hours: 0, adoption: 100, ramp: 1, delay: 0, growth: 0, need: {}, alloc: {} };
  const early = { ...base, id: 'a', direct: 2400, costGrowth: 0 },
    late = { ...base, id: 'b', upfront: 0, direct: 0, compute: 1200, costGrowth: 400 };
  const a = aggregate([early, late], [], s);
  assert.equal(a.payback, paybackMonths(a.flows));
});

test('People move between bench and projects without exceeding the pool', () => {
  const st = freshState(),
    { projects } = st,
    team = st.settings.team,
    ml = () => roleUsage(projects, team).find(r => r.id === 'ml');
  assert.equal(ml().available, 1);
  assert.equal(moveTeam(projects, team, 'ml', 'bench', 'maintenance', 5), 1);
  assert.equal(ml().available, 0);
  assert.equal(projects.find(p => p.id === 'maintenance').alloc.ml, 2);
  assert.equal(moveTeam(projects, team, 'ml', 'bench', 'vision', 1), 0);
  assert.equal(moveTeam(projects, team, 'ml', 'demand', 'vision', 1), 1);
  assert.equal(moveTeam(projects, team, 'ml', 'vision', 'vision', 1), 0);
  assert.equal(moveTeam(projects, team, 'ml', 'nope', 'vision', 1), 0);
  assert.equal(moveTeam(projects, team, 'ml', 'vision', 'bench', 9), 2);
  assert.equal(ml().assigned + ml().available, ml().headcount);
});

test('Questionnaire builds a complete project and assigns only free people', () => {
  const st = freshState(),
    usage = roleUsage(st.projects, st.settings.team),
    draft = { ...wizardBlank, name: ' Contract review ', team: 'Legal', owner: 'GC', stage: 'Pilot', upfront: '150000', compute: '20000', direct: '260000', adoption: '75', ramp: '4', kpi: 'Review time', unit: 'hours', need_ml: '2', need_ops: '1', runNeed: '1' },
    p = { ...buildProject(draft, usage), id: 'new' };
  assert.equal(p.name, 'Contract review');
  assert.deepEqual(p.need, { ml: 2, data: 0, sw: 0, ops: 1 });
  assert.deepEqual(p.alloc, { ml: 1, data: 0, sw: 0, ops: 0 });
  for (const k of Object.keys(examples[0])) if (k !== 'id') assert.equal(typeof p[k], typeof examples[0][k], k);
  assert.ok(migrateSaved({ ...st, projects: [...st.projects, p] }));
  const r = calculate(p, st.settings);
  assert.equal(r.team.stalled, true);
  assert.ok(Number.isFinite(r.npv));
});
