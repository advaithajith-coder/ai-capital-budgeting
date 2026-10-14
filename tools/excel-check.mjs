// Shared by the Excel tools: the app model's expected results, keyed like workbook result refs.
import { results, aggregate } from '../dist/portfolio.js';

// Expected values from the app model, keyed like the workbook refs.
export function expected(state) {
  const s = state.settings,
    res = results(state.projects, s),
    a = aggregate(state.projects, state.excluded, s),
    na = v => (v === null || v === undefined || !Number.isFinite(v) ? 'N/A' : v);
  const projects = res.map(({ p, r }) => ({
    npv: r.npv,
    rnpv: r.riskAdjustedNPV,
    cap: r.cap,
    funding: r.fundingRequest,
    totalBenefits: r.totalBenefits,
    totalCosts: r.totalCosts,
    roi: na(r.roi),
    capitalRoi: r.cap > 0 ? r.capitalROI : 'N/A',
    payback: r.payback === null ? 'Beyond horizon' : r.payback,
    discPayback: r.discountedPayback === null ? 'Beyond horizon' : r.discountedPayback,
    irr: na(r.irr),
    pvB: r.pvBenefits,
    pvF: r.pvFixed,
    pvV: r.pvVariable,
    beBenefits: na(r.breakEven.benefits),
    beHeadroom: na(r.breakEven.costHeadroom),
    beAdoption: na(r.breakEven.adoption === null ? null : r.breakEven.adoption / 100),
    probability: r.probability,
    failureLoss: r.failureLoss,
    evNpv: r.evidence.applicable ? r.evidence.npv : 'Uses forecast',
    progress: r.evidence.applicable ? r.evidence.progress : '',
    health: r.health.action,
    readiness: r.readiness.status,
    rTeam: r.readiness.items.find(i => i.name === 'Team capacity').value,
    compliance: r.compliance.status,
    recommendation: r.recommendation,
    fullAt: r.team.monthsToFull === Infinity ? 1e9 : r.team.monthsToFull,
    teamTotal: r.team.totalCost,
    sharedAnnual: r.shared.annual,
    overrunPv: r.compute.pvCost,
    unitCostPer: r.unit ? r.unit.cost : 'N/A',
    unitBenefitPer: r.unit ? r.unit.benefit : 'N/A',
    stalled: r.team.stalled ? 'Yes' : 'No',
    cautionsCount: r.cautions.length,
  }));
  const portfolio = {
    npv: a.npv,
    rnpv: a.rnpv,
    cap: a.cap,
    funding: a.funding,
    benefit: a.benefit,
    cost: a.cost,
    roi: a.cost ? (a.benefit - a.cost) / a.cost : 'N/A',
    payback: !a.all.length ? 'No projects' : a.payback === null ? 'Beyond horizon' : a.payback,
    irr: na(a.irr),
    beBenefits: na(a.breakEven.benefits),
    beHeadroom: na(a.breakEven.costHeadroom),
  };
  return { projects, portfolio };
}

export const split = ref => {
  const i = ref.lastIndexOf('!');
  return [ref.slice(0, i).replace(/^'|'$/g, '').replace(/''/g, "'"), ref.slice(i + 1)];
};
