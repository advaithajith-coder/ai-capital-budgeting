// Add-automation questionnaire: field definitions and the pure draft -> project builder.
import { projectDefaults } from './model.js';
// Every assumption is asked for explicitly; nothing is inherited from an example.
export const wizardBlank = {
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
  need_ml: 0,
  need_data: 0,
  need_sw: 0,
  need_ops: 0,
  runNeed: 0,
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
// Core steps build a complete business case; detail steps are optional and opened from Review.
export const wizardSteps = [
  {
    key: 'idea',
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
    key: 'costs',
    title: 'Costs',
    intro:
      'One-time costs are counted at month 0. Running costs are charged monthly from month 1, including during any rollout delay.',
    fields: [
      ['_one-time', 'One-time costs', 'heading'],
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
      ['_running', 'Running costs per year', 'heading'],
      ['compute', 'Compute and inference ($ per year)', 'money', { required: 1 }],
      ['storage', 'Storage and licences ($ per year)', 'money'],
      ['maintenance', 'Maintenance and support ($ per year)', 'money'],
      ['oversight', 'Human oversight and review ($ per year)', 'money'],
      ['costGrowth', 'Running cost growth (% per year)', 'number', { min: 0, max: 50 }],
    ],
  },
  {
    key: 'benefits',
    title: 'Estimated benefits',
    intro: 'Annual cash benefits at full adoption, and how quickly they arrive.',
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
      ['_rollout', 'Rollout', 'heading'],
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
    key: 'review',
    title: 'Review',
    intro: 'Check the business case before it joins the portfolio. Everything stays editable afterwards.',
  },
  {
    key: 'usage',
    optional: true,
    title: 'Usage & capacity',
    why: 'Usage-based cost per transaction, compute budget and recovered hours.',
    intro:
      'Costs that scale with use, the approved compute budget, and recovered hours (reported as capacity, not cash).',
    note: 'Do not count the same labour twice. If headcount, hiring or contractor spend falls, enter it as direct savings and leave those hours out of capacity.',
    fields: [
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
      [
        'computeBudget',
        'Approved compute budget ($ per year)',
        'money',
        { help: 'Blank uses the fixed compute cost.' },
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
    key: 'team',
    optional: true,
    title: 'Tech team',
    why: 'People needed by role. Without it, team cost and staffing delays are not modelled.',
    intro:
      'People needed from the shared tech team. Free people are assigned from the bench when the project is added.',
    fields: [
      ['need_ml', 'ML engineers needed to build', 'number', { min: 0, max: 100, step: 1 }],
      ['need_data', 'Data engineers needed', 'number', { min: 0, max: 100, step: 1 }],
      ['need_sw', 'Software engineers needed', 'number', { min: 0, max: 100, step: 1 }],
      ['need_ops', 'MLOps & platform needed', 'number', { min: 0, max: 100, step: 1 }],
      [
        'runNeed',
        'Run support after launch (FTE)',
        'number',
        { min: 0, max: 100, help: 'People kept on once benefits reach full ramp.' },
      ],
    ],
  },
  {
    key: 'readiness',
    optional: true,
    title: 'Readiness',
    why: 'Delivery risks and approvals. Unrated risks stay neutral; missing approvals block pilots.',
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
          help: 'Replaced by actual staffing once tech team needs are added.',
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
    key: 'evidence',
    optional: true,
    title: 'Evidence',
    why: 'Business KPI, baseline and model health, so results can be proven later.',
    intro: 'What will prove it works, and what is measured today. Leave unknowns blank.',
    fields: [
      ['kpi', 'Business KPI', 'text', { maxlength: 80, placeholder: 'e.g. Contract review time' }],
      ['unit', 'KPI unit', 'text', { maxlength: 20, placeholder: 'e.g. hours' }],
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
];
export const coreSteps = wizardSteps.filter(x => !x.optional),
  detailSteps = wizardSteps.filter(x => x.optional);
export function buildProject(d, usage) {
  const n = k => (d[k] === '' || d[k] == null ? 0 : +d[k]),
    t = k => String(d[k] ?? '').trim();
  const p = {
    ...structuredClone(projectDefaults),
    name: t('name'),
    team: t('team'),
    owner: t('owner'),
    stage: d.stage,
    description: t('description') || 'New AI investment business case.',
    kpi: t('kpi') || 'Define business KPI',
    unit: t('unit') || 'units',
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
  // Needed people are assigned from whoever is on the bench now.
  p.runNeed = n('runNeed');
  for (const r of usage) {
    p.need[r.id] = n('need_' + r.id);
    p.alloc[r.id] = Math.min(p.need[r.id], Math.max(0, r.available));
  }
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
