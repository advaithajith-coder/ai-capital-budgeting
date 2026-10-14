import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, defaults, examples, irr, health, readiness, compliance, paybackMonths, staffing, successProbability, evidenceProgress, computeOverrun } from '../dist/model.js';
const simple = {
  ...examples[0],
  upfront: 1000,
  data: 0,
  training: 0,
  compute: 0,
  storage: 0,
  maintenance: 0,
  oversight: 0,
  direct: 1200,
  indirect: 0,
  hours: 0,
  adoption: 100,
  ramp: 1,
  delay: 0,
  growth: 0,
  costGrowth: 0,
  // No shared-team staffing, so these tests isolate the cash mechanics.
  need: {},
  alloc: {},
  runNeed: 0,
};
test('Known monthly cash schedule gives correct NPV, ROI and payback', () => {
  const r = calculate(simple, { ...defaults, rate: 0, years: 2 });
  assert.equal(r.npv, 1400);
  assert.equal(r.payback, 10);
  assert.equal(r.roi, 1.4);
  assert.equal(r.flows.length, 25);
});
test('Annual IRR correctly annualizes a monthly root', () => {
  assert.ok(Math.abs(irr([-1000, 1100]) - Math.pow(1.1, 12) + 1) < 1e-8);
});
test('Discounted NPV matches independent annuity equation', () => {
  const rate = 0.12,
    m = Math.pow(1 + rate, 1 / 12) - 1,
    r = calculate(simple, { ...defaults, years: 2 });
  const expected = -1000 + (100 * (1 - Math.pow(1 + m, -24))) / m;
  assert.ok(Math.abs(r.npv - expected) < 1e-7);
  assert.ok(r.discountedPayback > r.payback);
});
test('No benefits gives negative NPV, no IRR and no payback', () => {
  const r = calculate({ ...simple, direct: 0 });
  assert.equal(r.npv, -1000);
  assert.equal(r.irr, null);
  assert.equal(r.payback, null);
});
test('Delay defers benefits while operating expenses continue', () => {
  const r = calculate({ ...simple, compute: 120, delay: 2 });
  assert.equal(r.flows[1], -10);
  assert.equal(r.flows[2], -10);
  assert.equal(r.flows[3], 90);
});
test('Adoption and indirect cash qualification apply once', () => {
  const r = calculate(
    { ...simple, adoption: 50, indirect: 1200, indirectCash: 50 },
    { ...defaults, rate: 0, years: 2 },
  );
  assert.equal(r.totalBenefits, 1800);
});
test('Capacity excluded by default and included only explicitly', () => {
  const p = { ...simple, hours: 100, hourly: 20, realization: 50 };
  assert.equal(calculate(p).npv, calculate(simple).npv);
  assert.ok(calculate(p, { ...defaults, capacity: true }).npv > calculate(p).npv);
  assert.equal(calculate(p).capacity, 1000);
});
test('Higher discount and costs reduce NPV; benefits increase NPV', () => {
  const base = calculate(examples[0]);
  assert.ok(calculate(examples[0], { ...defaults, rate: 20 }).npv < base.npv);
  assert.ok(calculate(examples[0], { ...defaults, costFactor: 120 }).npv < base.npv);
  assert.ok(calculate(examples[0], { ...defaults, benefitFactor: 120 }).npv > base.npv);
});
test('Non conventional cash flows are not assigned ambiguous IRR', () => {
  assert.equal(irr([-100, 230, -132]), null);
});
test('Reference leading indicator escalation thresholds', () => {
  const p = { ...examples[0], adoption: 10, age: 6, sponsor: 'Missing' };
  assert.equal(health(p).action, 'Escalate');
  assert.equal(calculate(p).recommendation, 'Intervene');
  assert.equal(calculate(examples[3]).recommendation, 'Intervene');
});
test('All five examples produce finite monthly and portfolio values', () => {
  for (const p of examples) {
    for (const s of [
      defaults,
      { ...defaults, benefitFactor: 75, costFactor: 120, delay: 3 },
      { ...defaults, years: 10, capacity: true },
    ]) {
      const r = calculate(p, s);
      assert.ok(Number.isFinite(r.npv));
      assert.ok(r.flows.every(Number.isFinite));
      assert.ok(Math.abs(r.totalBenefits - r.totalCosts - r.cumulative.at(-1)) < 1e-6);
    }
  }
});
test('Year-1 funding is setup plus the first twelve months of scheduled running costs', () => {
  const r = calculate({ ...simple, compute: 1200, costGrowth: 10, delay: 3 });
  assert.equal(r.fundingRequest, 1000 + 1200);
  assert.equal(
    calculate({ ...simple, compute: 1200, costGrowth: 10 }, { ...defaults, costFactor: 150 }).fundingRequest,
    1500 + 1800,
  );
});
test('Break-even multipliers return NPV to zero', () => {
  const p = { ...examples[1], unitCost: 0.2, volume: 300000 };
  const r = calculate(p),
    near = v => Math.abs(v) < 1e-4;
  assert.ok(near(calculate(p, { ...defaults, benefitFactor: 100 * r.breakEven.benefits }).npv));
  assert.ok(near(calculate(p, { ...defaults, costFactor: 100 * (1 + r.breakEven.costHeadroom) }).npv));
  assert.ok(near(calculate({ ...p, adoption: r.breakEven.adoption }).npv));
  assert.equal(calculate({ ...simple, direct: 0 }).breakEven.benefits, null);
});
test('Risk-adjusted NPV weights success by stage and loses initial capital on failure', () => {
  const lowRisk = { dataReadiness: 'Low', integration: 'Low', vendorRisk: 'Low', teamCapacity: 'Low' },
    p = { ...simple, ...lowRisk, stage: 'Pilot' },
    r = calculate(p);
  assert.ok(Math.abs(r.riskAdjustedNPV - (0.6 * r.npv - 0.4 * 1000)) < 1e-9);
  assert.equal(calculate({ ...p, stage: 'Idea' }, { ...defaults, probIdea: 100 }).riskAdjustedNPV, r.npv);
});
test('Usage-based cost follows delay, adoption and ramp but not benefit growth twice', () => {
  const r = calculate(
    { ...simple, direct: 0, unitCost: 2, volume: 1200, adoption: 50, ramp: 2, delay: 1 },
    { ...defaults, rate: 0, years: 2 },
  );
  assert.equal(r.flows[1], 0);
  assert.equal(r.flows[2], -50);
  assert.equal(r.flows[3], -100);
  assert.ok(Math.abs(r.pvVariable - (0.5 + 22) * 100) < 1e-9);
  assert.equal(r.unit.cost, 2);
});
test('Readiness and compliance statuses gate recommendations', () => {
  assert.equal(
    readiness({ dataReadiness: 'High', integration: 'High', vendorRisk: 'Low', teamCapacity: 'Low' }).status,
    'Not ready',
  );
  assert.equal(
    readiness({ dataReadiness: 'Low', integration: 'Medium', vendorRisk: 'Medium', teamCapacity: 'Low' })
      .status,
    'At risk',
  );
  assert.equal(
    readiness({ dataReadiness: 'Low', integration: 'Low', vendorRisk: 'Low', teamCapacity: 'Not assessed' })
      .status,
    'Incomplete',
  );
  const live = { ...examples[0], dataSensitivity: 'Personal', legalReview: 'In progress' };
  assert.deepEqual(compliance(live).missing, ['Legal & privacy review']);
  assert.equal(calculate(live).recommendation, 'Intervene');
  assert.equal(compliance({ ...live, stage: 'Idea' }).status, 'Pending');
  assert.equal(calculate(examples[0]).recommendation, 'Scale');
});
test('Payback counts from the first deficit when there is no setup cost', () => {
  const r = calculate({ ...simple, upfront: 0, compute: 120, delay: 3 }, { ...defaults, rate: 0, years: 2 });
  assert.ok(r.flows[0] === 0);
  assert.ok(r.cumulative[3] < 0);
  assert.ok(Math.abs(r.payback - (3 + 30 / 90)) < 1e-9);
  assert.equal(paybackMonths([0, 10, 10]), 0);
});
test('Payback that reverses is not reported until cash is recovered again', () => {
  assert.ok(Math.abs(paybackMonths([-100, 60, 60]) - (1 + 40 / 60)) < 1e-9);
  assert.equal(paybackMonths([-100, 60, 60, -50]), null);
  assert.ok(Math.abs(paybackMonths([-100, 60, 60, -50, 100]) - 3.3) < 1e-9);
});
const oneRole = { ...defaults, rate: 0, years: 1, team: [{ id: 'ml', name: 'ML engineers', headcount: 4, cost: 120000 }] };
test('Assigned team is charged in full while building, then only the run share', () => {
  const r = calculate({ ...simple, direct: 0, delay: 2, need: { ml: 1 }, alloc: { ml: 1 }, runNeed: 0.5 }, oneRole);
  assert.equal(r.team.monthsToFull, 3);
  assert.deepEqual(r.flows.slice(1, 6), [-10000, -10000, -10000, -5000, -5000]);
  assert.equal(r.team.totalCost, 3 * 10000 + 9 * 5000);
  assert.equal(r.yearly[0].team, r.team.totalCost);
});
test('Under-staffing stretches delivery, no one in a needed role stalls it', () => {
  const p = { ...simple, delay: 2, ramp: 2, need: { ml: 2 }, runNeed: 1 };
  assert.equal(calculate({ ...p, alloc: { ml: 2 } }, oneRole).team.monthsToFull, 4);
  const half = calculate({ ...p, alloc: { ml: 1 } }, oneRole);
  assert.equal(half.team.monthsToFull, 8);
  assert.equal(half.flows[4], -10000);
  const stalled = calculate({ ...p, alloc: { ml: 0 } }, oneRole);
  assert.equal(stalled.totalBenefits, 0);
  assert.equal(stalled.health.signals.find(x => x.name === 'Team staffing').level, 2);
});
test('Over-staffing speeds delivery with diminishing returns, capped at half the time', () => {
  const p = { ...simple, delay: 4, ramp: 4, need: { ml: 1 }, runNeed: 1 };
  assert.ok(Math.abs(staffing({ ...p, alloc: { ml: 2 } }, oneRole).factor - Math.SQRT1_2) < 1e-12);
  assert.equal(calculate({ ...p, alloc: { ml: 4 } }, oneRole).team.monthsToFull, 4);
  assert.equal(staffing({ ...p, alloc: { ml: 9 } }, { ...oneRole, team: [{ ...oneRole.team[0], headcount: 9 }] }).factor, 0.5);
});
test('Switching team cost off keeps staffing delays but removes the charge', () => {
  const p = { ...simple, delay: 2, need: { ml: 2 }, alloc: { ml: 1 }, runNeed: 1 };
  const off = calculate(p, { ...oneRole, teamCost: false });
  assert.equal(off.team.totalCost, 0);
  assert.equal(off.team.monthsToFull, calculate(p, oneRole).team.monthsToFull);
  assert.equal(off.flows[4], 0);
});
test('Success probability adjusts the stage base for delivery risks and missing approvals', () => {
  const p = {
    ...simple,
    stage: 'Pilot',
    dataReadiness: 'High',
    integration: 'Not assessed',
    vendorRisk: 'High',
    teamCapacity: 'Medium',
    dataSensitivity: 'Personal',
    securityReview: 'Not started',
    legalReview: 'In progress',
  };
  const sp = successProbability(p);
  assert.ok(Math.abs(sp.computed - 60 * 0.8 * 0.8 * 0.9 * 0.85 * 0.85) < 1e-9);
  assert.deepEqual(sp.unassessed, ['Integration']);
  assert.ok(Math.abs(calculate(p).probability - sp.computed / 100) < 1e-12);
  assert.equal(successProbability({ ...p, stage: 'Idea' }).factors.length, 3);
  assert.equal(successProbability(p, { ...defaults, riskHigh: 0.01 }).computed, defaults.probFloor);
});
test('Not assessed ratings are neutral and an override needs a reason', () => {
  const p = { ...simple, stage: 'Production', dataReadiness: 'Not assessed', integration: 'Not assessed', vendorRisk: 'Not assessed', teamCapacity: 'Not assessed' };
  assert.equal(successProbability(p).computed, 90);
  assert.equal(successProbability(p).unassessed.length, 4);
  const noReason = successProbability({ ...p, probOverrideOn: true, probOverride: 40, probReason: '  ' });
  assert.equal(noReason.value, 90);
  assert.equal(noReason.overrideMissingReason, true);
  const withReason = successProbability({ ...p, probOverrideOn: true, probOverride: 40, probReason: 'Vendor contract signed' });
  assert.equal(withReason.value, 40);
  assert.equal(withReason.overridden, true);
});
test('Team capacity risk follows Tech team staffing when a team need exists', () => {
  const p = { ...simple, stage: 'Pilot', teamCapacity: 'Low', need: { ml: 4 }, runNeed: 1 },
    level = alloc => readiness({ ...p, alloc: { ml: alloc } }, oneRole).items.find(i => i.name === 'Team capacity');
  assert.equal(level(4).value, 'Low');
  assert.equal(level(2).value, 'Medium');
  assert.equal(level(1).value, 'High');
  assert.equal(level(1).derived, true);
  assert.equal(readiness({ ...p, need: {}, teamCapacity: 'High' }, oneRole).items[3].value, 'High');
});
test('Sponsor engagement adjusts probability of success', () => {
  const p = { ...simple, stage: 'Production', dataReadiness: 'Low', integration: 'Low', vendorRisk: 'Low', teamCapacity: 'Low' };
  assert.equal(successProbability({ ...p, sponsor: 'Engaged' }).computed, 90);
  assert.ok(Math.abs(successProbability({ ...p, sponsor: 'Limited' }).computed - 81) < 1e-9);
  assert.ok(Math.abs(successProbability({ ...p, sponsor: 'Missing' }).computed - 67.5) < 1e-9);
});
test('Evidence progress scales benefits toward the measured KPI result', () => {
  const p = { ...simple, stage: 'Pilot', baseline: 'Verified', direction: 'higher', before: 60, target: 80 };
  assert.equal(evidenceProgress({ ...p, after: 70 }).progress, 0.5);
  assert.equal(evidenceProgress({ ...p, after: 95 }).progress, 1);
  assert.equal(evidenceProgress({ ...p, after: 50 }).progress, 0);
  assert.equal(evidenceProgress({ ...p, direction: 'lower', before: 10, after: 7, target: 4 }).progress, 0.5);
  assert.equal(evidenceProgress({ ...p, after: 70, stage: 'Idea' }).applicable, false);
  assert.equal(evidenceProgress({ ...p, after: 70, baseline: 'Missing' }).applicable, false);
  assert.equal(evidenceProgress({ ...p, after: 70, target: 50 }).applicable, false);
  const r = calculate({ ...p, after: 70 });
  assert.ok(Math.abs(r.evidence.npv - calculate({ ...p, after: 70 }, { ...defaults, benefitFactor: 50 }).npv) < 1e-6);
});
test('Compute overrun is flagged and its cost equals the NPV gap to budget', () => {
  const p = { ...simple, compute: 1500, computeBudget: 1200, costGrowth: 5 };
  assert.ok(Math.abs(computeOverrun(p) - 0.25) < 1e-12);
  assert.equal(calculate(p).health.signals.find(x => x.name === 'Compute vs budget').level, 1);
  assert.equal(calculate({ ...p, compute: 1600 }).health.signals.find(x => x.name === 'Compute vs budget').level, 2);
  const r = calculate(p);
  assert.ok(Math.abs(r.compute.pvCost - (calculate({ ...p, compute: 1200 }).npv - r.npv)) < 1e-6);
  assert.equal(computeOverrun({ ...p, computeBudget: 0 }), null);
});
