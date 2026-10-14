/* A per-tab session id for tying a lead to the site_events sent before/after it (docs/architecture.md §7).
   sessionStorage, not localStorage: it must not become a persistent visitor id (owner decision, Б16). */
const KEY = 'fbl_session_id';

export function getSessionId() {
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null; // private mode / storage blocked: leads still work, just without session linkage
  }
}
