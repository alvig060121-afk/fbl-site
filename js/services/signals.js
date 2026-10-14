/* Contact-click signals: sendBeacon to the CRM so a WhatsApp/Telegram/phone click on the site shows up
   in the lead's timeline even when the visitor never fills the form (docs/architecture.md §7, plan phase 2). */
import { getSessionId } from '../core/session.js';

const CHANNEL_BY_URL = [
  [/^https:\/\/wa\.me\//i, 'whatsapp'],
  [/^https:\/\/t\.me\//i, 'telegram'],
  [/^tel:/i, 'phone'],
];

export function channelForUrl(href) {
  return (CHANNEL_BY_URL.find(([re]) => re.test(href)) || [])[1] ?? null;
}

export function createSignalService({ baseUrl, sendBeacon = (...a) => navigator.sendBeacon(...a) }) {
  return {
    sendClick(channel) {
      const body = JSON.stringify({ type: 'contact_click', channel, page: location.pathname, sessionId: getSessionId() });
      // Best-effort: sendBeacon survives the tab switching to WhatsApp/Telegram right after the click;
      // a beacon that fails to queue (old Safari, disabled storage) must never block the visitor's click.
      try { sendBeacon(`${baseUrl}/events`, new Blob([body], { type: 'text/plain' })); } catch { /* ignored */ }
    },
  };
}
