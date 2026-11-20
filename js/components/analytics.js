/* Yandex Metrika: loads the counter only when config.analytics.yandexMetrikaId is set,
   and reports the key actions as goals (create goals of type "JavaScript event" with
   these identifiers in Metrika):

     request_click   — a link or button that leads to the request form (#request)
     request_submit  — the request form was submitted
     whatsapp        — a WhatsApp link (wa.me)
     telegram        — a Telegram link (t.me)
     catalog_pdf     — a PDF catalog was opened or downloaded

   No counter id — this file does nothing: no script, no cookies.
*/
import { config } from '../config.js';

const TAG_URL = 'https://mc.yandex.ru/metrika/tag.js';

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
  loadTag(id);
  const reach = goal => window.ym(id, 'reachGoal', goal);

  document.addEventListener('click', e => {
    const link = e.target.closest?.('a[href]');
    if (!link) return;
    const goal = goalForLink(link);
    if (goal) reach(goal);
  }, { capture: true });

  document.addEventListener('submit', e => {
    if (e.target.closest?.('#request, .req')) reach('request_submit');
  }, { capture: true });
}
