/* Picks the transport. The mock module is loaded only when it is actually used. */
import { createHttpTransport } from './http.js';

export function createTransport(api) {
  if (api.mode === 'http') return createHttpTransport(api);

  let mock;
  const load = async () => (mock ??= (await import('./mock/transport.js')).createMockTransport(api));
  return {
    kind: 'mock',
    get: async (path, opts) => (await load()).get(path, opts),
    post: async (path, body, opts) => (await load()).post(path, body, opts),
  };
}
