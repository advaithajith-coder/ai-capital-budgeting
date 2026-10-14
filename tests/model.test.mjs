import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, defaults, examples, irr, health, readiness, compliance, paybackMonths } from '../dist/model.js';
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
  const p = { ...simple, stage: 'Pilot' },
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
