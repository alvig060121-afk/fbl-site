/* Errors every transport throws, so components can react the same way to the mock and to the real API. */
export class ApiError extends Error {
  constructor(message, { status = 0, code = 'api_error', cause } = {}) {
    super(message, { cause });
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/* The resource does not exist (HTTP 404), e.g. an unknown shipment number. */
export class NotFoundError extends ApiError {
  constructor(message = 'Not found', opts = {}) {
    super(message, { status: 404, code: 'not_found', ...opts });
    this.name = 'NotFoundError';
  }
}

/* The API could not be reached: offline, DNS, CORS, timeout, backend down. */
export class NetworkError extends ApiError {
  constructor(message = 'Network error', opts = {}) {
    super(message, { code: 'network', ...opts });
    this.name = 'NetworkError';
  }
}

/* Input rejected before any request was made. `code` says why: 'empty', 'format'. */
export class ValidationError extends ApiError {
  constructor(code, message = 'Invalid input') {
    super(message, { status: 400, code });
    this.name = 'ValidationError';
  }
}

export const isAbort = err => err && err.name === 'AbortError';
