/* Tracking service: validates the number, asks the transport, and turns the API payload into
   the view model the tracker renders. Status wording and stages come from the API (CRM);
   the site only decides how a status looks. */
import { ApiError, ValidationError } from '../api/errors.js';
import { LANG } from '../core/i18n.js';

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

/* The CRM sends Russian wording with stable codes. On the English site the codes pick the English
   wording; a code this list does not know keeps the CRM's own label rather than showing nothing. */
const EN = {
  status: { preparing: 'Preparing', at_warehouse: 'At the warehouse in China', shipped: 'Shipped', in_transit: 'In transit',
    arrived: 'Arrived', delivered: 'Delivered', on_hold: 'On hold', delayed: 'Delayed', problem: 'Needs attention' },
  stage: { preparing: 'Preparing', received: 'Received at the warehouse', checked: 'Checked and packed', shipped: 'Shipped',
    in_transit: 'In transit', customs: 'Customs clearance', arrived: 'Arrived', delivered: 'Delivered' },
  mode: { air: 'Air', auto: 'Truck', rail: 'Rail', sea: 'Sea', consolidated: 'Consolidated', express: 'Express' },
};
const word = (kind, code, label, lang) => (lang === 'en' && EN[kind][code]) || label || '';

const toDate = v => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function toShipment(dto, lang = LANG) {
  if (!dto || typeof dto.number !== 'string' || !dto.status) {
    throw new ApiError('Unexpected shipment payload', { code: 'bad_response' });
  }
  const stages = Array.isArray(dto.stages) ? dto.stages : [];
  const currentIndex = Math.max(0, stages.findIndex(s => s.id === dto.currentStageId));
  const finished = dto.status.code === 'delivered';

  return {
    number: dto.number,
    status: { code: dto.status.code, label: word('status', dto.status.code, dto.status.label, lang), tone: TONES[dto.status.code] || 'progress' },
    route: {
      origin: dto.route?.origin || '',
      destination: dto.route?.destination || '',
      mode: word('mode', dto.route?.mode?.code, dto.route?.mode?.label, lang),
    },
    shippedAt: toDate(dto.shippedAt),
    updatedAt: toDate(dto.updatedAt),
    currentStage: word('stage', stages[currentIndex]?.id, stages[currentIndex]?.label, lang) || word('status', dto.status.code, dto.status.label, lang),
    stages: stages.map((s, i) => ({
      id: s.id,
      label: word('stage', s.id, s.label, lang),
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
