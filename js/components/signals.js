/* Wires every WhatsApp / Telegram / phone link on the page to a contact-click signal.
   One delegated listener: new links (e.g. inside a component rendered after load) are covered for free. */
import { config, isMockApi } from '../config.js';
import { channelForUrl, createSignalService } from '../services/signals.js';

export function initSignals() {
  if (isMockApi) return; // no real CRM behind the site (production, or the local CRM is not running)
  const signals = createSignalService({ baseUrl: config.api.baseUrl });
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    const channel = a && channelForUrl(a.href);
    if (channel) signals.sendClick(channel);
  }, { capture: true });
}
