#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const requiredFiles = ['src/index.js', 'src/index.d.ts', 'test/smoke.mjs', 'package.json', 'README.md', 'LICENSE'];
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const violations = [];

for (const file of requiredFiles) if (!existsSync(file)) violations.push(`missing ${file}`);
for (const script of ['build', 'test', 'typecheck', 'lint', 'prepack']) {
  if (!pkg.scripts?.[script]) violations.push(`package.json missing scripts.${script}`);
}
if (pkg.scripts?.prepack && !pkg.scripts.prepack.includes('lint')) violations.push('prepack must run lint');

for (const file of gitFiles()) {
  if (file.startsWith('dist/') || file.startsWith('node_modules/')) violations.push(`tracked generated artifact is not allowed: ${file}`);
  if (/\.(js|mjs|ts)$/.test(file)) {
    const lines = readFileSync(file, 'utf8').split('\n').length;
    if (lines > 320) violations.push(`${file} has ${lines} lines; max is 320`);
  }
}

if (violations.length) {
  console.error('frontier package lint failed');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}
console.log('frontier package lint ok');

function gitFiles() {
  try {
    return execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return requiredFiles;
  }
}
