// Minimal dependency-free XLSX writer: values, formulas, styles, column widths, frozen panes,
// list validations and defined names, packaged as a zip. Runs in the browser and in Node.

const xml = v =>
  String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// 0-based column index → letters (0 → A, 26 → AA).
export function col(n) {
  let s = '';
  for (n += 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}
// 0-based row and column → A1 reference; absolute adds $ signs.
export const cell = (r, c, absolute = false) => (absolute ? `$${col(c)}$${r + 1}` : `${col(c)}${r + 1}`);
// Sheet-qualified reference, quoting the sheet name when needed.
export const sheetRef = (sheet, ref) =>
  `${/^[A-Za-z_][A-Za-z0-9_]*$/.test(sheet) ? sheet : `'${sheet.replace(/'/g, "''")}'`}!${ref}`;

const FONT = {
  normal: '<font><sz val="10"/><color rgb="FF1B2535"/><name val="Arial"/></font>',
  input: '<font><sz val="10"/><color rgb="FF0000FF"/><name val="Arial"/></font>',
  link: '<font><sz val="10"/><color rgb="FF008000"/><name val="Arial"/></font>',
  bold: '<font><b/><sz val="10"/><color rgb="FF1B2535"/><name val="Arial"/></font>',
  title: '<font><b/><sz val="16"/><color rgb="FF1B2535"/><name val="Arial"/></font>',
  subtitle: '<font><b/><sz val="12"/><color rgb="FF1B2535"/><name val="Arial"/></font>',
  header: '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>',
  muted: '<font><i/><sz val="9"/><color rgb="FF6B7685"/><name val="Arial"/></font>',
};
const FILL = {
  none: '<fill><patternFill patternType="none"/></fill>',
  gray125: '<fill><patternFill patternType="gray125"/></fill>',
  header:
    '<fill><patternFill patternType="solid"><fgColor rgb="FF315DE8"/><bgColor indexed="64"/></patternFill></fill>',
  key: '<fill><patternFill patternType="solid"><fgColor rgb="FFFFFF00"/><bgColor indexed="64"/></patternFill></fill>',
  band: '<fill><patternFill patternType="solid"><fgColor rgb="FFF3F6FC"/><bgColor indexed="64"/></patternFill></fill>',
  total:
    '<fill><patternFill patternType="solid"><fgColor rgb="FFE5E9EE"/><bgColor indexed="64"/></patternFill></fill>',
};
// Built-in format ids: 0 General, 3 #,##0, 4 #,##0.00, 49 text. Custom ids start at 164.
const FORMAT = {
  general: [0],
  int: [3],
  num2: [4],
  money: [164, '$#,##0;($#,##0);"-"'],
  unit: [165, '$#,##0.000;($#,##0.000);"-"'],
  pct: [166, '0.0%;(0.0%);"-"'],
  months: [167, '0.0;(0.0);"-"'],
  factor: [168, '0.00'],
  date: [169, 'yyyy-mm-dd hh:mm'],
};

class Styles {
  constructor() {
    this.fonts = Object.keys(FONT);
    this.fills = Object.keys(FILL);
    this.xfs = [];
    this.index = new Map();
    this.id({}); // style 0 is the default
  }
  // Style spec: { font, fill, fmt, align, wrap, indent }. Returns the cellXfs index.
  id(spec = {}) {
    const given = Object.fromEntries(Object.entries(spec).filter(([, v]) => v !== undefined)),
      s = { font: 'normal', fill: 'none', fmt: 'general', align: '', wrap: false, ...given },
      key = JSON.stringify(s);
    if (!FORMAT[s.fmt] || !FONT[s.font] || !FILL[s.fill]) throw new Error('Unknown style: ' + key);
    if (!this.index.has(key)) {
      this.index.set(key, this.xfs.length);
      this.xfs.push(s);
    }
    return this.index.get(key);
  }
  xml() {
    const custom = Object.values(FORMAT).filter(f => f[1]);
    const xf = this.xfs
      .map(s => {
        const align =
          s.align || s.wrap
            ? `<alignment${s.align ? ` horizontal="${s.align}"` : ''}${s.wrap ? ' wrapText="1" vertical="top"' : ''}/>`
            : '';
        return `<xf numFmtId="${FORMAT[s.fmt][0]}" fontId="${this.fonts.indexOf(s.font)}" fillId="${this.fills.indexOf(s.fill)}" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"${align ? ' applyAlignment="1">' + align + '</xf>' : '/>'}`;
      })
      .join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="${custom.length}">${custom.map(([id, code]) => `<numFmt numFmtId="${id}" formatCode="${xml(code)}"/>`).join('')}</numFmts><fonts count="${this.fonts.length}">${this.fonts.map(f => FONT[f]).join('')}</fonts><fills count="${this.fills.length}">${this.fills.map(f => FILL[f]).join('')}</fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${this.xfs.length}">${xf}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  }
}

export class Sheet {
  constructor(name, styles) {
    if (name.length > 31 || /[\\/?*[\]:]/.test(name)) throw new Error('Invalid sheet name: ' + name);
    this.name = name;
    this.styles = styles;
    this.rows = new Map();
    this.widths = new Map();
    this.heights = new Map();
    this.validations = [];
    this.merges = [];
    this.freeze = null;
    this.tab = null;
  }
  // value: number | string | boolean | { f: 'FORMULA' } | null. style: spec object for Styles.id.
  set(r, c, value, style = {}) {
    if (!this.rows.has(r)) this.rows.set(r, new Map());
    this.rows.get(r).set(c, { value, s: this.styles.id(style) });
    return cell(r, c);
  }
  width(c, w) {
    this.widths.set(c, w);
  }
  height(r, h) {
    this.heights.set(r, h);
  }
  // List validation for a range, e.g. list(['Yes', 'No']) or a range reference string.
  validate(range, list) {
    this.validations.push({ range, list });
  }
  merge(range) {
    this.merges.push(range);
  }
  xml() {
    const rows = [...this.rows.keys()].sort((a, b) => a - b),
      body = rows
        .map(r => {
          const cells = [...this.rows.get(r).entries()].sort((a, b) => a[0] - b[0]);
          const ht = this.heights.get(r);
          return `<row r="${r + 1}"${ht ? ` ht="${ht}" customHeight="1"` : ''}>${cells
            .map(([c, { value, s }]) => {
              const ref = cell(r, c);
              if (value === null || value === undefined || value === '') return `<c r="${ref}" s="${s}"/>`;
              if (typeof value === 'object') return `<c r="${ref}" s="${s}"><f>${xml(value.f)}</f></c>`;
              if (typeof value === 'number') {
                if (!Number.isFinite(value)) throw new Error(`Non-finite number at ${this.name}!${ref}`);
                return `<c r="${ref}" s="${s}"><v>${value}</v></c>`;
              }
              if (typeof value === 'boolean')
                return `<c r="${ref}" s="${s}" t="b"><v>${value ? 1 : 0}</v></c>`;
              return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
            })
            .join('')}</row>`;
        })
        .join(''),
      pane = this.freeze
        ? `<pane${this.freeze.col ? ` xSplit="${this.freeze.col}"` : ''}${this.freeze.row ? ` ySplit="${this.freeze.row}"` : ''} topLeftCell="${cell(this.freeze.row || 0, this.freeze.col || 0)}" activePane="${this.freeze.row && this.freeze.col ? 'bottomRight' : this.freeze.row ? 'bottomLeft' : 'topRight'}" state="frozen"/>`
        : '',
      cols = this.widths.size
        ? `<cols>${[...this.widths.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([c, w]) => `<col min="${c + 1}" max="${c + 1}" width="${w}" customWidth="1"/>`)
            .join('')}</cols>`
        : '',
      merges = this.merges.length
        ? `<mergeCells count="${this.merges.length}">${this.merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`
        : '',
      validations = this.validations.length
        ? `<dataValidations count="${this.validations.length}">${this.validations
            .map(
              v =>
                `<dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="${v.range}"><formula1>${xml(Array.isArray(v.list) ? `"${v.list.join(',')}"` : v.list)}</formula1></dataValidation>`,
            )
            .join('')}</dataValidations>`
        : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${this.tab ? `<sheetPr><tabColor rgb="${this.tab}"/></sheetPr>` : ''}<sheetViews><sheetView workbookViewId="0" showGridLines="0">${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${body}</sheetData>${merges}${validations}</worksheet>`;
  }
}

export class Workbook {
  constructor() {
    this.styles = new Styles();
    this.sheets = [];
    this.names = [];
    this.hidden = new Set();
  }
  sheet(name) {
    if (this.sheets.some(s => s.name === name)) throw new Error('Duplicate sheet: ' + name);
    const s = new Sheet(name, this.styles);
    this.sheets.push(s);
    return s;
  }
  // Workbook-level defined name pointing at a sheet range.
  define(name, sheet, ref) {
    this.names.push({ name, ref: sheetRef(sheet, ref) });
  }
  files() {
    const sheets = this.sheets;
    return {
      '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
      '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${sheets.map((s, i) => `<sheet name="${xml(s.name)}" sheetId="${i + 1}"${this.hidden.has(s.name) ? ' state="hidden"' : ''} r:id="rId${i + 1}"/>`).join('')}</sheets>${this.names.length ? `<definedNames>${this.names.map(n => `<definedName name="${n.name}">${xml(n.ref)}</definedName>`).join('')}</definedNames>` : ''}<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`,
      'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
      'xl/styles.xml': this.styles.xml(),
      ...Object.fromEntries(sheets.map((s, i) => [`xl/worksheets/sheet${i + 1}.xml`, s.xml()])),
    };
  }
  // Zip bytes (deflate when the platform supports it, otherwise stored).
  async toBytes() {
    return zip(this.files());
  }
}

// ---- zip ----
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = bytes => {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
async function deflate(bytes) {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}
export async function zip(files) {
  const enc = new TextEncoder(),
    parts = [],
    central = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const data = typeof content === 'string' ? enc.encode(content) : content,
      packed = await deflate(data),
      method = packed && packed.length < data.length ? 8 : 0,
      body = method ? packed : data,
      nameBytes = enc.encode(name),
      crc = crc32(data),
      local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint16(8, method, true);
    local.setUint16(10, 0, true);
    local.setUint16(12, 0x21, true); // 1980-01-01
    local.setUint32(14, crc, true);
    local.setUint32(18, body.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true);
    parts.push(new Uint8Array(local.buffer), nameBytes, body);
    const dir = new DataView(new ArrayBuffer(46));
    dir.setUint32(0, 0x02014b50, true);
    dir.setUint16(4, 20, true);
    dir.setUint16(6, 20, true);
    dir.setUint16(8, 0x0800, true);
    dir.setUint16(10, method, true);
    dir.setUint16(12, 0, true);
    dir.setUint16(14, 0x21, true);
    dir.setUint32(16, crc, true);
    dir.setUint32(20, body.length, true);
    dir.setUint32(24, data.length, true);
    dir.setUint16(28, nameBytes.length, true);
    dir.setUint32(42, offset, true);
    central.push(new Uint8Array(dir.buffer), nameBytes);
    offset += 30 + nameBytes.length + body.length;
  }
  const dirSize = central.reduce((v, p) => v + p.length, 0),
    end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, Object.keys(files).length, true);
  end.setUint16(10, Object.keys(files).length, true);
  end.setUint32(12, dirSize, true);
  end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)],
    out = new Uint8Array(all.reduce((v, p) => v + p.length, 0));
  let at = 0;
  for (const p of all) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
