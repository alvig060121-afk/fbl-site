/* "Отследить груз": form → tracking service → one of four views (loading, result, not found, error).
   Everything shown about a shipment comes from the service; nothing is hard-coded here. */
import { $, h, icon } from '../core/dom.js';
import { config, isMockApi } from '../config.js';
import { tracking } from '../services/index.js';
import { validateNumber } from '../services/tracking.js';
import { NotFoundError, ValidationError, isAbort } from '../api/errors.js';
import { pick } from '../core/i18n.js';

const T = pick({
  ru: {
    locale: 'ru-RU', manager: 'Написать менеджеру', searching: 'Ищем груз…', shippedAt: 'Дата отправки',
    notShipped: 'Ещё не отправлен', stage: 'Текущий этап', updated: 'Обновлено', shipment: n => `Груз ${n}`,
    number: 'Номер груза', from: 'Откуда', to: 'Куда', stages: 'Этапы доставки',
    empty: 'Введите номер груза.', format: 'Проверьте номер: латинские буквы, цифры и дефис, от 3 до 40 символов.',
    notFound: 'Груз не найден',
    notFoundText: n => `Номера ${n} нет в системе. Проверьте номер или напишите менеджеру — уточним статус вручную.`,
    down: 'Сервис отслеживания временно недоступен',
    downText: 'Попробуйте ещё раз через несколько минут или узнайте статус у менеджера.', retry: 'Повторить',
    demo: 'Сейчас отслеживание работает на демонстрационных данных. Попробуйте номер ',
  },
  en: {
    locale: 'en-GB', manager: 'Message a manager', searching: 'Looking for the shipment…', shippedAt: 'Shipped on',
    notShipped: 'Not shipped yet', stage: 'Current stage', updated: 'Updated', shipment: n => `Shipment ${n}`,
    number: 'Shipment number', from: 'From', to: 'To', stages: 'Delivery stages',
    empty: 'Enter the shipment number.', format: 'Please check the number: Latin letters, digits and hyphens, 3 to 40 characters.',
    notFound: 'Shipment not found',
    notFoundText: n => `Number ${n} is not in our system. Check the number or message a manager — we will confirm the status manually.`,
    down: 'Tracking is temporarily unavailable',
    downText: 'Please try again in a few minutes or ask a manager for the status.', retry: 'Try again',
    demo: 'Tracking currently runs on demo data. Try number ',
  },
});

const fmtDate = new Intl.DateTimeFormat(T.locale, { day: 'numeric', month: 'long', year: 'numeric' });
const fmtShort = new Intl.DateTimeFormat(T.locale, { day: 'numeric', month: 'long' });
const fmtStamp = new Intl.DateTimeFormat(T.locale, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

const DEMO_EXAMPLES = ['FBL-DEMO-1001', 'FBL-DEMO-1002', 'FBL-DEMO-1003'];

const managerLink = () => h('a', {
  class: 'chip', href: `https://wa.me/${config.contacts.whatsapp}`, target: '_blank', rel: 'noopener',
}, icon('i-wa'), T.manager);

function loadingView() {
  return h('div', { class: 'ship ship--loading', 'aria-busy': 'true' },
    h('p', { class: 'sr-only', text: T.searching }),
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
    [T.shippedAt, s.shippedAt ? fmtDate.format(s.shippedAt) : T.notShipped],
    [T.stage, s.currentStage],
    [T.updated, s.updatedAt ? fmtStamp.format(s.updatedAt) : '—'],
  ];
  return h('article', { class: 'ship', 'aria-label': T.shipment(s.number) },
    h('header', { class: 'ship__top' },
      h('div', null,
        h('p', { class: 'ship__k', text: T.number }),
        h('p', { class: 'ship__no', text: s.number })),
      h('span', { class: `badge badge--${s.status.tone}`, text: s.status.label })),
    h('div', { class: 'ship__route' },
      h('div', { class: 'ship__pt' },
        h('span', { class: 'ship__k', text: T.from }),
        h('strong', { text: s.route.origin })),
      h('div', { class: 'ship__line', 'aria-hidden': 'true' },
        s.route.mode ? h('span', { text: s.route.mode }) : null),
      h('div', { class: 'ship__pt ship__pt--end' },
        h('span', { class: 'ship__k', text: T.to }),
        h('strong', { text: s.route.destination }))),
    s.stages.length ? h('ol', { class: 'stages', style: `--n:${s.stages.length}`, 'aria-label': T.stages },
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

  const validationText = code => code === 'empty' ? T.empty : T.format;

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
          title: T.notFound,
          text: T.notFoundText(number),
          actions: [managerLink()],
        }));
      } else {
        console.warn('[tracking] service error', err);
        render(noticeView({
          tone: 'error',
          title: T.down,
          text: T.downText,
          actions: [
            h('button', { class: 'btn btn--line btn--sm', type: 'button', onclick: run, text: T.retry }),
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
      T.demo,
      ...DEMO_EXAMPLES.flatMap((n, i) => [
        i ? ', ' : '',
        h('button', { type: 'button', class: 'track__ex', text: n, onclick: () => { input.value = n; run(); } }),
      ]),
      '.');
    demo.hidden = false;
  }
}
