import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {MEDIUMS, LIMITS} from '../shared/submit-constants.mjs';
import {loadDotEnv} from './env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PORT = Number(process.env.PORT || 8000);

loadDotEnv(ROOT);

const PROJECT_ID = String(process.env.SANITY_PROJECT_ID || '').trim();
const DATASET = String(process.env.SANITY_DATASET || 'production').trim();
const API_VERSION = String(process.env.SANITY_API_VERSION || '2024-01-01').trim();
const WRITE_TOKEN = String(process.env.SANITY_WRITE_TOKEN || '').trim();

const MAX_BODY_BYTES = Number(process.env.SUBMIT_MAX_BODY_BYTES || 512 * 1024);
const RATE_IP_MAX = Number(process.env.SUBMIT_RATE_IP_MAX || 25);
const RATE_IP_WINDOW_MS = Number(process.env.SUBMIT_RATE_IP_WINDOW_MS || 15 * 60 * 1000);
const RATE_GLOBAL_MAX = Number(process.env.SUBMIT_RATE_GLOBAL_MAX || 200);
const RATE_GLOBAL_WINDOW_MS = Number(
  process.env.SUBMIT_RATE_GLOBAL_WINDOW_MS || 60 * 60 * 1000
);
const MAX_IN_FLIGHT = Number(process.env.SUBMIT_MAX_IN_FLIGHT || 3);
const TECH_CACHE_MS = Number(process.env.SUBMIT_TECH_CACHE_MS || 5 * 60 * 1000);

const ALLOWED_MEDIUMS = new Set(MEDIUMS);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const ipBuckets = new Map();
const globalBucket = {hits: []};
let inFlight = 0;
let techCache = {at: 0, rows: null};

function clientIp(req) {
  const xf = String(req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
  if (xf) return xf.slice(0, 128);
  return String(req.socket.remoteAddress || 'unknown').slice(0, 128);
}

function pruneHits(hits, windowMs, now) {
  const cutoff = now - windowMs;
  let i = 0;
  while (i < hits.length && hits[i] < cutoff) i += 1;
  if (i > 0) hits.splice(0, i);
}

function checkRateLimit(ip, count) {
  const needed = count || 1;
  const now = Date.now();
  pruneHits(globalBucket.hits, RATE_GLOBAL_WINDOW_MS, now);
  if (globalBucket.hits.length + needed > RATE_GLOBAL_MAX) {
    return {
      ok: false,
      retryAfterSec: Math.ceil(RATE_GLOBAL_WINDOW_MS / 1000),
      error: 'Too many submissions right now. Try again later.',
    };
  }

  let bucket = ipBuckets.get(ip);
  if (!bucket) {
    bucket = {hits: []};
    ipBuckets.set(ip, bucket);
  }
  pruneHits(bucket.hits, RATE_IP_WINDOW_MS, now);
  if (bucket.hits.length + needed > RATE_IP_MAX) {
    const oldest = bucket.hits[0] || now;
    return {
      ok: false,
      retryAfterSec: Math.max(
        1,
        Math.ceil((oldest + RATE_IP_WINDOW_MS - now) / 1000)
      ),
      error:
        'Rate limit exceeded. You can submit up to ' +
        RATE_IP_MAX +
        ' entries every ' +
        Math.round(RATE_IP_WINDOW_MS / 60000) +
        ' minutes.',
    };
  }

  return {ok: true};
}

function recordSubmit(ip, count) {
  const n = count || 1;
  const now = Date.now();
  for (let i = 0; i < n; i += 1) globalBucket.hits.push(now);
  let bucket = ipBuckets.get(ip);
  if (!bucket) {
    bucket = {hits: []};
    ipBuckets.set(ip, bucket);
  }
  for (let i = 0; i < n; i += 1) bucket.hits.push(now);

  if (ipBuckets.size > 5000) {
    for (const [key, value] of ipBuckets) {
      pruneHits(value.hits, RATE_IP_WINDOW_MS, now);
      if (!value.hits.length) ipBuckets.delete(key);
    }
  }
}

function key() {
  return Math.random().toString(36).slice(2, 10);
}

function newDocId() {
  return 'caseStudy-' + Date.now().toString(36) + '-' + key();
}

function sendJson(res, status, body, extraHeaders) {
  const payload = JSON.stringify(body);
  const headers = Object.assign(
    {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(payload),
    },
    extraHeaders || {}
  );
  res.writeHead(status, headers);
  res.end(payload);
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    let size = 0;
    req.on('data', function (chunk) {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', function () {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

async function sanityFetch(pathname, options) {
  const url =
    'https://' +
    PROJECT_ID +
    '.api.sanity.io/v' +
    encodeURIComponent(API_VERSION) +
    pathname;
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (e) {
    json = null;
  }
  if (!res.ok) {
    const msg =
      (json && (json.message || json.error)) || text || res.statusText;
    throw new Error('Sanity ' + res.status + ': ' + msg);
  }
  return json;
}

async function fetchTechnologies() {
  const now = Date.now();
  if (techCache.rows && now - techCache.at < TECH_CACHE_MS) {
    return techCache.rows;
  }
  const query =
    '*[_type == "technology" && !(_id in path("drafts.**"))]{ _id, name }';
  const json = await sanityFetch(
    '/data/query/' +
      encodeURIComponent(DATASET) +
      '?query=' +
      encodeURIComponent(query),
    {
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer ' + WRITE_TOKEN,
      },
    }
  );
  const rows = Array.isArray(json && json.result) ? json.result : [];
  techCache = {at: now, rows: rows};
  return rows;
}

function normalizeSubmitter(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const name = String(source.name || '')
    .trim()
    .slice(0, LIMITS.SUBMITTER_NAME);
  const affiliation = String(source.affiliation || '')
    .trim()
    .slice(0, LIMITS.SUBMITTER_AFFILIATION);
  const contact = String(source.contact || '')
    .trim()
    .slice(0, LIMITS.CONTACT);
  const listPublicly = !!source.listPublicly;

  if (listPublicly && !name) {
    throw new Error('Name is required for public credit.');
  }

  if (contact && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
    throw new Error('Enter a valid email address.');
  }

  return {
    anonymous: !listPublicly,
    name: name,
    affiliation: affiliation,
    contact: contact,
    listPublicly: listPublicly,
  };
}

function validDate(value) {
  const match = String(value || '').match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if (!match || Number(match[1]) < 1900 || Number(match[1]) > 2100) return false;
  if (match[2] && (Number(match[2]) < 1 || Number(match[2]) > 12)) return false;
  if (match[3]) {
    const days = new Date(Date.UTC(Number(match[1]), Number(match[2]), 0)).getUTCDate();
    if (Number(match[3]) < 1 || Number(match[3]) > days) return false;
  }
  return true;
}

function buildCaseStudyDoc(input, techByName, submitter) {
  const title = String(input.title || '').trim();
  const medium = String(input.medium || '').trim();
  if (!title) throw new Error('Title is required');
  if (!ALLOWED_MEDIUMS.has(medium)) throw new Error('Invalid type');

  const authors = typeof input.authors === 'string' ? input.authors.trim() : '';
  if (!authors) throw new Error('Author(s)/organization is required');
  if (authors.length > LIMITS.AUTHORS) {
    throw new Error('You’ve reached the maximum number of characters for this field.');
  }

  const techNames = Array.isArray(input.technologies) ? input.technologies : [];
  const technologies = [];
  for (
    let i = 0;
    i < techNames.length && technologies.length < LIMITS.TECHNOLOGIES;
    i++
  ) {
    const tName = String(techNames[i] || '').trim();
    if (!tName) continue;
    const tDoc = techByName[tName];
    if (!tDoc || !tDoc._id) throw new Error('Unknown technology: ' + tName);
    technologies.push({
      _type: 'reference',
      _key: key(),
      _ref: tDoc._id,
    });
  }

  const segments = Array.isArray(input.headlineAnnotations)
    ? input.headlineAnnotations
    : [];
  const headlineSegments = [];
  const occupied = [];

  function overlaps(a0, a1, b0, b1) {
    return a0 < b1 && b0 < a1;
  }

  for (
    let s = 0;
    s < segments.length && headlineSegments.length < LIMITS.HIGHLIGHTS;
    s++
  ) {
    const seg = segments[s];
    const text = String((seg && seg.text) || '')
      .trim()
      .slice(0, LIMITS.HIGHLIGHT_LEN);
    const techLabel = String((seg && seg.technology) || '').trim();
    if (!text) continue;
    if (title.indexOf(text) === -1) {
      throw new Error('Highlight is not part of the title: ' + text);
    }

    let searchFrom = 0;
    let placed = false;
    while (searchFrom <= title.length - text.length) {
      const idx = title.indexOf(text, searchFrom);
      if (idx === -1) break;
      const start = idx;
      const end = idx + text.length;
      let clash = false;
      for (let o = 0; o < occupied.length; o++) {
        if (overlaps(start, end, occupied[o].start, occupied[o].end)) {
          clash = true;
          break;
        }
      }
      if (!clash) {
        occupied.push({start, end});
        placed = true;
        break;
      }
      searchFrom = idx + 1;
    }
    if (!placed) {
      throw new Error('Overlapping title highlights are not allowed');
    }

    const entry = {_type: 'headlineSegment', _key: key(), text: text};
    if (techLabel) {
      const refDoc = techByName[techLabel];
      if (!refDoc || !refDoc._id) {
        throw new Error('Unknown technology for highlight: ' + techLabel);
      }
      entry.technology = {_type: 'reference', _ref: refDoc._id};
    }
    headlineSegments.push(entry);
  }

  const date = String(input.date || '').trim();
  if (!date) throw new Error('Date is required');
  if (!validDate(date)) throw new Error('Enter a valid date.');

  const sourceUrl = String(input.sourceUrl || '').trim().slice(0, LIMITS.URL);
  if (!sourceUrl) throw new Error('URL is required');
  try {
    const u = new URL(sourceUrl);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      throw new Error('bad protocol');
    }
  } catch (e) {
    throw new Error('URL must start with http:// or https://');
  }

  const publishedId = newDocId();
  const doc = {
    _id: 'drafts.' + publishedId,
    _type: 'caseStudy',
    title: title.slice(0, LIMITS.TITLE),
    authors: authors,
    medium: medium,
    provenance: 'Open Submission',
    sensitiveThumbnail: true,
    technologies: technologies,
    headlineSegments: headlineSegments,
    date: date,
    sourceUrl: sourceUrl,
    submitterAnonymous: !!submitter.anonymous,
    listSubmitterPublicly: !!submitter.listPublicly,
  };

  if (submitter.contact) doc.submitterContact = submitter.contact;
  if (submitter.name) doc.submitterName = submitter.name;
  if (submitter.affiliation) doc.submitterAffiliation = submitter.affiliation;

  if (input.source) doc.source = String(input.source).trim().slice(0, LIMITS.SOURCE);

  return {doc: doc, id: publishedId};
}

async function handleSubmit(req, res) {
  if (!PROJECT_ID || !WRITE_TOKEN) {
    sendJson(res, 500, {
      error: 'Submissions are temporarily unavailable. Please try again later.',
    });
    return;
  }

  const ip = clientIp(req);

  if (inFlight >= MAX_IN_FLIGHT) {
    sendJson(
      res,
      503,
      {error: 'Server is busy handling submissions. Try again shortly.'},
      {'Retry-After': '15'}
    );
    return;
  }

  let raw;
  try {
    raw = await readBody(req);
  } catch (e) {
    sendJson(res, 413, {error: e.message || 'Payload too large'});
    return;
  }

  let input;
  try {
    input = raw ? JSON.parse(raw) : {};
  } catch (e) {
    sendJson(res, 400, {error: 'Invalid JSON'});
    return;
  }

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    sendJson(res, 400, {error: 'Invalid payload'});
    return;
  }

  const entries = Array.isArray(input.entries) ? input.entries : null;
  if (!entries || !entries.length) {
    sendJson(res, 400, {error: 'Add at least one entry'});
    return;
  }
  if (entries.length > LIMITS.ENTRIES) {
    sendJson(res, 400, {
      error: 'You can submit up to ' + LIMITS.ENTRIES + ' entries at a time',
    });
    return;
  }

  let submitter;
  try {
    submitter = normalizeSubmitter(input.submitter);
  } catch (e) {
    sendJson(res, 400, {error: e.message || 'Please review your submission details.'});
    return;
  }

  const rate = checkRateLimit(ip, entries.length);
  if (!rate.ok) {
    sendJson(
      res,
      429,
      {error: rate.error},
      {'Retry-After': String(rate.retryAfterSec || 60)}
    );
    return;
  }

  inFlight += 1;
  try {
    const techs = await fetchTechnologies();
    const techByName = {};
    techs.forEach(function (t) {
      if (t && t.name) techByName[String(t.name)] = t;
    });
    const built = entries.map(function (entry, index) {
      try {
        return buildCaseStudyDoc(entry, techByName, submitter);
      } catch (err) {
        const error = new Error(
          'Entry ' + (index + 1) + ': ' + (err.message || 'Please review this entry.')
        );
        error.isEntryValidation = true;
        throw error;
      }
    });
    await sanityFetch(
      '/data/mutate/' + encodeURIComponent(DATASET) + '?returnIds=true',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + WRITE_TOKEN,
        },
        body: JSON.stringify({
          mutations: built.map(function (item) {
            return {create: item.doc};
          }),
        }),
      }
    );
    recordSubmit(ip, built.length);
    sendJson(res, 200, {
      ok: true,
      count: built.length,
      ids: built.map(function (item) {
        return item.id;
      }),
    });
  } catch (e) {
    console.error(e);
    sendJson(res, e.isEntryValidation ? 400 : 500, {
      error: e.isEntryValidation ? e.message : 'We couldn’t submit your entries. Please try again.',
    });
  } finally {
    inFlight = Math.max(0, inFlight - 1);
  }
}

function safeJoin(root, urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split('?')[0]);
  } catch {
    return null;
  }
  if (decoded.includes('\0') || decoded.includes('\\')) return null;
  const parts = decoded.split('/').filter(Boolean);
  if (!['src', 'assets'].includes(parts[0]) ||
      parts.some(part => part.startsWith('.')) ||
      (parts[0] === 'src' && ['server', 'unused'].includes(parts[1]))) return null;
  const full = path.resolve(root, '.' + decoded);
  const relative = path.relative(root, full);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  if (!Object.hasOwn(MIME, path.extname(full).toLowerCase())) return null;
  return full;
}

const PAGE_ROUTES = new Map([
  ['/story', '/src/story/index.html'], ['/home', '/src/home/index.html'],
  ['/database', '/src/database/index.html'], ['/about', '/src/about/index.html'],
  ['/survivor-support', '/src/survivor-support/index.html'],
]);
const LEGACY_ROUTES = new Map([
  ['/index.html', '/story'], ['/home.html', '/home'],
  ['/database.html', '/database'], ['/about.html', '/about'],
  ['/survivor-support.html', '/survivor-support'],
]);

function serveStatic(req, res) {
  let urlPath = req.url.split('?')[0] || '/';
  const params = new URL(req.url, 'http://localhost').searchParams;
  if (urlPath === '/shell.html') urlPath = '/src/shared/shell.html';
  const canonical = LEGACY_ROUTES.get(urlPath) ||
    (urlPath.endsWith('/') && PAGE_ROUTES.has(urlPath.slice(0, -1)) ? urlPath.slice(0, -1) : null);
  if (canonical) {
    const query = new URL(req.url, 'http://localhost').search;
    res.writeHead(308, {Location: canonical + query});
    res.end();
    return;
  }
  const pageFile = urlPath === '/' ? PAGE_ROUTES.get('/home') : PAGE_ROUTES.get(urlPath);
  if (pageFile) {
    urlPath = params.get('content') === '1' ? pageFile : '/src/shared/shell.html';
  }

  // Unknown page addresses return to Home; file requests retain file errors.
  if (!pageFile && urlPath !== '/src/shared/shell.html' &&
      !urlPath.startsWith('/src/') && !urlPath.startsWith('/assets/') &&
      !urlPath.startsWith('/api/') && !urlPath.split('/').some(part => part.startsWith('.'))) {
    res.writeHead(302, {Location: '/home'});
    res.end();
    return;
  }

  const filePath = safeJoin(ROOT, urlPath);
  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, function (err, stat) {
    if (err || !stat.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {'Content-Type': type, 'Content-Length': stat.size});
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  });
}

const server = http.createServer(async function (req, res) {
  const urlPath = (req.url || '/').split('?')[0];

  if ((req.method === 'GET' || req.method === 'HEAD') && urlPath === '/api/config.js') {
    const config = {projectId: PROJECT_ID, dataset: DATASET, apiVersion: API_VERSION, useCdn: true};
    res.writeHead(200, {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    const script = 'window.SANITY_CONFIG = ' + JSON.stringify(config) + ';\n' +
      'window.SUBMISSION_CONSTANTS = ' + JSON.stringify({MEDIUMS, LIMITS}) + ';\n';
    res.end(req.method === 'HEAD' ? undefined : script);
    return;
  }

  if (req.method === 'POST' && urlPath === '/api/submit') {
    await handleSubmit(req, res);
    return;
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    serveStatic(req, res);
    return;
  }

  res.writeHead(405);
  res.end('Method not allowed');
});

server.listen(PORT, function () {
  console.log('Site + submit API at http://localhost:' + PORT);
  if (!WRITE_TOKEN) {
    console.warn('Warning: SANITY_WRITE_TOKEN missing — /api/submit will fail');
  }
});
