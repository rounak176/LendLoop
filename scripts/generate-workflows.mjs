import { writeFileSync } from 'node:fs';
const credential = { lendLoopApi: { id: 'lendloop-api-local', name: 'LendLoop Automation API' } };
const automation = (id, operation, position) => ({ id, name: id, type: 'CUSTOM.lendLoopAutomation', typeVersion: 1, position, parameters: { operation }, credentials: credential });
const settings = { executionOrder: 'v1', timezone: 'Asia/Kolkata', saveDataErrorExecution: 'all', saveDataSuccessExecution: 'all', executionTimeout: 900 };
function write(file, name, nodes, connections) {
  writeFileSync(`n8n/workflows/${file}.json`, JSON.stringify({ id: { 'request-notifications': 'SZECEo48A0baNoSR', 'overdue-reminders': 'dHicZAZVfznKBT1E', 'automation-errors': 'XNwzG6A4HI1IVUYp' }[file], name, nodes, connections, active: false, settings: { ...settings, ...(file !== 'automation-errors' ? { errorWorkflow: 'XNwzG6A4HI1IVUYp' } : {}) }, tags: [] }, null, 2) + '\n');
}
const connect = target => ({ main: [[{ node: target, type: 'main', index: 0 }]] });
write('request-notifications', 'LendLoop · Request notifications', [
  { id: 'request-webhook', name: 'Request webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId: 'lendloop-request-events', parameters: { httpMethod: 'POST', path: 'lendloop-request-events', responseMode: 'responseNode', options: {} } },
  automation('Verify and deliver notification', 'request', [260, 0]),
  { id: 'respond', name: 'Delivery response', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.4, position: [520, 0], parameters: { respondWith: 'json', responseBody: '={{ JSON.stringify($json) }}', options: {} } },
], { 'Request webhook': connect('Verify and deliver notification'), 'Verify and deliver notification': connect('Delivery response') });
write('overdue-reminders', 'LendLoop · Daily overdue reminders', [
  { id: 'daily', name: 'Daily at 09:00', type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2, position: [0, 0], parameters: { rule: { interval: [{ field: 'days', triggerAtHour: 9, triggerAtMinute: 0 }] } } },
  { id: 'manual', name: 'Run reminder demo', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 200], parameters: {} },
  { ...automation('Fetch and remind overdue borrowers', 'overdue', [260, 0]), retryOnFail: true, maxTries: 3, waitBetweenTries: 65000 },
], { 'Daily at 09:00': connect('Fetch and remind overdue borrowers'), 'Run reminder demo': connect('Fetch and remind overdue borrowers') });
write('automation-errors', 'LendLoop · Automation failures', [
  { id: 'error', name: 'Workflow failure', type: 'n8n-nodes-base.errorTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
  { ...automation('Record sanitized failure', 'failure', [260, 0]), retryOnFail: true, maxTries: 3, waitBetweenTries: 5000 },
], { 'Workflow failure': connect('Record sanitized failure') });
console.log('Generated 3 secret-free workflows. Bind credentials and error workflow in n8n before activating.');
