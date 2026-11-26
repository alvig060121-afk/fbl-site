/* One place where services are wired to the configured transport.
   Future services (orders, documents, products, notifications) are added here the same way. */
import { config } from '../config.js';
import { createTransport } from '../api/index.js';
import { createHttpTransport } from '../api/http.js';
import { createTrackingService } from './tracking.js';
import { createLeadService } from './leads.js';

export const transport = createTransport(config.api);
export const tracking = createTrackingService(transport);
// Requests have their own endpoint (the CRM intake), independent of the tracker's transport.
const leadTransport = config.leads.apiBaseUrl
  ? createHttpTransport({ baseUrl: config.leads.apiBaseUrl, timeoutMs: config.api.timeoutMs })
  : transport;
export const leads = createLeadService({ transport: leadTransport, channel: config.leads.channel, contacts: config.contacts });
