/* Transport for the real FBL API (see docs/api/openapi.yaml). JSON in, JSON out, errors normalised. */
import { ApiError, NetworkError, NotFoundError } from './errors.js';

export function createHttpTransport({ baseUrl, timeoutMs = 10000, fetchImpl = globalThis.fetch }) {
  const base = String(baseUrl).replace(/\/+$/, '');

  async function request(method, path, { body, signal } = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(new DOMException('Timeout', 'TimeoutError')), timeoutMs);
    const relay = () => ctrl.abort(signal.reason);
    signal?.addEventListener('abort', relay, { once: true });

    let res;
    try {
      res = await fetchImpl(base + path, {
        method,
        headers: { Accept: 'application/json', ...(body !== undefined && { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'same-origin',
        signal: ctrl.signal,
      });
    } catch (err) {
      if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
      throw new NetworkError(err?.name === 'TimeoutError' ? 'Request timed out' : 'API unreachable', { cause: err });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', relay);
    }

    // The FBL API answers "not found" with a JSON body. A 404 without JSON means the API itself is
    // missing (e.g. a static host before the backend exists) — that is an outage, not an unknown number.
    if (res.status === 404) {
      if ((res.headers.get('Content-Type') || '').includes('application/json')) throw new NotFoundError();
      throw new ApiError('API endpoint not found', { status: 404, code: 'no_api' });
    }
    if (!res.ok) throw new ApiError(`HTTP ${res.status}`, { status: res.status });
    if (res.status === 204) return null;
    try {
      return await res.json();
    } catch (err) {
      throw new ApiError('Malformed JSON from API', { status: res.status, code: 'bad_response', cause: err });
    }
  }

  return {
    kind: 'http',
    get: (path, opts) => request('GET', path, opts),
    post: (path, body, opts) => request('POST', path, { ...opts, body }),
  };
}
