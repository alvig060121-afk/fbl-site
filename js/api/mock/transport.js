/* In-browser stand-in for the FBL API. Same interface and the same errors as the http transport,
   so switching config.api.mode to 'http' changes nothing in services or components. */
import { ApiError, NotFoundError } from '../errors.js';
import { shipmentFixtures, DEMO_FAILURE_NUMBER } from './fixtures.js';

const wait = (ms, signal) => new Promise((resolve, reject) => {
  const t = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => {
    clearTimeout(t);
    reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
  }, { once: true });
});

const routes = [
  {
    method: 'GET',
    pattern: /^\/shipments\/([^/]+)$/,
    handle([number]) {
      const id = decodeURIComponent(number);
      if (id === DEMO_FAILURE_NUMBER) throw new ApiError('Mock: backend unavailable', { status: 503 });
      const shipment = shipmentFixtures()[id];
      if (!shipment) throw new NotFoundError();
      return shipment;
    },
  },
  {
    method: 'POST',
    pattern: /^\/leads$/,
    handle(_, body) {
      return { id: `demo-${Date.now().toString(36)}`, status: 'received', receivedAt: new Date().toISOString(), echo: body };
    },
  },
];

export function createMockTransport({ mockLatencyMs = 600 } = {}) {
  async function request(method, path, { body, signal } = {}) {
    await wait(mockLatencyMs, signal);
    const route = routes.find(r => r.method === method && r.pattern.test(path));
    if (!route) throw new NotFoundError(`Mock: no route for ${method} ${path}`);
    // Return a copy, as a network response would be.
    return structuredClone(route.handle(path.match(route.pattern).slice(1), body));
  }

  return {
    kind: 'mock',
    get: (path, opts) => request('GET', path, opts),
    post: (path, body, opts) => request('POST', path, { ...opts, body }),
  };
}
