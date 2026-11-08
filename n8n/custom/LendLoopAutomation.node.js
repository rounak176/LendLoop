/* eslint-disable @typescript-eslint/no-require-imports -- n8n custom nodes use CommonJS. */
const crypto = require('node:crypto');
function sign(payload, secret) {
  const e = { timestamp: Date.now(), nonce: crypto.randomUUID(), payload: JSON.stringify(payload) };
  return { ...e, signature: crypto.createHmac('sha256', secret).update(`${e.timestamp}.${e.nonce}.${e.payload}`).digest('hex') };
}
function verify(e, secret) {
  if (!e || typeof e.timestamp !== 'number' || Math.abs(Date.now() - e.timestamp) > 300000 || typeof e.nonce !== 'string' || e.nonce.length < 16 || typeof e.payload !== 'string' || e.payload.length > 32000 || typeof e.signature !== 'string' || !/^[a-f0-9]{64}$/.test(e.signature)) throw new Error('INVALID_SIGNATURE_OR_TIMESTAMP');
  const expected = crypto.createHmac('sha256', secret).update(`${e.timestamp}.${e.nonce}.${e.payload}`).digest();
  if (!crypto.timingSafeEqual(expected, Buffer.from(e.signature, 'hex'))) throw new Error('INVALID_SIGNATURE');
  return JSON.parse(e.payload);
}
class LendLoopAutomation {
  constructor() {
    this.description = {
      displayName: 'LendLoop Automation', name: 'lendLoopAutomation', group: ['transform'], version: 1,
      description: 'Signed LendLoop notifications, overdue reminders, and error reporting',
      defaults: { name: 'LendLoop Automation' }, inputs: ['main'], outputs: ['main'],
      credentials: [{ name: 'lendLoopApi', required: true }],
      properties: [{ displayName: 'Operation', name: 'operation', type: 'options', options: [
        { name: 'Process Request Webhook', value: 'request' },
        { name: 'Send Overdue Reminders', value: 'overdue' },
        { name: 'Report Workflow Failure', value: 'failure' },
      ], default: 'request' }],
    };
  }
  async execute() {
    const credentials = await this.getCredentials('lendLoopApi');
    const base = String(credentials.baseUrl).replace(/\/$/, '');
    if (!/^https:\/\/[a-z0-9.-]+\.convex\.site$/.test(base)) throw new Error('EXPECTED_CONVEX_HTTPS_SITE_URL');
    if (String(credentials.inboundSecret).length < 32 || String(credentials.outboundSecret).length < 32) throw new Error('SHARED_SECRETS_TOO_SHORT');
    const rpc = async payload => {
      let lastError;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await this.helpers.httpRequest({ method: 'POST', url: `${base}/automation/rpc`, body: sign(payload, String(credentials.outboundSecret)), json: true, timeout: 12000 });
        } catch (error) {
          lastError = error;
          const status = error.statusCode ?? error.response?.status;
          if (status && status < 500 && status !== 408 && status !== 409 && status !== 429) break;
          if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt));
        }
      }
      // Never include credential values or raw HTTP error objects in execution output.
      throw new Error(`CONVEX_RPC_FAILED:${payload.operation}:${lastError?.statusCode ?? 'NETWORK'}`);
    };
    const operation = this.getNodeParameter('operation', 0);
    const input = this.getInputData()[0]?.json ?? {};
    try {
      if (operation === 'failure') {
        const executionId = String(input.execution?.id ?? this.getExecutionId());
        await rpc({ operation: 'failure.record', key: `n8n:${executionId}`, code: 'N8N_EXECUTION_FAILED' });
        return [[{ json: { recorded: true } }]];
      }
      if (operation === 'request') {
        const e = input.body;
        const payload = verify(e, String(credentials.inboundSecret));
        if (typeof payload.eventId !== 'string' || !['loan.requested', 'loan.approved', 'loan.declined', 'loan.returned'].includes(payload.type)) throw new Error('INVALID_EVENT');
        await rpc({ operation: 'webhook.consume', nonce: e.nonce });
        const token = crypto.randomUUID();
        const claim = await rpc({ operation: 'event.claim', eventId: payload.eventId, token });
        if (claim.state === 'sent') return [[{ json: { delivered: true, duplicate: true } }]];
        if (claim.state !== 'claimed') throw new Error('EVENT_CLAIM_BUSY');
        // Logged mock delivery is persisted atomically with completion in Convex.
        // The stable event ID prevents a lost response from duplicating the log.
        await rpc({ operation: 'event.complete', eventId: payload.eventId, token });
        return [[{ json: { delivered: true, eventId: payload.eventId, message: claim.message, recipientId: claim.recipientId, channel: 'logged-mock' } }]];
      }
      if (operation === 'overdue') {
        let cursor = null;
        let sent = 0;
        let skipped = 0;
        let pages = 0;
        do {
          const page = await rpc({ operation: 'reminders.list', cursor });
          for (const loan of page.page) {
            const token = crypto.randomUUID();
            const claim = await rpc({ operation: 'reminder.claim', loanId: loan.loanId, token });
            if (claim.state !== 'claimed') { skipped++; continue; }
            const result = await rpc({ operation: 'reminder.complete', reminderId: claim.reminderId, token });
            if (result.state === 'sent') sent++; else skipped++;
          }
          cursor = page.isDone ? null : page.continueCursor;
          pages++;
          if (cursor && pages >= 1000) throw new Error('PAGE_LIMIT_REACHED');
        } while (cursor);
        return [[{ json: { sent, skipped, pages, channel: 'logged-mock' } }]];
      }
      throw new Error('UNKNOWN_OPERATION');
    } catch (error) {
      try { await rpc({ operation: 'failure.record', key: `n8n:${this.getExecutionId()}`, code: 'N8N_EXECUTION_FAILED' }); }
      catch { /* The failed execution remains visible in n8n even when Convex is offline. */ }
      throw new Error(error.message?.slice(0, 160) ?? 'AUTOMATION_FAILED');
    }
  }
}
module.exports = { LendLoopAutomation, sign, verify };
