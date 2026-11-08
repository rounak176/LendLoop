import { existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const privateFile = '.automation-secrets.local.json';
let settings;
if (existsSync(privateFile)) settings = JSON.parse(readFileSync(privateFile, 'utf8'));
else {
  // Read only the public deployment URL; never print environment contents.
  const line = readFileSync('.env.local', 'utf8').split('\n').find(line => line.startsWith('NEXT_PUBLIC_CONVEX_URL='));
  const url = line?.split('=').slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
  if (!url || !/^https:\/\/[a-z0-9.-]+\.convex\.cloud$/.test(url)) throw new Error('Configure a hosted development Convex URL first.');
  settings = { baseUrl: url.replace('.convex.cloud', '.convex.site'), inboundSecret: randomBytes(32).toString('hex'), outboundSecret: randomBytes(32).toString('hex') };
  writeFileSync(privateFile, JSON.stringify(settings, null, 2) + '\n', { mode: 0o600 });
}
chmodSync(privateFile, 0o600);
if (!existsSync('.env.n8n')) writeFileSync('.env.n8n', `N8N_ENCRYPTION_KEY=${randomBytes(32).toString('hex')}\nGENERIC_TIMEZONE=Asia/Kolkata\nAPP_TIMEZONE=Asia/Kolkata\n`, { mode: 0o600 });
for (const [name, value] of [['CONVEX_TO_N8N_SECRET', settings.inboundSecret], ['N8N_TO_CONVEX_SECRET', settings.outboundSecret]]) {
  const result = spawnSync('npx', ['convex', 'env', 'set', name], { input: value, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Could not configure ${name}. Check Convex CLI access.`);
  console.log(`Configured ${name} without displaying its value.`);
}
// This private temporary import is mounted read-only and excluded from Git.
writeFileSync('.n8n-credentials.local.json', JSON.stringify([{ id: 'lendloop-api-local', name: 'LendLoop Automation API', type: 'lendLoopApi', data: settings }], null, 2), { mode: 0o600 });
console.log('Private credential import prepared. Existing keys are preserved when re-running this script.');
