/* Lead (request) service. Today a request is handed to a messenger with a ready text;
   when the FBL API accepts leads, set config.leads.channel = 'api' and it goes to the CRM. */

export function leadMessage(lead) {
  const tasks = (lead.tasks?.length ? lead.tasks : lead.task ? [lead.task] : []).join(', ');
  return [
    'Заявка с сайта FBL Group',
    `Имя: ${lead.name}`,
    `Телефон: ${lead.phone}`,
    `Email: ${lead.email}`,
    lead.company ? `Компания: ${lead.company}` : null,
    lead.country ? `Страна: ${lead.country}` : null,
    `Что нужно сделать: ${tasks}`,
    `Ссылка / описание задачи:\n${lead.details}`,
  ].filter(Boolean).join('\n');
}

export function createLeadService({ transport, channel, contacts }) {
  const handoff = (lead, errorReason) => {
    const message = leadMessage(lead);
    return {
      via: errorReason ? 'error' : 'messenger',
      errorReason,
      message,
      whatsappUrl: `https://wa.me/${contacts.whatsapp}?text=${encodeURIComponent(message)}`,
      telegramUrl: contacts.telegram,
    };
  };

  return {
    async submit(lead) {
      console.info('[leads] FORM SUBMITTED', { name: lead.name, phone: lead.phone });
      // The demo transport stores nothing — this deployment has no CRM to reach, so a plain
      // «send via messenger» handoff is the intended, non-error path (not a failure to log as one).
      if (channel !== 'api' || transport.kind === 'mock') {
        console.info('[leads] REQUEST SENT via messenger (no CRM configured for this deployment)');
        return handoff(lead);
      }
      console.info('[leads] CRM API REQUEST SENT', transport.kind);
      try {
        const res = await transport.post('/leads', {
          name: lead.name, phone: lead.phone, email: lead.email,
          company: lead.company || undefined, country: lead.country || undefined,
          tasks: lead.tasks, details: lead.details,
          source: location.pathname, sessionId: lead.sessionId ?? undefined,
          website: lead.website || undefined, // honeypot: empty for real visitors
        });
        console.info('[leads] CRM RESPONSE RECEIVED', res);
        console.info('[leads] LEAD CREATED', res?.id);
        return { via: 'api', id: res?.id ?? null };
      } catch (err) {
        // The CRM was supposed to receive this (channel === 'api') and did not confirm a lead —
        // this is an error, not a normal handoff, even though the visitor still reaches a manager
        // through a messenger as a fallback. The UI must not claim the CRM got it (prompt §5).
        const reason = err?.code === 'network' ? `NETWORK ERROR: ${err.message}`
          : err?.status ? `CRM API ERROR: ${err.status} ${err.message || ''}`.trim()
          : `CRM API ERROR: ${err?.message ?? err}`;
        console.error('[leads]', reason, err);
        return handoff(lead, reason);
      }
    },
  };
}
