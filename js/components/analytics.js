/* Yandex Metrika: loads the counter only when config.analytics.yandexMetrikaId is set,
   and reports the key actions as goals (create goals of type "JavaScript event" with
   these identifiers in Metrika):

     request_click   — a link or button that leads to the request form (#request)
     request_submit  — the request form was submitted and passed validation
     whatsapp        — a WhatsApp link (wa.me)
     telegram        — a Telegram link (t.me)
     catalog_pdf     — a PDF catalog was opened or downloaded

   No counter id — this file does nothing: no script, no cookies.
   With a counter id Metrika starts on page load (owner's decision, 26.11.2026) and a notice
   explains it with an «Отключить» button. Choosing «Отключить» stops data collection at once
   (window.disableYaCounter<id>) and Metrika is not loaded on later visits.
   The choice is kept in localStorage; any [data-cookie-settings] button reopens the notice.
*/
import { config } from '../config.js';

const TAG_URL = 'https://mc.yandex.ru/metrika/tag.js';
const CONSENT_KEY = 'fbl-analytics-consent';   // 'yes' (notice seen) | 'no' (switched off)
const TEXT = {
  ru: { on: 'Мы используем cookies и Яндекс Метрику, чтобы понимать, как посетители пользуются сайтом. Если вы против, нажмите «Отключить».',
        off: 'Яндекс Метрика на этом сайте для вас отключена. Её можно снова включить.',
        more: 'Политика конфиденциальности', ok: 'Понятно', disable: 'Отключить',
        enable: 'Включить', keepOff: 'Оставить выключенной', href: '/privacy/' },
  en: { on: 'We use cookies and Yandex Metrica to understand how visitors use the site. If you object, click “Turn off”.',
        off: 'Yandex Metrica is turned off for you on this site. You can turn it back on.',
        more: 'Privacy policy', ok: 'OK', disable: 'Turn off',
        enable: 'Turn on', keepOff: 'Keep it off', href: '/en/privacy/' },
};
const STYLE = `.cookie{position:fixed;left:16px;right:16px;bottom:16px;z-index:60;max-width:560px;margin:0 auto;padding:18px 20px;border-radius:16px;background:#0E1B3D;color:#fff;box-shadow:0 12px 40px rgba(14,27,61,.28);font-size:15px;line-height:1.5}
.cookie p{margin:0 0 12px}.cookie a{color:#fff;text-decoration:underline}
.cookie__btns{display:flex;gap:10px;flex-wrap:wrap}.cookie button{font:inherit;font-weight:600;padding:10px 18px;border-radius:999px;border:1px solid rgba(255,255,255,.5);background:transparent;color:#fff;cursor:pointer}
.cookie button[data-yes]{background:#2F6BE8;border-color:#2F6BE8}
.ftr__cookie{margin-left:12px;padding:0;border:0;background:none;color:inherit;font:inherit;text-decoration:underline;cursor:pointer}`;

function readConsent() {
  try { return localStorage.getItem(CONSENT_KEY); } catch { return null; }
}

function saveConsent(value) {
  try { localStorage.setItem(CONSENT_KEY, value); } catch { /* private mode: ask again next time */ }
}

function addStyle() {
  if (document.getElementById('cookie-style')) return;
  const st = document.createElement('style');
  st.id = 'cookie-style';
  st.textContent = STYLE;
  document.head.appendChild(st);
}

/**
 * The cookie notice. While Metrika is on it offers «Понятно» / «Отключить»;
 * while it is off, «Включить» / «Оставить выключенной».
 * @param {boolean} isOn
 * @param {(on: boolean) => void} onChoice  true = Metrika on, false = off
 */
function showNotice(isOn, onChoice) {
  document.querySelector('.cookie')?.remove();
  const t = TEXT[document.documentElement.lang === 'en' ? 'en' : 'ru'];
  addStyle();
  const box = document.createElement('div');
  box.className = 'cookie';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', t.more);
  const [first, second] = isOn ? [t.ok, t.disable] : [t.enable, t.keepOff];
  box.innerHTML = `<p>${isOn ? t.on : t.off} <a href="${t.href}">${t.more}</a></p>`
    + `<div class="cookie__btns"><button type="button" data-yes>${first}</button><button type="button" data-no>${second}</button></div>`;
  box.addEventListener('click', e => {
    const yes = e.target.closest('[data-yes]');
    const no = e.target.closest('[data-no]');
    if (!yes && !no) return;
    box.remove();
    // The first button always means "Metrika on" («Понятно» / «Включить»), the second "off".
    onChoice(Boolean(yes));
  });
  document.body.appendChild(box);
}

const GOALS = [
  ['whatsapp', a => /(^|\.)wa\.me$|whatsapp\.com$/.test(a.hostname)],
  ['telegram', a => /(^|\.)t\.me$|telegram\.(me|org)$/.test(a.hostname)],
  ['catalog_pdf', a => /\.pdf$/i.test(a.pathname)],
  ['request_click', a => a.hash === '#request'],
];

function loadTag(id) {
  window.ym = window.ym || function ym(...args) { (window.ym.a = window.ym.a || []).push(args); };
  window.ym.l = Date.now();
  const s = document.createElement('script');
  s.async = true;
  s.src = TAG_URL;
  s.onerror = () => console.error('[fbl] analytics: Metrika script failed to load');
  document.head.appendChild(s);
  window.ym(id, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });
}

function goalForLink(link) {
  for (const [goal, test] of GOALS) {
    if (test(link)) return goal;
  }
  return null;
}

export function initAnalytics() {
  const raw = config.analytics?.yandexMetrikaId;
  if (raw == null) return;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    console.error('[fbl] analytics: yandexMetrikaId must be a positive integer, got', raw);
    return;
  }
  addStyle();
  document.querySelectorAll('[data-cookie-settings]').forEach(b => { b.hidden = false; });
  const disableFlag = `disableYaCounter${id}`;   // Metrika stops sending data while this is true
  let started = false;
  let on = readConsent() !== 'no';
  const apply = () => {
    window[disableFlag] = !on;
    if (on && !started) {
      started = true;
      loadTag(id);
      bindGoals(id, () => on);
    }
  };
  const choose = value => {
    on = value;
    saveConsent(value ? 'yes' : 'no');
    apply();
  };
  document.addEventListener('click', e => {
    if (e.target.closest?.('[data-cookie-settings]')) showNotice(on, choose);
  });
  apply();
  if (readConsent() === null) showNotice(true, choose);
}

/** @param {number} id @param {() => boolean} isOn */
function bindGoals(id, isOn) {
  const reach = goal => { if (isOn()) window.ym(id, 'reachGoal', goal); };

  document.addEventListener('click', e => {
    const link = e.target.closest?.('a[href]');
    if (!link) return;
    const goal = goalForLink(link);
    if (goal) reach(goal);
  }, { capture: true });

  // Fired by request-form.js after validation, so a form with errors is not counted.
  document.addEventListener('fbl:request-valid', () => reach('request_submit'));
}
