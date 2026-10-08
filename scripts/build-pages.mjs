import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {MEDIUMS, LIMITS} from '../src/shared/submit-constants.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'docs');
const pages = ['home', 'story', 'database', 'about', 'survivor-support'];
const publicConfig = JSON.parse(await fs.readFile(path.join(root, 'src/sanity/public-config.json'), 'utf8'));
const config = {
  projectId: process.env.SANITY_PROJECT_ID || publicConfig.projectId,
  dataset: process.env.SANITY_DATASET || publicConfig.dataset,
  apiVersion: publicConfig.apiVersion,
  useCdn: true,
  submissionApiUrl: String(process.env.SUBMISSION_API_URL || publicConfig.submissionApiUrl || '').trim().replace(/\/+$/, ''),
};

await fs.mkdir(output, {recursive: true});
for (const directory of ['assets', 'src/shared', 'src/sanity', ...pages.map(page => 'src/' + page)]) {
  await fs.cp(path.join(root, directory), path.join(output, directory), {
    recursive: true,
    filter: source => path.basename(source) !== '.DS_Store',
  });
}

const shell = (await fs.readFile(path.join(root, 'src/shared/shell.html'), 'utf8'))
  .replace('class="site-shell"', 'class="site-shell" data-static-host')
  .replace('/home?content=1', '/src/home/index.html');
await fs.writeFile(path.join(output, 'index.html'), shell);
for (const page of pages) {
  await fs.mkdir(path.join(output, page), {recursive: true});
  await fs.writeFile(path.join(output, page, 'index.html'), shell);
}

await fs.mkdir(path.join(output, 'api'), {recursive: true});
await fs.writeFile(path.join(output, 'api/config.js'),
  'window.SANITY_CONFIG = ' + JSON.stringify(config) + ';\n' +
  'window.SUBMISSION_CONSTANTS = ' + JSON.stringify({MEDIUMS, LIMITS}) + ';\n');

if (!config.submissionApiUrl) {
  const databaseFile = path.join(output, 'src/database/index.html');
  const database = await fs.readFile(databaseFile, 'utf8');
  await fs.writeFile(databaseFile, database.replace(
    '<button type="button" class="db-submit" id="db-submit">Submit entries</button>',
    '<button type="button" class="db-submit" id="db-submit" disabled title="Submissions need a separately hosted backend">Submissions temporarily unavailable</button>',
  ));
}
await fs.copyFile(path.join(root, 'CNAME'), path.join(output, 'CNAME'));
await fs.writeFile(path.join(output, '.nojekyll'), '');
console.log('GitHub Pages site built in docs/');
