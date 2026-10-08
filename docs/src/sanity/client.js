window.SanityClient = (function () {
  'use strict';

  function getConfig() {
    var c = window.SANITY_CONFIG || {};
    return {
      projectId: String(c.projectId || '').trim(),
      dataset: String(c.dataset || 'production').trim(),
      apiVersion: String(c.apiVersion || '2024-01-01').trim(),
      useCdn: c.useCdn !== false
    };
  }

  function normalizeMedium(raw) {
    if (!raw) return '';
    var s = String(raw).trim();
    var map = {
      research: 'Research',
      'news article': 'News Article',
      news: 'News Article',
      report: 'Report',
      spreadsheet: 'Artifact',
      artifact: 'Artifact',
      misc: 'Misc',
      'law & policy': 'Law & Policy',
      'law and policy': 'Law & Policy'
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
      authors: String(doc.authors || '').trim(),
      year: String(doc.year || '').trim(),
      source: String(doc.source || '').trim(),
      medium: normalizeMedium(doc.medium),
      technologies: techs,
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
    '*[_type == "caseStudy" && !(_id in path("drafts.**")) && (!defined(provenance) || provenance != "Annotated Bibliography")] | order(year desc) {' +
    '  _id,' +
    '  title,' +
    '  authors,' +
    '  year,' +
    '  source,' +
    '  medium,' +
    '  sourceUrl,' +
    '  imageUrl,' +
    '  sensitiveThumbnail,' +
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
        new Error('SANITY_PROJECT_ID is not configured in the server environment')
      );
    }

    var headers = {Accept: 'application/json'};

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
