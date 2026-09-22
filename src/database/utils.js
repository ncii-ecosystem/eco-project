window.DatabaseUtils = (function () {
  'use strict';

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function norm(s) {
    return String(s || '').toLowerCase();
  }

  function recordTimestamp(r) {
    if (!r.date) return -Infinity;
    var raw = String(r.date).trim();
    var yearOnly = raw.match(/^(\d{4})$/);
    if (yearOnly) return Date.UTC(Number(yearOnly[1]), 0, 1);
    var t = Date.parse(raw);
    if (!Number.isNaN(t)) return t;
    return -Infinity;
  }

  function formatDisplayDate(r) {
    if (!r.date) return '';
    var raw = String(r.date).trim();
    if (/^\d{4}$/.test(raw)) return raw;
    var m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      var year = Number(m[1]);
      var month = Number(m[2]);
      var day = Number(m[3]);
      var d = new Date(Date.UTC(year, month - 1, day));
      if (Number.isNaN(d.getTime())) return '';
      if (day === 1 && month === 1) return String(year);
      if (day === 1) {
        return d.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC'
        });
      }
      return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC'
      });
    }
    var parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC'
      });
    }
    return '';
  }

  function fallbackColor(key) {
    var s = String(key || 'x');
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return 'hsl(' + (Math.abs(h) % 360) + ', 42%, 52%)';
  }

  function publisherDomain(r) {
    if (!r.sourceUrl) return '';
    try {
      var host = new URL(r.sourceUrl).hostname.replace(/^www\./, '');
      if (host === 'web.archive.org') {
        var m = String(r.sourceUrl).match(
          /web\.archive\.org\/web\/\d+(?:id_)?\/(https?:\/\/[^\s]+)/i
        );
        if (m) {
          try {
            return new URL(m[1]).hostname.replace(/^www\./, '');
          } catch (e2) {}
        }
      }
      return host;
    } catch (e) {
      return '';
    }
  }

  function publisherLogoUrl(r) {
    var domain = publisherDomain(r);
    if (!domain) return '';
    return (
      'https://www.google.com/s2/favicons?domain=' +
      encodeURIComponent(domain) +
      '&sz=128'
    );
  }

  function csvEscape(value) {
    var s = value == null ? '' : String(value);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function recordsToCsv(list) {
    var headers = [
      'title',
      'authors',
      'source',
      'venue',
      'date',
      'medium',
      'provenance',
      'technologies',
      'url'
    ];
    var lines = [headers.join(',')];
    list.forEach(function (r) {
      lines.push(
        [
          csvEscape(r.title),
          csvEscape((r.authors || []).join('; ')),
          csvEscape(r.source),
          csvEscape(r.venue),
          csvEscape(formatDisplayDate(r) || r.date || ''),
          csvEscape(r.medium),
          csvEscape(r.provenance),
          csvEscape((r.technologies || []).join('; ')),
          csvEscape(r.sourceUrl || '')
        ].join(',')
      );
    });
    return lines.join('\n');
  }

  function downloadCsv(filename, csvText) {
    var blob = new Blob([csvText], {type: 'text/csv;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function runFlip(btn, midFn) {
    if (!btn) return;
    var flipMs = 350;
    var swapMs = 160;
    btn.classList.remove('is-flip');
    void btn.offsetWidth;
    btn.classList.add('is-flip');
    window.setTimeout(midFn, swapMs);
    window.setTimeout(function () {
      btn.classList.remove('is-flip');
    }, flipMs);
  }

  return {
    escapeHtml: escapeHtml,
    norm: norm,
    recordTimestamp: recordTimestamp,
    formatDisplayDate: formatDisplayDate,
    fallbackColor: fallbackColor,
    publisherLogoUrl: publisherLogoUrl,
    recordsToCsv: recordsToCsv,
    downloadCsv: downloadCsv,
    runFlip: runFlip
  };
})();
