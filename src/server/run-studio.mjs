import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadDotEnv} from './env.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
loadDotEnv(root);
if (!process.env.SANITY_PROJECT_ID?.trim()) {
  console.error('Set SANITY_PROJECT_ID in the root .env before starting Studio.');
  process.exit(1);
}

const child = spawn(process.execPath, [
  path.join(root, 'studio/node_modules/sanity/bin/sanity'),
  ...process.argv.slice(2),
], {cwd: path.join(root, 'studio'), env: process.env, stdio: 'inherit'});
child.on('error', error => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
