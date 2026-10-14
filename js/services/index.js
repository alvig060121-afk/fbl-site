/* One place where services are wired to the configured transport.
   Future services (orders, documents, products, notifications) are added here the same way. */
import { config } from '../config.js';
import { createTransport } from '../api/index.js';
import { createTrackingService } from './tracking.js';
import { createLeadService } from './leads.js';

export const transport = createTransport(config.api);
export const tracking = createTrackingService(transport);
export const leads = createLeadService({ transport, channel: config.leads.channel, contacts: config.contacts });
