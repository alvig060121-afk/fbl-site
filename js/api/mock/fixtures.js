/* DEMO DATA ONLY. These shipments do not exist; they let the tracker be built and tested before the CRM
   is connected. The shape is exactly what GET /shipments/{number} must return (docs/api/openapi.yaml).
   Dates are relative to "now" so the demo never looks stale. */

const DAY = 864e5;
const at = (daysAgo, hour = 10) => {
  const d = new Date(Date.now() - daysAgo * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const hoursAgo = h => new Date(Date.now() - h * 36e5).toISOString();

/* A number that makes the mock behave like a failing backend, for testing the error state. */
export const DEMO_FAILURE_NUMBER = 'FBL-DEMO-500';

export function shipmentFixtures() {
  return {
    'FBL-DEMO-1001': {
      number: 'FBL-DEMO-1001',
      status: { code: 'in_transit', label: 'В пути' },
      route: { origin: 'Фошань, Китай', destination: 'Алматы, Казахстан', mode: { code: 'auto', label: 'Авто' } },
      shippedAt: at(6),
      updatedAt: hoursAgo(2),
      currentStageId: 'in_transit',
      stages: [
        { id: 'received', label: 'Принят на складе', completedAt: at(9) },
        { id: 'checked', label: 'Проверен и упакован', completedAt: at(7) },
        { id: 'shipped', label: 'Отправлен', completedAt: at(6) },
        { id: 'in_transit', label: 'В пути', completedAt: null },
        { id: 'customs', label: 'Таможенное оформление', completedAt: null },
        { id: 'delivered', label: 'Доставлен', completedAt: null },
      ],
    },
    'FBL-DEMO-1002': {
      number: 'FBL-DEMO-1002',
      status: { code: 'delivered', label: 'Доставлен' },
      route: { origin: 'Иу, Китай', destination: 'Ташкент, Узбекистан', mode: { code: 'rail', label: 'ЖД' } },
      shippedAt: at(34),
      updatedAt: at(2, 15),
      currentStageId: 'delivered',
      stages: [
        { id: 'received', label: 'Принят на складе', completedAt: at(38) },
        { id: 'checked', label: 'Проверен и упакован', completedAt: at(36) },
        { id: 'shipped', label: 'Отправлен', completedAt: at(34) },
        { id: 'in_transit', label: 'В пути', completedAt: at(8) },
        { id: 'customs', label: 'Таможенное оформление', completedAt: at(4) },
        { id: 'delivered', label: 'Доставлен', completedAt: at(2, 15) },
      ],
    },
    'FBL-DEMO-1003': {
      number: 'FBL-DEMO-1003',
      status: { code: 'at_warehouse', label: 'На складе в Китае' },
      route: { origin: 'Гуанчжоу, Китай', destination: 'Эр-Рияд, Саудовская Аравия', mode: { code: 'sea', label: 'Море' } },
      shippedAt: null,
      updatedAt: hoursAgo(5),
      currentStageId: 'checked',
      stages: [
        { id: 'received', label: 'Принят на складе', completedAt: at(3) },
        { id: 'checked', label: 'Проверка и упаковка', completedAt: null },
        { id: 'shipped', label: 'Отправлен', completedAt: null },
        { id: 'in_transit', label: 'В пути', completedAt: null },
        { id: 'delivered', label: 'Доставлен', completedAt: null },
      ],
    },
  };
}
