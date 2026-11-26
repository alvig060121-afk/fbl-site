/* Cargo calculator (volume, weight, density, chargeable weight). Works on any page with
   [data-calc]; the page language comes from <html lang>.

   Formulas (also explained on the page, with sources):
     volume, m³          = Σ L×W×H (cm) × qty / 1 000 000
     air volumetric, kg  = Σ L×W×H (cm) × qty / 6000   (IATA standard for air cargo)
     express volumetric  = Σ L×W×H (cm) × qty / 5000   (international express couriers)
     chargeable weight   = max(actual, volumetric)
     sea LCL, W/M        = max(volume m³, weight t)   (1 m³ is billed like 1 t)
   No prices: the result goes to the request form, where a manager quotes the route.
*/
const AIR_DIVISOR = 6000;
const EXPRESS_DIVISOR = 5000;
const CM3_PER_M3 = 1_000_000;
const KG_PER_T = 1000;
const MAX_ROWS = 20;
const LIMITS = { len: 1000, wid: 1000, hei: 1000, kg: 100_000, qty: 100_000 };
const FIELDS = ['len', 'wid', 'hei', 'kg', 'qty'];
const SUMMARY_MARK = '—';   // first character of the block the calculator writes into the request form

const TEXT = {
  ru: {
    row: n => `Коробки ${n}`,
    remove: n => `Удалить коробки ${n}`,
    labels: { len: 'Длина, см', wid: 'Ширина, см', hei: 'Высота, см', kg: 'Вес 1 коробки, кг', qty: 'Количество, шт' },
    bad: 'Введите число больше нуля',
    big: max => `Не больше ${max}`,
    empty: 'Заполните размеры, вес и количество хотя бы в одной строке: результат появится сразу.',
    summaryHead: 'Расчёт груза с калькулятора FBL',
    sumLine: (n, r) => `${n}) ${r.len}×${r.wid}×${r.hei} см, ${r.kg} кг, ${r.qty} шт`,
    sumTotals: v => [
      `Коробок: ${v.boxes}`, `Объём: ${v.volume} м³`, `Вес: ${v.weight} кг`, `Плотность: ${v.density} кг/м³`,
      `Авиа, оплачиваемый вес: ${v.air} кг`, `Море сборным грузом: ${v.sea} W/M`,
    ],
  },
  en: {
    row: n => `Boxes ${n}`,
    remove: n => `Remove boxes ${n}`,
    labels: { len: 'Length, cm', wid: 'Width, cm', hei: 'Height, cm', kg: 'Weight per box, kg', qty: 'Quantity' },
    bad: 'Enter a number above zero',
    big: max => `${max} at most`,
    empty: 'Fill in the size, weight and quantity in at least one row: the result appears at once.',
    summaryHead: 'Cargo estimate from the FBL calculator',
    sumLine: (n, r) => `${n}) ${r.len}×${r.wid}×${r.hei} cm, ${r.kg} kg, ${r.qty} pcs`,
    sumTotals: v => [
      `Boxes: ${v.boxes}`, `Volume: ${v.volume} m³`, `Weight: ${v.weight} kg`, `Density: ${v.density} kg/m³`,
      `Air chargeable weight: ${v.air} kg`, `Sea LCL: ${v.sea} W/M`,
    ],
  },
};

/** @param {string} raw @returns {number} NaN when the text is not a plain positive decimal */
function parseNum(raw) {
  const s = raw.trim().replace(/\s/g, '').replace(',', '.');
  return /^\d*\.?\d+$/.test(s) ? Number(s) : NaN;
}

/**
 * Totals for complete rows. Pure: plain rows in, a new object out.
 * @param {{len:number,wid:number,hei:number,kg:number,qty:number}[]} rows
 */
export function computeTotals(rows) {
  const cm3 = rows.reduce((s, r) => s + r.len * r.wid * r.hei * r.qty, 0);
  const weight = rows.reduce((s, r) => s + r.kg * r.qty, 0);
  const boxes = rows.reduce((s, r) => s + r.qty, 0);
  const volume = cm3 / CM3_PER_M3;
  const airVol = cm3 / AIR_DIVISOR;
  const expVol = cm3 / EXPRESS_DIVISOR;
  return {
    boxes, volume, weight,
    density: volume > 0 ? weight / volume : 0,
    airVol, air: Math.max(weight, airVol), airBy: airVol > weight ? 'volume' : 'weight',
    expVol, express: Math.max(weight, expVol),
    sea: Math.max(volume, weight / KG_PER_T), seaBy: volume >= weight / KG_PER_T ? 'volume' : 'weight',
  };
}

function rowMarkup(t, uid) {
  const fields = FIELDS.map(k => {
    const id = `calc-${k}-${uid}`;
    return `<div class="calc__f"><label for="${id}">${t.labels[k]}</label>`
      + `<input id="${id}" data-k="${k}" type="text" inputmode="${k === 'qty' ? 'numeric' : 'decimal'}" autocomplete="off" aria-describedby="${id}-err">`
      + `<p class="calc__err" id="${id}-err" hidden></p></div>`;
  }).join('');
  return `<legend class="calc__no"></legend>${fields}`
    + `<button class="calc__del" type="button" data-calc-del><span aria-hidden="true">×</span></button>`;
}

export function initCalculator() {
  const root = document.querySelector('[data-calc]');
  if (!root) return;
  const lang = document.documentElement.lang === 'en' ? 'en' : 'ru';
  const t = TEXT[lang];
  const rowsBox = root.querySelector('[data-calc-rows]');
  const addBtn = root.querySelector('[data-calc-add]');
  const out = root.querySelector('[data-calc-out]');
  const emptyNote = root.querySelector('[data-calc-empty]');
  const toRequest = root.querySelector('[data-calc-request]');
  if (!rowsBox || !addBtn || !out || !emptyNote || !toRequest) {
    console.error('[fbl] calculator: markup is incomplete');
    return;
  }
  const fmt = (n, digits) => new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ru-RU',
    { maximumFractionDigits: digits }).format(n);
  let uid = 0;
  let lastSummary = '';

  const renumber = () => {
    const rows = [...rowsBox.children];
    rows.forEach((row, i) => {
      row.querySelector('.calc__no').textContent = t.row(i + 1);
      const del = row.querySelector('[data-calc-del]');
      del.setAttribute('aria-label', t.remove(i + 1));
      del.hidden = rows.length === 1;
    });
    addBtn.hidden = rows.length >= MAX_ROWS;
  };

  const addRow = () => {
    uid += 1;
    const row = document.createElement('fieldset');
    row.className = 'calc__row';
    row.innerHTML = rowMarkup(t, uid);
    rowsBox.appendChild(row);
    renumber();
    return row;
  };

  // A field's verdict: a number, null for blank, or an error message.
  const check = input => {
    if (!input.value.trim()) return { value: null, error: '' };
    const n = parseNum(input.value);
    const k = input.dataset.k;
    if (!(n > 0) || (k === 'qty' && !Number.isInteger(n))) return { value: null, error: t.bad };
    if (n > LIMITS[k]) return { value: null, error: t.big(fmt(LIMITS[k], 0)) };
    return { value: n, error: '' };
  };

  const readRows = () => [...rowsBox.children].flatMap(row => {
    const inputs = [...row.querySelectorAll('input')];
    const verdicts = inputs.map(check);
    inputs.forEach((input, i) => {
      const err = input.parentElement.querySelector('.calc__err');
      err.textContent = verdicts[i].error;
      err.hidden = !verdicts[i].error;
      input.toggleAttribute('aria-invalid', Boolean(verdicts[i].error));
    });
    if (verdicts.some(v => v.value === null)) return [];
    return [Object.fromEntries(FIELDS.map((k, i) => [k, verdicts[i].value]))];
  });

  const update = () => {
    const rows = readRows();
    const ready = rows.length > 0;
    out.hidden = !ready;
    emptyNote.hidden = ready;
    toRequest.hidden = !ready;
    if (!ready) { lastSummary = ''; return; }
    const v = computeTotals(rows);
    const shown = {
      boxes: fmt(v.boxes, 0), volume: fmt(v.volume, 3), weight: fmt(v.weight, 1), density: fmt(v.density, 0),
      airVol: fmt(v.airVol, 1), air: fmt(v.air, 1), expVol: fmt(v.expVol, 1), express: fmt(v.express, 1),
      sea: fmt(v.sea, 3),
    };
    Object.entries(shown).forEach(([k, s]) => { out.querySelector(`[data-v="${k}"]`).textContent = s; });
    out.querySelectorAll('[data-air-by]').forEach(el => { el.hidden = el.dataset.airBy !== v.airBy; });
    out.querySelectorAll('[data-sea-by]').forEach(el => { el.hidden = el.dataset.seaBy !== v.seaBy; });
    lastSummary = [`${SUMMARY_MARK} ${t.summaryHead}`,
      ...rows.map((r, i) => t.sumLine(i + 1, Object.fromEntries(FIELDS.map(k => [k, fmt(r[k], 3)])))),
      ...t.sumTotals(shown)].join('\n');
  };

  rowsBox.addEventListener('input', update);
  rowsBox.addEventListener('click', e => {
    const del = e.target.closest('[data-calc-del]');
    if (!del) return;
    const row = del.closest('.calc__row');
    const next = row.nextElementSibling || row.previousElementSibling;
    row.remove();
    renumber();
    update();
    next?.querySelector('input')?.focus();
  });
  addBtn.addEventListener('click', () => addRow().querySelector('input').focus());

  // Hands the estimate to the request form; the link itself scrolls there and picks the task.
  // A previous estimate in the field is replaced, the visitor's own text is kept.
  toRequest.addEventListener('click', () => {
    const details = document.querySelector('#request textarea[name="details"]');
    if (!details || !lastSummary) return;
    const own = details.value.startsWith(SUMMARY_MARK) ? '' : details.value.split(`\n\n${SUMMARY_MARK} `)[0].trimEnd();
    details.value = (own ? `${own}\n\n` : '') + lastSummary;
    details.dispatchEvent(new Event('input', { bubbles: true }));
  });

  addRow();
  update();
}
