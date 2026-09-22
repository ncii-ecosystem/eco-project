window.SanityClient = (function () {
  'use strict';

  function getConfig() {
    var c = window.SANITY_CONFIG || {};
    return {
      projectId: String(c.projectId || '').trim(),
      dataset: String(c.dataset || 'production').trim(),
      apiVersion: String(c.apiVersion || '2024-01-01').trim(),
      token: String(c.token || '').trim(),
      useCdn: c.useCdn !== false
    };
  }

  function parseAuthorEntry(raw) {
    if (!raw) return null;
    if (typeof raw === 'string') {
      var s = raw.trim();
      return s ? {name: s, isOrganization: false} : null;
    }
    if (typeof raw === 'object') {
      var name = String(raw.name || raw.author || raw.fullName || '').trim();
      if (!name) return null;
      return {name: name, isOrganization: !!raw.isOrganization};
    }
    return null;
  }

  function formatAuthorDisplay(entry) {
    var etAl = /\s+et\s+al\.?$/i.test(entry.name);
    var base = entry.name.replace(/\s+et\s+al\.?$/i, '').trim();
    if (!base) return '';
    if (entry.isOrganization) {
      return etAl ? base + ' et al.' : base;
    }
    if (base.indexOf(',') !== -1) {
      var fromComma = base.split(',')[0].trim();
      return etAl ? fromComma + ' et al.' : fromComma;
    }
    var parts = base.split(/\s+/).filter(Boolean);
    var last = parts[parts.length - 1] || base;
    return etAl ? last + ' et al.' : last;
  }

  function normalizeAuthors(raw) {
    var list = [];
    if (!raw) return list;

    if (Array.isArray(raw)) {
      list = raw.map(parseAuthorEntry).filter(Boolean);
    } else if (typeof raw === 'string') {
      var s = raw.trim();
      if (/\bet\s+al\.?$/i.test(s) && s.indexOf('&') === -1) {
        list = [parseAuthorEntry(s)].filter(Boolean);
      } else if (s.indexOf('&') !== -1) {
        list = s
          .split(/\s*&\s*/)
          .map(parseAuthorEntry)
          .filter(Boolean);
      } else {
        list = s
          .split(/[,;]/)
          .map(function (p) {
            return parseAuthorEntry(p.trim());
          })
          .filter(Boolean);
      }
    }

    var display = list.map(formatAuthorDisplay).filter(Boolean);
    if (display.length > 3) {
      var head = display[0].replace(/\s+et\s+al\.?$/i, '');
      return [head + ' et al.'];
    }
    return display;
  }

  function normalizeMedium(raw) {
    if (!raw) return '';
    var s = String(raw).trim();
    var map = {
      research: 'Research',
      'news article': 'News Article',
      news: 'News Article',
      report: 'Report',
      spreadsheet: 'Spreadsheet'
    };
    return map[s.toLowerCase()] || s;
  }

  function normalizeCaseStudy(doc) {
    if (!doc || typeof doc !== 'object') return null;
    var sensitive = !!doc.sensitiveThumbnail;
    var techs = Array.isArray(doc.technologies)
      ? doc.technologies
          .map(function (t) {
            return String(t || '').trim();
          })
          .filter(Boolean)
      : [];
    var segments = Array.isArray(doc.headlineSegments)
      ? doc.headlineSegments
          .map(function (seg) {
            if (!seg) return null;
            var text = String(seg.text || '').trim();
            if (!text) return null;
            return {
              text: text,
              technology: String(seg.technology || '').trim()
            };
          })
          .filter(Boolean)
      : [];

    return {
      id: String(doc._id || ''),
      title: String(doc.title || '').trim(),
      authors: normalizeAuthors(doc.authors),
      date: doc.date || null,
      source: String(doc.source || '').trim() || String(doc.venue || '').trim(),
      venue: doc.source ? String(doc.venue || '').trim() : '',
      medium: normalizeMedium(doc.medium),
      provenance: String(doc.provenance || '').trim(),
      technologies: techs,
      summary: String(doc.summary || '').trim(),
      sourceUrl: doc.sourceUrl ? String(doc.sourceUrl).trim() : '',
      imageUrl: sensitive ? '' : String(doc.imageUrl || '').trim(),
      sensitiveThumbnail: sensitive,
      headlineAnnotations: segments
    };
  }

  function buildQueryUrl(config, query) {
    var host = config.useCdn
      ? config.projectId + '.apicdn.sanity.io'
      : config.projectId + '.api.sanity.io';
    return (
      'https://' +
      host +
      '/v' +
      encodeURIComponent(config.apiVersion) +
      '/data/query/' +
      encodeURIComponent(config.dataset) +
      '?query=' +
      encodeURIComponent(query)
    );
  }

  var CASE_STUDIES_QUERY =
    '*[_type == "caseStudy" && !(_id in path("drafts.**"))] | order(date desc) {' +
    '  _id,' +
    '  title,' +
    '  authors,' +
    '  date,' +
    '  source,' +
    '  venue,' +
    '  medium,' +
    '  provenance,' +
    '  sourceUrl,' +
    '  imageUrl,' +
    '  sensitiveThumbnail,' +
    '  summary,' +
    '  "technologies": technologies[]->name,' +
    '  headlineSegments[]{' +
    '    text,' +
    '    "technology": technology->name' +
    '  }' +
    '}';

  function fetchJson(url, options) {
    return fetch(url, options).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (body) {
          throw new Error(
            'Sanity ' + res.status + ': ' + (body || res.statusText)
          );
        });
      }
      return res.json();
    });
  }

  function fetchPublishedCaseStudies() {
    var config = getConfig();
    if (!config.projectId) {
      return Promise.reject(
        new Error('SANITY_PROJECT_ID is not configured in src/sanity/config.js')
      );
    }

    var headers = {Accept: 'application/json'};
    if (config.token) {
      headers.Authorization = 'Bearer ' + config.token;
    }

    return fetchJson(buildQueryUrl(config, CASE_STUDIES_QUERY), {
      headers: headers,
      credentials: 'omit'
    }).then(function (json) {
      var rows = Array.isArray(json.result) ? json.result : [];
      return {
        records: rows
          .map(normalizeCaseStudy)
          .filter(function (r) {
            return r && r.title;
          })
      };
    });
  }

  return {
    fetchPublishedCaseStudies: fetchPublishedCaseStudies,
    normalizeCaseStudy: normalizeCaseStudy
  };
})();
