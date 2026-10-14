// Display formatting shared by every view. Pure functions, no DOM access.
export const esc = v =>
  String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const money = v =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    notation: Math.abs(v) >= 1000000 ? 'compact' : 'standard',
  }).format(v);
export const short = v => {
  const sign = v < 0 && Math.round(Math.abs(v) / 1000) > 0 ? '−' : '',
    a = Math.abs(v);
  return sign + (a >= 1000000 ? '$' + (a / 1000000).toFixed(2) + 'M' : '$' + Math.round(a / 1000) + 'K');
};
// Axis labels drop trailing zeros: $2M, $2.5M, −$500K.
export const axisMoney = v => {
  const a = Math.abs(v),
    sign = v < 0 ? '−' : '';
  if (!a) return '$0';
  return sign + (a >= 1000000 ? '$' + +(a / 1000000).toFixed(2) + 'M' : '$' + Math.round(a / 1000) + 'K');
};
// Four to six evenly spaced round values covering [lo, hi].
export const niceTicks = (lo, hi) => {
  const rough = (hi - lo) / 4,
    mag = Math.pow(10, Math.floor(Math.log10(rough))),
    step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= rough),
    ticks = [];
  for (let v = Math.floor(lo / step) * step; v <= Math.ceil(hi / step) * step + step / 2; v += step)
    ticks.push(Math.round(v / step) * step);
  return ticks;
};
export const pct = v => (v === null ? 'N/A' : (v * 100).toFixed(1).replace('-', '−') + '%');
// Payback reads in months under two years, otherwise in years with months alongside.
export const duration = v => (v < 24 ? v.toFixed(1) + ' mo' : (v / 12).toFixed(1) + ' yrs (' + Math.round(v) + ' mo)');
export const pb = v => (v === null ? 'Beyond horizon' : duration(v));
export const irrShort = v => (v !== null && v > 1 ? '>100%' : pct(v));
export const unitMoney = v =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.abs(v) < 1 ? 3 : 2,
  }).format(v);
export const months = v => (v === Infinity ? 'Never' : +v.toFixed(1) + ' mo');
