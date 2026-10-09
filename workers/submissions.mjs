import {MEDIUMS, LIMITS} from '../src/shared/submit-constants.mjs';

const ALLOWED_MEDIUMS = new Set(MEDIUMS);
const MAX_BODY_BYTES = 512 * 1024;
const RATE_IP_MAX = 25;
const RATE_IP_WINDOW_MS = 15 * 60 * 1000;
const RATE_GLOBAL_MAX = 200;
const RATE_GLOBAL_WINDOW_MS = 60 * 60 * 1000;

const ipBuckets = new Map();
const globalHits = [];
let technologies = {at: 0, rows: null};

function json(body, status, origin, headers) {
  const nextHeaders = new Headers(headers);
  nextHeaders.set('Content-Type', 'application/json; charset=utf-8');
  if (origin) {
    nextHeaders.set('Access-Control-Allow-Origin', origin);
    nextHeaders.set('Vary', 'Origin');
  }
  return new Response(JSON.stringify(body), {status, headers: nextHeaders});
}

function corsOrigin(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = String(env.ALLOWED_ORIGIN || 'https://ncii-ecosystem.org').replace(/\/$/, '');
  return origin && origin === allowed ? origin : '';
}

function prune(hits, now, windowMs) {
  const cutoff = now - windowMs;
  while (hits.length && hits[0] < cutoff) hits.shift();
}

function clientIp(request) {
  return String(request.headers.get('CF-Connecting-IP') || 'unknown').slice(0, 128);
}

function checkRateLimit(ip, count) {
  const now = Date.now();
  prune(globalHits, now, RATE_GLOBAL_WINDOW_MS);
  if (globalHits.length + count > RATE_GLOBAL_MAX) {
    return {error: 'Too many submissions right now. Try again later.', retryAfter: 3600};
  }
  const hits = ipBuckets.get(ip) || [];
  prune(hits, now, RATE_IP_WINDOW_MS);
  ipBuckets.set(ip, hits);
  if (hits.length + count > RATE_IP_MAX) {
    return {
      error: 'Rate limit exceeded. You can submit up to ' + RATE_IP_MAX + ' entries every 15 minutes.',
      retryAfter: Math.max(1, Math.ceil((hits[0] + RATE_IP_WINDOW_MS - now) / 1000)),
    };
  }
  return null;
}

function recordSubmission(ip, count) {
  const now = Date.now();
  const hits = ipBuckets.get(ip) || [];
  for (let i = 0; i < count; i += 1) {
    hits.push(now);
    globalHits.push(now);
  }
  ipBuckets.set(ip, hits);
}

function key() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

function newDocId() {
  return 'caseStudy-' + Date.now().toString(36) + '-' + key();
}

function saneString(value, limit) {
  return String(value || '').trim().slice(0, limit);
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

function normalizeSubmitter(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const submitter = {
    name: saneString(source.name, LIMITS.SUBMITTER_NAME),
    affiliation: saneString(source.affiliation, LIMITS.SUBMITTER_AFFILIATION),
    contact: saneString(source.contact, LIMITS.CONTACT),
    listPublicly: Boolean(source.listPublicly),
  };
  if (submitter.listPublicly && !submitter.name) throw new Error('Name is required for public credit.');
  if (submitter.contact && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitter.contact)) {
    throw new Error('Enter a valid email address.');
  }
  submitter.anonymous = !submitter.listPublicly;
  return submitter;
}

async function sanityFetch(env, pathname, options) {
  const projectId = String(env.SANITY_PROJECT_ID || '').trim();
  const dataset = String(env.SANITY_DATASET || 'production').trim();
  const token = String(env.SANITY_WRITE_TOKEN || '').trim();
  if (!projectId || !token) throw new Error('Sanity is not configured.');
  const response = await fetch('https://' + projectId + '.api.sanity.io/v2024-01-01' + pathname, {
    ...options,
    headers: {...(options && options.headers), Authorization: 'Bearer ' + token},
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) {}
  if (!response.ok) throw new Error('Sanity ' + response.status + ': ' + ((data && (data.message || data.error)) || text));
  return data;
}

async function fetchTechnologies(env) {
  const now = Date.now();
  if (technologies.rows && now - technologies.at < 5 * 60 * 1000) return technologies.rows;
  const dataset = encodeURIComponent(String(env.SANITY_DATASET || 'production'));
  const query = '*[_type == "technology" && !(_id in path("drafts.**"))]{ _id, name }';
  const data = await sanityFetch(env, '/data/query/' + dataset + '?query=' + encodeURIComponent(query), {headers: {Accept: 'application/json'}});
  technologies = {at: now, rows: Array.isArray(data.result) ? data.result : []};
  return technologies.rows;
}

function buildCaseStudyDoc(input, techByName, submitter) {
  const title = saneString(input.title, LIMITS.TITLE);
  const authors = saneString(input.authors, LIMITS.AUTHORS);
  const medium = saneString(input.medium, 100);
  const date = saneString(input.date, 10);
  const sourceUrl = saneString(input.sourceUrl, LIMITS.URL);
  if (!title) throw new Error('Title is required.');
  if (!authors) throw new Error('Author(s)/organization is required.');
  if (!ALLOWED_MEDIUMS.has(medium)) throw new Error('Invalid type.');
  if (!validDate(date)) throw new Error('Enter a valid date.');
  try {
    const url = new URL(sourceUrl);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
  } catch (_) {
    throw new Error('URL must start with http:// or https://.');
  }
  const technologyRefs = [];
  const names = Array.isArray(input.technologies) ? input.technologies : [];
  for (const rawName of names.slice(0, LIMITS.TECHNOLOGIES)) {
    const tech = techByName[saneString(rawName, 200)];
    if (!tech?._id) throw new Error('Unknown technology: ' + rawName);
    technologyRefs.push({_type: 'reference', _key: key(), _ref: tech._id});
  }
  const id = newDocId();
  const doc = {
    _id: 'drafts.' + id,
    _type: 'caseStudy',
    title,
    authors,
    medium,
    date,
    sourceUrl,
    provenance: 'Open Submission',
    sensitiveThumbnail: true,
    technologies: technologyRefs,
    headlineSegments: [],
    submitterAnonymous: submitter.anonymous,
    listSubmitterPublicly: submitter.listPublicly,
  };
  const source = saneString(input.source, LIMITS.SOURCE);
  if (source) doc.source = source;
  if (submitter.contact) doc.submitterContact = submitter.contact;
  if (submitter.name) doc.submitterName = submitter.name;
  if (submitter.affiliation) doc.submitterAffiliation = submitter.affiliation;
  return {doc, id};
}

async function submit(request, env, origin) {
  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > MAX_BODY_BYTES) return json({error: 'Payload too large.'}, 413, origin);
  let input;
  try { input = await request.json(); } catch (_) { return json({error: 'Invalid JSON.'}, 400, origin); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return json({error: 'Invalid payload.'}, 400, origin);
  const entries = Array.isArray(input.entries) ? input.entries : [];
  if (!entries.length) return json({error: 'Add at least one entry.'}, 400, origin);
  if (entries.length > LIMITS.ENTRIES) return json({error: 'You can submit up to ' + LIMITS.ENTRIES + ' entries at a time.'}, 400, origin);
  let submitter;
  try { submitter = normalizeSubmitter(input.submitter); } catch (error) { return json({error: error.message}, 400, origin); }
  const ip = clientIp(request);
  const rate = checkRateLimit(ip, entries.length);
  if (rate) return json({error: rate.error}, 429, origin, {'Retry-After': String(rate.retryAfter)});
  try {
    const techByName = Object.fromEntries((await fetchTechnologies(env)).filter(row => row && row.name).map(row => [String(row.name), row]));
    const built = entries.map((entry, index) => {
      try { return buildCaseStudyDoc(entry || {}, techByName, submitter); }
      catch (error) { throw new Error('Entry ' + (index + 1) + ': ' + error.message); }
    });
    const dataset = encodeURIComponent(String(env.SANITY_DATASET || 'production'));
    await sanityFetch(env, '/data/mutate/' + dataset + '?returnIds=true', {
      method: 'POST',
      headers: {'Accept': 'application/json', 'Content-Type': 'application/json'},
      body: JSON.stringify({mutations: built.map(item => ({create: item.doc}))}),
    });
    recordSubmission(ip, built.length);
    return json({ok: true, count: built.length, ids: built.map(item => item.id)}, 200, origin);
  } catch (error) {
    console.error(error);
    const message = String(error && error.message || '');
    const validation = message.startsWith('Entry ');
    return json({error: validation ? message : 'We couldn’t submit your entries. Please try again.'}, validation ? 400 : 500, origin);
  }
}

export default {
  async fetch(request, env) {
    const origin = corsOrigin(request, env);
    if (request.method === 'OPTIONS') {
      return origin
        ? new Response(null, {status: 204, headers: {'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin'}})
        : new Response(null, {status: 403});
    }
    if (!origin) return json({error: 'Origin not allowed.'}, 403, '');
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/api/submit') return json({error: 'Not found.'}, 404, origin);
    return submit(request, env, origin);
  },
};
