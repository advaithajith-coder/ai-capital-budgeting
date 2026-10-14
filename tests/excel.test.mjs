import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWorkbook } from '../dist/excel.js';
import { freshState } from '../dist/portfolio.js';
import { examples } from '../dist/model.js';
import { col, cell } from '../dist/xlsx.js';

const formulas = wb =>
  wb.sheets.flatMap(s =>
    [...s.rows.values()].flatMap(row =>
      [...row.values()].filter(c => c.value && typeof c.value === 'object').map(c => [s.name, c.value.f]),
    ),
  );

test('Column letters and cell references', () => {
  assert.equal(col(0), 'A');
  assert.equal(col(25), 'Z');
  assert.equal(col(26), 'AA');
  assert.equal(col(701), 'ZZ');
  assert.equal(cell(4, 1, true), '$B$5');
});

test('Workbook has the expected sheets and one calculation sheet per project', () => {
  const st = freshState(),
    wb = buildWorkbook(st);
  const names = wb.sheets.map(s => s.name);
  for (const n of [
    'Read me',
    'Overview',
    'Settings',
    'Projects',
    'Team',
    'Shared IT',
    'Portfolio',
    'Scenarios',
    'Health',
  ])
    assert.ok(names.includes(n), n);
  assert.equal(names.filter(n => /^P\d+ /.test(n)).length, st.projects.length);
  assert.ok(names.every(n => n.length <= 31));
});

test('Every formula is well formed and references real sheets and names', () => {
  const st = freshState();
  st.projects.push({ ...structuredClone(examples[0]), id: 'x', name: "O'Brien's [test]: costs/plan?" });
  const wb = buildWorkbook(st),
    names = new Set(wb.sheets.map(s => s.name)),
    defined = new Set(wb.names.map(n => n.name)),
    list = formulas(wb);
  assert.ok(list.length > 10000);
  for (const [sheet, f] of list) {
    assert.ok(!/undefined|NaN|Infinity|\[object/.test(f), `${sheet}: ${f}`);
    let depth = 0;
    for (const ch of f.replace(/"[^"]*"/g, '')) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      assert.ok(depth >= 0, `${sheet}: ${f}`);
    }
    assert.equal(depth, 0, `${sheet}: ${f}`);
    for (const [, quoted, bare] of f
      .replace(/"[^"]*"/g, '')
      .matchAll(/(?:'((?:[^']|'')+)'|([A-Za-z_][A-Za-z0-9_ ]*))!/g)) {
      const ref = quoted ? quoted.replace(/''/g, "'") : bare.trim();
      assert.ok(names.has(ref), `${sheet}: unknown sheet ${ref} in ${f}`);
    }
  }
  for (const n of [
    'Rate',
    'Years',
    'HorizonMonths',
    'Scenario',
    'BenefitFactor',
    'CostFactor',
    'ExtraDelay',
    'BasisList',
  ])
    assert.ok(defined.has(n), n);
});

test('Workbook zips to a valid package with every part', async () => {
  const bytes = await buildWorkbook(freshState()).toBytes(),
    view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    end = bytes.length - 22;
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint32(end, true), 0x06054b50);
  const entries = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const partNames = [];
  for (let i = 0; i < entries; i++) {
    assert.equal(view.getUint32(at, true), 0x02014b50);
    const len = view.getUint16(at + 28, true);
    partNames.push(new TextDecoder().decode(bytes.slice(at + 46, at + 46 + len)));
    at += 46 + len;
  }
  for (const p of [
    '[Content_Types].xml',
    '_rels/.rels',
    'xl/workbook.xml',
    'xl/styles.xml',
    'xl/worksheets/sheet1.xml',
  ])
    assert.ok(partNames.includes(p), p);
});

test('Inputs are exported in workbook units', () => {
  const st = freshState(),
    wb = buildWorkbook(st),
    projects = wb.sheets.find(s => s.name === 'Projects'),
    header = [...projects.rows.get(3).entries()].map(([c, v]) => [v.value, c]),
    colOf = h => header.find(([v]) => v === h)[1],
    row = projects.rows.get(4);
  assert.equal(row.get(colOf('Adoption (%)')).value, examples[0].adoption / 100);
  assert.equal(row.get(colOf('Implementation ($)')).value, examples[0].upfront);
  assert.equal(row.get(colOf('In portfolio')).value, 'Yes');
});
