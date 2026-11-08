/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test, vi } from 'vitest';
import schema from './schema';
import { api, internal } from './_generated/api';
import { signEnvelope, verifyEnvelope } from './lib/signatures';
const modules = import.meta.glob('./**/*.ts');
const secret = 'test-only-secret-32-characters-long-12345';
async function setup() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: 'automation-owner' });
  const borrower = t.withIdentity({ subject: 'automation-borrower' });
  await owner.mutation(api.users.syncProfile, {});
  await borrower.mutation(api.users.syncProfile, {});
  const toolId = await owner.mutation(api.tools.create, { name: 'Test drill', category: 'Garden', condition: 'good', description: '' });
  const loanId = await borrower.mutation(api.loans.request, { toolId, startDate: '2099-01-01', endDate: '2099-01-03' });
  const event = (await t.run(ctx => ctx.db.query('automationEvents').take(1)))[0];
  return { t, owner, borrower, loanId, event };
}
test('HMAC verifies exact payload, rejects tampering and stale timestamps', async () => {
  const e = await signEnvelope({ operation: 'test' }, secret);
  expect(await verifyEnvelope(e, secret)).toEqual(e);
  await expect(verifyEnvelope({ ...e, payload: '{}' }, secret)).rejects.toThrow('signature');
  await expect(verifyEnvelope(e, secret, e.timestamp + 300001)).rejects.toThrow('timestamp');
});
test('HTTP rejects unsigned, tampered and replayed requests', async () => {
  vi.stubEnv('N8N_TO_CONVEX_SECRET', secret);
  try {
    const { t } = await setup();
    expect((await t.fetch('/automation/rpc', { method: 'POST', body: '{}' })).status).toBe(401);
    const e = await signEnvelope({ operation: 'reminders.list', cursor: null }, secret);
    expect((await t.fetch('/automation/rpc', { method: 'POST', body: JSON.stringify(e) })).status).toBe(200);
    expect((await t.fetch('/automation/rpc', { method: 'POST', body: JSON.stringify(e) })).status).toBe(409);
    expect((await t.fetch('/automation/rpc', { method: 'POST', body: JSON.stringify({ ...e, payload: '{}' }) })).status).toBe(401);
  } finally { vi.unstubAllEnvs(); }
});
test('event completion is idempotent and stale leases cannot complete', async () => {
  const { t, event } = await setup();
  expect((await t.mutation(internal.automation.claimEvent, { eventId: event._id, token: 'token-one' })).state).toBe('claimed');
  expect((await t.mutation(internal.automation.claimEvent, { eventId: event._id, token: 'token-two' })).state).toBe('busy');
  await expect(t.mutation(internal.automation.completeEvent, { eventId: event._id, token: 'token-two' })).rejects.toThrow('Stale');
  await t.mutation(internal.automation.completeEvent, { eventId: event._id, token: 'token-one' });
  await t.mutation(internal.automation.completeEvent, { eventId: event._id, token: 'token-one' });
  expect(await t.run(ctx => ctx.db.query('mockDeliveries').take(10))).toHaveLength(1);
});
test('daily reminder claims deduplicate and skip loans returned before completion', async () => {
  const { t, owner, loanId } = await setup();
  await owner.mutation(api.loans.decide, { loanId, decision: 'approved' });
  await t.run(ctx => ctx.db.patch(loanId, { startDate: '2020-01-01', endDate: '2020-01-02' }));
  const claim = await t.mutation(internal.automation.claimReminder, { loanId, token: 'lease-one' });
  if (claim.state !== 'claimed') throw new Error('Expected claim');
  expect((await t.mutation(internal.automation.claimReminder, { loanId, token: 'lease-two' })).state).toBe('busy');
  await t.mutation(internal.automation.completeReminder, { reminderId: claim.reminderId, token: 'lease-one' });
  await t.mutation(internal.automation.completeReminder, { reminderId: claim.reminderId, token: 'lease-one' });
  expect((await t.mutation(internal.automation.claimReminder, { loanId, token: 'lease-three' })).state).toBe('sent');
  expect(await t.run(ctx => ctx.db.query('mockDeliveries').take(10))).toHaveLength(1);
});
test('return after reminder claim prevents sending and participant activity is protected', async () => {
  const { t, owner, borrower, loanId } = await setup();
  await owner.mutation(api.loans.decide, { loanId, decision: 'approved' });
  await t.run(ctx => ctx.db.patch(loanId, { startDate: '2020-01-01', endDate: '2020-01-02' }));
  const claim = await t.mutation(internal.automation.claimReminder, { loanId, token: 'lease' });
  if (claim.state !== 'claimed') throw new Error('Expected claim');
  await owner.mutation(api.loans.confirmReturn, { loanId });
  expect(await t.mutation(internal.automation.completeReminder, { reminderId: claim.reminderId, token: 'lease' })).toEqual({ state: 'skipped' });
  expect(await t.run(ctx => ctx.db.query('mockDeliveries').take(10))).toHaveLength(0);
  expect(await borrower.query(api.automation.activity, { loanId })).toHaveLength(1);
  await expect(t.query(api.automation.activity, { loanId })).rejects.toThrow('Authentication');
});
test('dispatch retries stop at five attempts and failures remain visible', async () => {
  const { t, event } = await setup();
  for (let attempt = 0; attempt < 5; attempt++) {
    await t.mutation(internal.automation.prepareDispatch, { eventId: event._id });
    await t.mutation(internal.automation.dispatchFailed, { eventId: event._id, code: 'N8N_HTTP_503', retryable: true });
  }
  expect(await t.run(ctx => ctx.db.get(event._id))).toMatchObject({ status: 'failed', attemptCount: 5, errorCode: 'N8N_HTTP_503' });
});
