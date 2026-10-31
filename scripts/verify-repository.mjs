#!/usr/bin/env node
// Dependency-free repository integrity gate. This does NOT certify working business logic.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const errors = [];
const required = [
  'README.md',
  'docs/official/problem-statement.md',
  'docs/requirements/requirements.md',
  'docs/requirements/acceptance-criteria.md',
  'docs/integration/api-contracts.md',
  'docs/team/task-board.md',
  'docs/team/DEVELOPMENT_READINESS.md'
];
for (const p of required) if (!fs.existsSync(p)) errors.push(`Required project document missing: ${p}`);

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
for (const p of files) {
  const normalized = p.replaceAll('\\', '/');
  const basename = normalized.split('/').at(-1);
  if (/^\.env($|\.(?!example$|sample$|template$))/i.test(basename)
    || /\.(pem|key|p12|pfx|sqlite|sqlite3|dump)$/i.test(basename)
    || /(^|\/)(node_modules|\.venv|venv|dist|coverage)\//.test(normalized)) {
    errors.push(`Potential secret, generated output or local database tracked: ${p}`);
  }
  if (/\.(md|json|mjs|js|jsx|ts|tsx|ya?ml|sql)$/i.test(normalized) && fs.existsSync(p)) {
    const stat = fs.statSync(p);
    if (stat.size <= 750000) {
      const content = fs.readFileSync(p, 'utf8');
      if (/^<{7} |^>{7} /m.test(content)) errors.push(`Unresolved Git conflict marker in ${p}`);
    }
  }
}
try {
  execFileSync('git', ['check-ignore', '-q', 'database/migrations/_example.sql'], { stdio: 'ignore' });
  errors.push('SQL migration files are ignored by .gitignore; allow database/migrations/*.sql');
} catch (e) {
  if (e.status !== 1) errors.push(`Unable to check SQL migration ignore rules: ${e.message}`);
}

if (errors.length) {
  for (const msg of errors) console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
} else {
  console.log(`Repository integrity PASS: ${files.length} tracked files checked; no tracked secret-looking paths or conflict markers detected.`);
  console.log('Reminder: this check does not validate API behavior, billing, authorization, real credentials or live database connections.');
}
