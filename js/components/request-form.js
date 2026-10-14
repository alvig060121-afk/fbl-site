/* Request form: five required fields with a clear message under each, task pre-selection from any
   [data-task-link] or ?task=, and hand-off through the lead service (messenger today, FBL API later). */
import { $, $$ } from '../core/dom.js';
import { leads } from '../services/index.js';
import { getSessionId } from '../core/session.js';

// Label shown in the summary and the check for every required field, in form order.
const RULES = [
  { key: 'name', label: 'Имя', empty: 'Заполните поле «Имя».' },
  { key: 'phone', label: 'Телефон', empty: 'Заполните поле «Телефон».',
    bad: 'Проверьте номер: в нём должно быть не меньше 7 цифр.',
    ok: v => v.replace(/\D/g, '').length >= 7 },
  { key: 'email', label: 'Email', empty: 'Заполните поле «Email».',
    bad: 'Проверьте email: он должен быть вида name@example.com.',
    ok: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) },
  { key: 'country', label: 'Страна', empty: 'Укажите страну.' },
  { key: 'task', label: 'Что нужно сделать', empty: 'Выберите, что нужно сделать.' },
  { key: 'details', label: 'Ссылка на товар / фото / ТЗ или описание задачи',
    empty: 'Вставьте ссылку на товар или опишите задачу.' },
];

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const t = document.createElement('textarea');
    t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch {}
    t.remove(); return ok;
  }
}

export function initRequestForm() {
  const form = $('[data-form]');
  if (!form) return;
  const sent = $('[data-sent]');
  const sentOk = $('[data-sent-ok]');
  const copyBox = $('[data-copy-box]', sent);
  const sentTitle = $('.sent__t', sent);
  const sentDesc = $('.sent__d', sent);
  const sentDefaults = { title: sentTitle.textContent, desc: sentDesc.textContent };
  const taskInputs = $$('input[name="task"]', form);
  const summary = $('[data-err="summary"]', form);
  const err = k => $(`[data-err="${k}"]`, form);
  const field = n => form.elements.namedItem(n);
  const selectedTasks = () => taskInputs.filter(t => t.checked).map(t => t.value);
  const value = k => k === 'task' ? selectedTasks() : field(k).value.trim();

  const setError = (k, text) => {
    const box = err(k);
    box.textContent = text || '';
    box.hidden = !text;
    if (k === 'task') return;
    field(k).closest('.field').classList.toggle('is-bad', !!text);
    if (text) field(k).setAttribute('aria-invalid', 'true'); else field(k).removeAttribute('aria-invalid');
  };
  // Open problems by field key; the summary above the button always lists what is still missing.
  const problems = new Map();
  const renderSummary = () => {
    const list = RULES.filter(r => problems.has(r.key));
    summary.hidden = !list.length;
    if (!list.length) return;
    const allEmpty = list.every(r => problems.get(r.key) === 'empty');
    const names = list.map(r => `«${r.label}»`).join(', ');
    summary.textContent = list.length === 1
      ? `${allEmpty ? 'Заполните' : 'Проверьте'} поле ${names}.`
      : `${allEmpty ? 'Заполните обязательные поля' : 'Проверьте поля'}: ${names}.`;
  };
  const clearError = k => {
    setError(k, '');
    if (problems.delete(k)) renderSummary();
  };

  const showForm = () => { sent.hidden = true; sentOk.hidden = true; form.hidden = false; };
  const showThanks = viaTelegram => {
    form.hidden = true; sent.hidden = true;
    $('[data-tg-note]', sentOk).hidden = !viaTelegram;
    sentOk.hidden = false;
    sentOk.focus();
  };
  const pickTask = task => {
    // Adds to the selection rather than replacing it: several tasks can be picked now.
    const r = task && taskInputs.find(x => x.value === task);
    if (r) { r.checked = true; clearError('task'); }
  };

  $('.form__submit', form).disabled = false;   // disabled in the markup until this script runs
  pickTask(new URLSearchParams(location.search).get('task'));

  $$('[data-task-link]').forEach(a => a.addEventListener('click', () => {
    if (!sentOk.hidden) form.reset();          // a request was already sent: start a clean one
    if (form.hidden) showForm();
    pickTask(a.dataset.taskLink);
  }));
  taskInputs.forEach(t => t.addEventListener('change', () => clearError('task')));
  ['name', 'phone', 'email', 'country', 'details'].forEach(k => field(k).addEventListener('input', () => clearError(k)));

  let message = '';
  let telegramUrl = '';
  form.addEventListener('submit', async e => {
    e.preventDefault();
    problems.clear();
    RULES.forEach(rule => {
      const v = value(rule.key);
      const empty = Array.isArray(v) ? v.length === 0 : !v;
      const kind = empty ? 'empty' : rule.ok && !rule.ok(v) ? 'bad' : '';
      setError(rule.key, kind && rule[kind]);
      if (kind) problems.set(rule.key, kind);
    });
    renderSummary();
    if (problems.size) {
      const first = problems.keys().next().value;
      (first === 'task' ? taskInputs[0] : field(first)).focus();
      return;
    }

    const submit = $('.form__submit', form);
    submit.disabled = true;
    const result = await leads.submit({
      tasks: value('task'),
      name: value('name'),
      phone: value('phone'),
      email: value('email'),
      company: value('company'),
      country: value('country'),
      details: value('details'),
      sessionId: getSessionId(),
      website: field('website').value,
    });
    submit.disabled = false;

    if (result.via === 'api') { showThanks(false); return; }
    // 'error': the CRM was supposed to receive this and didn't confirm a lead — say so plainly,
    // never with the normal «Заявка готова» wording (prompt §5). 'messenger': no CRM on this
    // deployment, sending through a messenger is the intended path, not a failure.
    sentTitle.textContent = result.via === 'error' ? 'Не удалось отправить автоматически' : sentDefaults.title;
    sentDesc.textContent = result.via === 'error'
      ? 'Заявка не дошла до нашей системы. Отправьте её вручную в мессенджер — мы получим текст и ответим.'
      : sentDefaults.desc;
    message = result.message;
    telegramUrl = result.telegramUrl;
    $('[data-send-wa]', sent).href = result.whatsappUrl;
    copyBox.hidden = true;
    form.hidden = true;
    sent.hidden = false;
    sent.focus();
  });

  // Let the link open the chat first, then swap the panel.
  $('[data-send-wa]', sent).addEventListener('click', () => setTimeout(() => showThanks(false), 0));
  $('[data-send-tg]', sent).addEventListener('click', async () => {
    // Start the copy and open the chat synchronously inside the click, or Safari blocks the new tab.
    const copied = copyText(message);
    window.open(telegramUrl, '_blank', 'noopener');
    if (await copied) { showThanks(true); return; }
    // The browser refused the clipboard: keep this panel and hand over the text to copy by hand.
    const box = $('[data-copy-text]', copyBox);
    box.value = message;
    copyBox.hidden = false;
    box.focus();
    box.select();
  });
  $('[data-edit]', sent).addEventListener('click', () => {
    showForm();
    field('name').focus();
  });
  $('[data-new]', sentOk).addEventListener('click', () => {
    form.reset();
    showForm();
    field('name').focus();
  });
}
