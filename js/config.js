/* Runtime settings. The page code never talks to a CRM directly: components call services,
   services call a transport, and the transport is chosen here.

   mode 'mock' — built-in demo data, no network. Used until the FBL API exists.
   mode 'http' — the FBL API at baseUrl (a backend that talks to the CRM and keeps its keys).

   A host can override any group without editing this file, before js/main.js loads:
     <script>window.FBL_CONFIG = { api: { mode: 'http', baseUrl: 'https://api.example.com/v1' } }</script>

   On localhost/127.0.0.1 the site talks to the local CRM (crm/, port 8130) directly, so the owner
   can test the whole "заявка → лид" path on one MacBook without any deploy (docs/architecture.md §7,
   plan 2026-09-22-crm-fbl-logistics.md). A published site is never on this hostname, so this never
   reaches a real visitor (Т9).
*/
const isLocalCrm = typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
const crmBaseUrl = isLocalCrm ? `http://${location.hostname}:8130/api/v1` : '/api/v1';

const defaults = {
  api: {
    mode: isLocalCrm ? 'http' : 'mock',
    baseUrl: crmBaseUrl,
    timeoutMs: 10000,
    mockLatencyMs: 700,
  },
  tracking: {
    // Tell visitors the tracker runs on demo data while the CRM is not connected.
    // Off for the published site: visitors should not see demo numbers.
    showDemoHint: false,
  },
  leads: {
    // 'messenger' — the request opens WhatsApp/Telegram with a ready text (works today).
    // 'api'       — POST /leads to the FBL API; falls back to the messenger if the API fails.
    channel: isLocalCrm ? 'api' : 'messenger',
  },
  contacts: {
    whatsapp: '79183083313',
    telegram: 'https://t.me/+79183083313',
    phone: '+7 918 308-33-13',
  },
};

const overrides = (typeof window !== 'undefined' && window.FBL_CONFIG) || {};

export const config = Object.freeze(
  Object.fromEntries(Object.entries(defaults).map(([group, values]) =>
    [group, Object.freeze({ ...values, ...(overrides[group] || {}) })]))
);

export const isMockApi = config.api.mode !== 'http';
