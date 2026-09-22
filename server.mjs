import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {MEDIUMS, LIMITS} from './submit-constants.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8000);

function loadDotEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  text.split(/\r?\n/).forEach(function (line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  });
}

loadDotEnv();

const PROJECT_ID = String(process.env.SANITY_PROJECT_ID || '').trim();
const DATASET = String(process.env.SANITY_DATASET || 'production').trim();
const API_VERSION = String(process.env.SANITY_API_VERSION || '2024-01-01').trim();
const WRITE_TOKEN = String(process.env.SANITY_WRITE_TOKEN || '').trim();

const MAX_BODY_BYTES = Number(process.env.SUBMIT_MAX_BODY_BYTES || 32 * 1024);
const RATE_IP_MAX = Number(process.env.SUBMIT_RATE_IP_MAX || 5);
const RATE_IP_WINDOW_MS = Number(process.env.SUBMIT_RATE_IP_WINDOW_MS || 15 * 60 * 1000);
const RATE_GLOBAL_MAX = Number(process.env.SUBMIT_RATE_GLOBAL_MAX || 40);
const RATE_GLOBAL_WINDOW_MS = Number(
  process.env.SUBMIT_RATE_GLOBAL_WINDOW_MS || 60 * 60 * 1000
);
const MAX_IN_FLIGHT = Number(process.env.SUBMIT_MAX_IN_FLIGHT || 3);
const TECH_CACHE_MS = Number(process.env.SUBMIT_TECH_CACHE_MS || 5 * 60 * 1000);

const ALLOWED_MEDIUMS = new Set(MEDIUMS);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
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

function checkRateLimit(ip) {
  const now = Date.now();
  pruneHits(globalBucket.hits, RATE_GLOBAL_WINDOW_MS, now);
  if (globalBucket.hits.length >= RATE_GLOBAL_MAX) {
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
  if (bucket.hits.length >= RATE_IP_MAX) {
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

function recordSubmit(ip) {
  const now = Date.now();
  globalBucket.hits.push(now);
  let bucket = ipBuckets.get(ip);
  if (!bucket) {
    bucket = {hits: []};
    ipBuckets.set(ip, bucket);
  }
  bucket.hits.push(now);

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

function buildCaseStudyDoc(input, techByName) {
  const title = String(input.title || '').trim();
  const medium = String(input.medium || '').trim();
  if (!title) throw new Error('Title is required');
  if (!ALLOWED_MEDIUMS.has(medium)) throw new Error('Invalid type');

  const authors = (Array.isArray(input.authors) ? input.authors : [])
    .map(function (a) {
      const name = String((a && a.name) || '').trim();
      if (!name) return null;
      return {
        _type: 'author',
        _key: key(),
        name: name.slice(0, LIMITS.AUTHOR_NAME),
        isOrganization: !!(a && a.isOrganization),
      };
    })
    .filter(Boolean)
    .slice(0, LIMITS.AUTHORS);
  if (!authors.length) throw new Error('At least one author is required');

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

  const dateRaw = String(input.date || '').trim();
  if (!dateRaw) throw new Error('Date is required');
  if (/^\d{4}$/.test(dateRaw)) {
    const y = Number(dateRaw);
    if (y < 1900 || y > 2100) throw new Error('Date year out of range');
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    const m = dateRaw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const dt = new Date(Date.UTC(year, month - 1, day));
    if (
      dt.getUTCFullYear() !== year ||
      dt.getUTCMonth() !== month - 1 ||
      dt.getUTCDate() !== day
    ) {
      throw new Error('Invalid date');
    }
  } else {
    throw new Error('Date must be YYYY or YYYY-MM-DD');
  }

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

  const contact = String(input.contact || '').trim().slice(0, LIMITS.CONTACT);
  if (!contact) throw new Error('Contact email is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
    throw new Error('Enter a valid contact email');
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
    date: dateRaw,
    sourceUrl: sourceUrl,
    submitterContact: contact,
  };

  if (input.source) doc.source = String(input.source).trim().slice(0, LIMITS.SOURCE);
  if (input.venue) doc.venue = String(input.venue).trim().slice(0, LIMITS.VENUE);

  return {doc: doc, id: publishedId};
}

async function handleSubmit(req, res) {
  if (!PROJECT_ID) {
    sendJson(res, 500, {error: 'SANITY_PROJECT_ID is not configured on the server'});
    return;
  }
  if (!WRITE_TOKEN) {
    sendJson(res, 500, {
      error: 'SANITY_WRITE_TOKEN is not configured on the server (.env)',
    });
    return;
  }

  const ip = clientIp(req);
  const rate = checkRateLimit(ip);
  if (!rate.ok) {
    sendJson(
      res,
      429,
      {error: rate.error},
      {'Retry-After': String(rate.retryAfterSec || 60)}
    );
    return;
  }

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

  inFlight += 1;
  try {
    const techs = await fetchTechnologies();
    const techByName = {};
    techs.forEach(function (t) {
      if (t && t.name) techByName[String(t.name)] = t;
    });
    const built = buildCaseStudyDoc(input, techByName);
    await sanityFetch(
      '/data/mutate/' + encodeURIComponent(DATASET) + '?returnIds=true',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + WRITE_TOKEN,
        },
        body: JSON.stringify({mutations: [{create: built.doc}]}),
      }
    );
    recordSubmit(ip);
    sendJson(res, 200, {ok: true, draftId: built.doc._id, id: built.id});
  } catch (e) {
    console.error(e);
    sendJson(res, 400, {error: e.message || 'Could not create draft'});
  } finally {
    inFlight = Math.max(0, inFlight - 1);
  }
}

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const cleaned = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const full = path.join(root, cleaned);
  if (!full.startsWith(root)) return null;
  return full;
}

function serveStatic(req, res) {
  let urlPath = req.url.split('?')[0] || '/';
  if (urlPath === '/') urlPath = '/index.html';

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
    res.writeHead(200, {'Content-Type': type});
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async function (req, res) {
  const urlPath = (req.url || '/').split('?')[0];

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
