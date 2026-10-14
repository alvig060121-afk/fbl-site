/* Tracking service: validates the number, asks the transport, and turns the API payload into
   the view model the tracker renders. Status wording and stages come from the API (CRM);
   the site only decides how a status looks. */
import { ApiError, ValidationError } from '../api/errors.js';

const NUMBER = /^[A-Z0-9][A-Z0-9\-\/.]{2,39}$/;

export const normalizeNumber = raw => String(raw ?? '').trim().toUpperCase().replace(/\s+/g, '');

/* Returns the normalised number or throws ValidationError('empty' | 'format'). */
export function validateNumber(raw) {
  const number = normalizeNumber(raw);
  if (!number) throw new ValidationError('empty');
  if (!NUMBER.test(number)) throw new ValidationError('format');
  return number;
}

/* Visual tone per status code; unknown codes from the CRM fall back to "progress". */
const TONES = {
  delivered: 'done',
  on_hold: 'warn',
  delayed: 'warn',
  problem: 'warn',
};

const toDate = v => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function toShipment(dto) {
  if (!dto || typeof dto.number !== 'string' || !dto.status) {
    throw new ApiError('Unexpected shipment payload', { code: 'bad_response' });
  }
  const stages = Array.isArray(dto.stages) ? dto.stages : [];
  const currentIndex = Math.max(0, stages.findIndex(s => s.id === dto.currentStageId));
  const finished = dto.status.code === 'delivered';

  return {
    number: dto.number,
    status: { code: dto.status.code, label: dto.status.label, tone: TONES[dto.status.code] || 'progress' },
    route: {
      origin: dto.route?.origin || '',
      destination: dto.route?.destination || '',
      mode: dto.route?.mode?.label || '',
    },
    shippedAt: toDate(dto.shippedAt),
    updatedAt: toDate(dto.updatedAt),
    currentStage: stages[currentIndex]?.label || dto.status.label,
    stages: stages.map((s, i) => ({
      id: s.id,
      label: s.label,
      at: toDate(s.completedAt),
      state: finished || i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'next',
    })),
  };
}

export function createTrackingService(transport) {
  return {
    async track(raw, { signal } = {}) {
      const number = validateNumber(raw);
      const dto = await transport.get(`/shipments/${encodeURIComponent(number)}`, { signal });
      return toShipment(dto);
    },
  };
}
