import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const values = { ...process.env };
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const match = line.match(/^([A-Z_]+)\s*=\s*(.*)$/);
    if (match && !values[match[1]]) values[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
}
let missing = false;
for (const key of ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY','CLERK_SECRET_KEY','NEXT_PUBLIC_CONVEX_URL']) {
  const present = Boolean(values[key]);
  console.log(`${present ? 'OK' : 'MISSING'}: ${key}`);
  missing ||= !present;
}
console.log('Convex deployment must also have CLERK_JWT_ISSUER_DOMAIN and APP_TIMEZONE configured.');
const docker = spawnSync('docker', ['compose', 'version'], { encoding: 'utf8' });
console.log(docker.status === 0 ? 'OK: Docker Compose available' : 'OPTIONAL: Docker Compose unavailable; use Docker Desktop or n8n Cloud for automation.');
console.log(missing ? 'Configure missing values in .env.local and restart Next.js.' : 'Local keys present. Verify authentication against your deployed Convex backend.');
process.exitCode = missing ? 1 : 0;
