/* "Отследить груз": form → tracking service → one of four views (loading, result, not found, error).
   Everything shown about a shipment comes from the service; nothing is hard-coded here. */
import { $, h, icon } from '../core/dom.js';
import { config, isMockApi } from '../config.js';
import { tracking } from '../services/index.js';
import { validateNumber } from '../services/tracking.js';
import { NotFoundError, ValidationError, isAbort } from '../api/errors.js';

const fmtDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtShort = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
const fmtStamp = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

const DEMO_EXAMPLES = ['FBL-DEMO-1001', 'FBL-DEMO-1002', 'FBL-DEMO-1003'];

const managerLink = () => h('a', {
  class: 'chip', href: `https://wa.me/${config.contacts.whatsapp}`, target: '_blank', rel: 'noopener',
}, icon('i-wa'), 'Написать менеджеру');

function loadingView() {
  return h('div', { class: 'ship ship--loading', 'aria-busy': 'true' },
    h('p', { class: 'sr-only', text: 'Ищем груз…' }),
    h('div', { class: 'skel skel--title' }),
    h('div', { class: 'skel skel--line' }),
    h('div', { class: 'skel-row' }, h('div', { class: 'skel' }), h('div', { class: 'skel' }), h('div', { class: 'skel' })));
}

function noticeView({ tone, title, text, actions = [] }) {
  return h('div', { class: `notice notice--${tone}`, role: tone === 'error' ? 'alert' : null },
    h('p', { class: 'notice__t', text: title }),
    h('p', { class: 'notice__d', text }),
    actions.length ? h('div', { class: 'notice__act' }, actions) : null);
}

function resultView(s) {
  const meta = [
    ['Дата отправки', s.shippedAt ? fmtDate.format(s.shippedAt) : 'Ещё не отправлен'],
    ['Текущий этап', s.currentStage],
    ['Обновлено', s.updatedAt ? fmtStamp.format(s.updatedAt) : '—'],
  ];
  return h('article', { class: 'ship', 'aria-label': `Груз ${s.number}` },
    h('header', { class: 'ship__top' },
      h('div', null,
        h('p', { class: 'ship__k', text: 'Номер груза' }),
        h('p', { class: 'ship__no', text: s.number })),
      h('span', { class: `badge badge--${s.status.tone}`, text: s.status.label })),
    h('div', { class: 'ship__route' },
      h('div', { class: 'ship__pt' },
        h('span', { class: 'ship__k', text: 'Откуда' }),
        h('strong', { text: s.route.origin })),
      h('div', { class: 'ship__line', 'aria-hidden': 'true' },
        s.route.mode ? h('span', { text: s.route.mode }) : null),
      h('div', { class: 'ship__pt ship__pt--end' },
        h('span', { class: 'ship__k', text: 'Куда' }),
        h('strong', { text: s.route.destination }))),
    s.stages.length ? h('ol', { class: 'stages', style: `--n:${s.stages.length}`, 'aria-label': 'Этапы доставки' },
      s.stages.map(st => h('li', { class: `stage is-${st.state}`, 'aria-current': st.state === 'current' ? 'step' : null },
        h('span', { class: 'stage__dot', 'aria-hidden': 'true' }),
        h('span', { class: 'stage__t', text: st.label }),
        st.at ? h('span', { class: 'stage__at', text: fmtShort.format(st.at) }) : null))) : null,
    h('dl', { class: 'ship__meta' },
      meta.map(([k, v]) => h('div', null, h('dt', { text: k }), h('dd', { text: v })))));
}

export function initTracking() {
  const root = $('[data-tracking]');
  if (!root) return;
  const form = $('[data-track-form]', root);
  const input = form.elements.namedItem('number');
  const button = $('button[type="submit"]', form);
  const fieldErr = $('[data-track-err]', root);
  const out = $('[data-track-out]', root);
  let ctrl = null;

  const render = view => { out.replaceChildren(...(view ? [view] : [])); };
  const setFieldError = text => {
    fieldErr.textContent = text;
    fieldErr.hidden = !text;
    input.setAttribute('aria-invalid', text ? 'true' : 'false');
  };
  // aria-disabled, not disabled: a disabled button would drop keyboard focus to <body>.
  let busy = false;
  const setBusy = on => {
    busy = on;
    button.setAttribute('aria-disabled', String(on));
    button.classList.toggle('is-busy', on);
    out.setAttribute('aria-busy', String(on));
  };

  const validationText = code => code === 'empty'
    ? 'Введите номер груза.'
    : 'Проверьте номер: латинские буквы, цифры и дефис, от 3 до 40 символов.';

  async function run() {
    ctrl?.abort();
    let number;
    try { number = validateNumber(input.value); }
    catch (err) {
      setBusy(false);
      render(null);
      setFieldError(validationText(err.code));
      input.focus();
      return;
    }
    ctrl = new AbortController();
    const { signal } = ctrl;
    setFieldError('');
    setBusy(true);
    render(loadingView());
    try {
      const shipment = await tracking.track(number, { signal });
      render(resultView(shipment));
    } catch (err) {
      if (isAbort(err) || signal.aborted) return;
      if (err instanceof ValidationError) {
        render(null);
        setFieldError(validationText(err.code));
        input.focus();
      } else if (err instanceof NotFoundError) {
        render(noticeView({
          tone: 'empty',
          title: 'Груз не найден',
          text: `Номера ${number} нет в системе. Проверьте номер или напишите менеджеру — уточним статус вручную.`,
          actions: [managerLink()],
        }));
      } else {
        console.warn('[tracking] service error', err);
        render(noticeView({
          tone: 'error',
          title: 'Сервис отслеживания временно недоступен',
          text: 'Попробуйте ещё раз через несколько минут или узнайте статус у менеджера.',
          actions: [
            h('button', { class: 'btn btn--line btn--sm', type: 'button', onclick: run, text: 'Повторить' }),
            managerLink(),
          ],
        }));
      }
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  }

  form.addEventListener('submit', e => { e.preventDefault(); if (!busy) run(); });
  input.addEventListener('input', () => { if (!fieldErr.hidden) setFieldError(''); });

  const demo = $('[data-track-demo]', root);
  if (demo && isMockApi && config.tracking.showDemoHint) {
    demo.replaceChildren(
      'Сейчас отслеживание работает на демонстрационных данных. Попробуйте номер ',
      ...DEMO_EXAMPLES.flatMap((n, i) => [
        i ? ', ' : '',
        h('button', { type: 'button', class: 'track__ex', text: n, onclick: () => { input.value = n; run(); } }),
      ]),
      '.');
    demo.hidden = false;
  }
}
