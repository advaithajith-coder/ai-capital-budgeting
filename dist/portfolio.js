// Portfolio state logic with no DOM access: saved-state migration, aggregation and team moves.
import { defaults, projectDefaults, examples, calculate, irr, breakEven, paybackMonths } from './model.js';

export const scenarioPresets = {
  base: { benefitFactor: 100, costFactor: 100, delay: 0 },
  downside: { benefitFactor: 75, costFactor: 120, delay: 3 },
  upside: { benefitFactor: 120, costFactor: 95, delay: 0 },
};

export const freshState = () => ({
  projects: structuredClone(examples),
  settings: structuredClone(defaults),
  excluded: [],
  view: 'overview',
  scenario: 'base',
});

// Returns a usable state from saved JSON, filling fields added in later versions, or null if invalid.
export function migrateSaved(saved) {
  if (!saved || !Array.isArray(saved.projects) || !saved.settings || typeof saved.settings !== 'object') return null;
  const projects = saved.projects.map(p => ({
      ...structuredClone(projectDefaults),
      ...structuredClone(examples.find(e => e.id === p?.id) || {}),
      ...p,
    })),
    settings = { ...structuredClone(defaults), ...saved.settings };
  const valid =
    projects.every(
      p =>
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        Object.keys(examples[0]).every(k => typeof p[k] === typeof examples[0][k]),
    ) &&
    Object.keys(defaults).every(k => typeof settings[k] === typeof defaults[k]) &&
    Array.isArray(settings.team) &&
    settings.team.every(r => typeof r.id === 'string' && r.headcount >= 0 && r.cost >= 0) &&
    [2, 3, 5, 10].includes(settings.years) &&
    settings.rate >= 0 &&
    settings.rate <= 80;
  return valid ? { ...freshState(), ...saved, projects, settings, view: 'overview' } : null;
}

export const results = (projects, s) => projects.map((p, i) => ({ p, i, r: calculate(p, s) }));

// Portfolio totals over included projects. Monthly flows are summed before IRR and payback.
export function aggregate(projects, excluded, s) {
  const all = results(projects, s).filter(x => !excluded.includes(x.p.id)),
    flows = Array(s.years * 12 + 1).fill(0);
  all.forEach(x => x.r.flows.forEach((v, i) => (flows[i] += v)));
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
    npv: sum('npv'),
    cap: sum('cap'),
    benefit: sum('totalBenefits'),
    cost: sum('totalCosts'),
    irr: irr(flows),
    payback: all.length ? paybackMonths(flows) : null,
    flows,
  };
}

// People assigned per role across all projects; excluded projects still hold their people.
export const roleUsage = (projects, team) =>
  team.map(r => {
    const assigned = projects.reduce((v, p) => v + (p.alloc?.[r.id] || 0), 0);
    return { ...r, assigned, available: r.headcount - assigned };
  });

// Moves up to count people of one role between a project and another project or the bench.
// Mutates the projects' allocations and returns the number moved.
export function moveTeam(projects, team, role, from, to, count) {
  if (from === to) return 0;
  const usage = roleUsage(projects, team).find(r => r.id === role),
    src = from === 'bench' ? null : projects.find(p => p.id === from),
    dst = to === 'bench' ? null : projects.find(p => p.id === to);
  if (!usage || (from !== 'bench' && !src) || (to !== 'bench' && !dst)) return 0;
  const n = Math.min(count, src ? src.alloc[role] || 0 : usage.available);
  if (n <= 0) return 0;
  if (src) src.alloc[role] -= n;
  if (dst) dst.alloc[role] = (dst.alloc[role] || 0) + n;
  return n;
}
