/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';
const modules = import.meta.glob('./**/*.ts');
async function fixture() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: 'owner', name: 'Owner' });
  const borrower = t.withIdentity({ subject: 'borrower', name: 'Borrower' });
  const stranger = t.withIdentity({ subject: 'stranger' });
  await owner.mutation(api.users.syncProfile, {});
  await borrower.mutation(api.users.syncProfile, {});
  await stranger.mutation(api.users.syncProfile, {});
  const toolId = await owner.mutation(api.tools.create, { name: 'Drill', category: 'Workshop', condition: 'good', description: 'Test drill' });
  return { t, owner, borrower, stranger, toolId };
}
test('borrowers receive the correct tool name and unrelated users cannot approve', async () => {
  const { owner, borrower, stranger, toolId } = await fixture();
  const loanId = await borrower.mutation(api.loans.request, { toolId, startDate: '2099-01-01', endDate: '2099-01-03' });
  expect((await borrower.query(api.loans.mine, {})).borrowed[0].toolName).toBe('Drill');
  await expect(stranger.mutation(api.loans.decide, { loanId, decision: 'approved' })).rejects.toThrow('Only the owner');
  await owner.mutation(api.loans.decide, { loanId, decision: 'approved' });
  expect((await borrower.query(api.tools.listForMembers, {}))[0].reservedDates).toHaveLength(1);
});
test('overlapping approvals and self-borrowing are rejected', async () => {
  const { owner, borrower, toolId } = await fixture();
  const dates = { toolId, startDate: '2099-01-01', endDate: '2099-01-03' };
  await expect(owner.mutation(api.loans.request, dates)).rejects.toThrow('own tool');
  const first = await borrower.mutation(api.loans.request, dates);
  const second = await borrower.mutation(api.loans.request, dates);
  const result = await Promise.allSettled([first, second].map(loanId => owner.mutation(api.loans.decide, { loanId, decision: 'approved' })));
  expect(result.filter(item => item.status === 'fulfilled')).toHaveLength(1);
});
test('current and overdue unreturned loans hide public availability; return restores it', async () => {
  const { t, owner, borrower, toolId } = await fixture();
  const loanId = await borrower.mutation(api.loans.request, { toolId, startDate: '2099-01-01', endDate: '2099-01-03' });
  await owner.mutation(api.loans.decide, { loanId, decision: 'approved' });
  await t.run(async ctx => { await ctx.db.patch(loanId, { startDate: '2020-01-01', endDate: '2020-01-03' }); });
  expect(await t.query(api.tools.listPublic, {})).toHaveLength(0);
  expect((await borrower.query(api.tools.listForMembers, {}))[0].availability).toBe('On loan');
  await expect(borrower.mutation(api.loans.confirmReturn, { loanId })).rejects.toThrow('Only the owner');
  await owner.mutation(api.loans.confirmReturn, { loanId });
  expect(await t.query(api.tools.listPublic, {})).toHaveLength(1);
});
test('members cannot call admin functions or edit another listing', async () => {
  const { borrower, toolId } = await fixture();
  await expect(borrower.query(api.admin.allLoans, {})).rejects.toThrow('Administrator');
  await expect(borrower.mutation(api.tools.remove, { id: toolId })).rejects.toThrow('Not authorized');
});

test('notifications reach the correct recipient and read status persists without changing delivery state', async () => {
  const { t, owner, borrower, stranger, toolId } = await fixture();
  const loanId = await borrower.mutation(api.loans.request, { toolId, startDate: '2099-02-01', endDate: '2099-02-03' });
  const inbox = await owner.query(api.notifications.mine, {});
  expect(inbox.unreadCount).toBe(1);
  expect(inbox.items[0].title).toBe('New borrow request');
  expect(await stranger.query(api.notifications.mine, {})).toMatchObject({ items: [], unreadCount: 0 });
  await expect(stranger.mutation(api.notifications.markRead, { ids: [inbox.items[0]._id] })).rejects.toThrow('Notification not found');
  await t.finishInProgressScheduledFunctions();
  const deliveryBeforeRead = await t.run(ctx => ctx.db.get(inbox.items[0]._id));
  await owner.mutation(api.notifications.markRead, { ids: [inbox.items[0]._id] });
  await owner.mutation(api.notifications.markRead, { ids: [inbox.items[0]._id] });
  expect((await owner.query(api.notifications.mine, {})).unreadCount).toBe(0);
  expect(await t.run(ctx => ctx.db.get(inbox.items[0]._id))).toMatchObject({ status: deliveryBeforeRead!.status, attemptCount: deliveryBeforeRead!.attemptCount });
  await owner.mutation(api.loans.decide, { loanId, decision: 'approved' });
  expect((await borrower.query(api.notifications.mine, {})).items[0].title).toBe('Request accepted');
  await owner.mutation(api.loans.confirmReturn, { loanId });
  expect((await borrower.query(api.notifications.mine, {})).unreadCount).toBe(2);
});
test('rejected requests create one decision notification and invalid repeat decisions create none', async () => {
  const { owner, borrower, toolId } = await fixture();
  const loanId = await borrower.mutation(api.loans.request, { toolId, startDate: '2099-03-01', endDate: '2099-03-03' });
  await owner.mutation(api.loans.decide, { loanId, decision: 'declined' });
  await expect(owner.mutation(api.loans.decide, { loanId, decision: 'declined' })).rejects.toThrow('Only pending');
  const inbox = await borrower.query(api.notifications.mine, {});
  expect(inbox.items).toHaveLength(1);
  expect(inbox.items[0].title).toBe('Request rejected');
});

test('owners can edit listings and the public directory omits private details', async () => {
  const { t, owner, borrower, toolId } = await fixture();
  const update = {
    id: toolId,
    name: 'Cordless drill',
    category: 'Workshop',
    condition: 'good' as const,
    description: 'Includes charger',
  };
  await expect(borrower.mutation(api.tools.update, update)).rejects.toThrow('Only the listing owner');
  await owner.mutation(api.tools.update, update);
  expect(await t.query(api.tools.listPublic, {})).toEqual([
    { _id: toolId, name: update.name, category: update.category },
  ]);
});
