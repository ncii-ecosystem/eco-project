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

  function recordYear(r) {
    return /^\d{4}$/.test(String(r.year || '')) ? Number(r.year) : -Infinity;
  }

  function formatDisplayYear(r) {
    return /^\d{4}$/.test(String(r.year || '')) ? String(r.year) : '';
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
      'link',
      'year',
      'provenance',
      'technologies'
    ];
    var lines = [headers.join(',')];
    list.forEach(function (r) {
      lines.push(
        [
          csvEscape(r.title),
          csvEscape(r.sourceUrl || ''),
          csvEscape(formatDisplayYear(r)),
          csvEscape('http://ncii-ecosysem.org'),
          csvEscape((r.technologies || []).join('; '))
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

  var flipTimers = new WeakMap();

  function runFlip(btn, midFn) {
    if (!btn) return;
    var previous = flipTimers.get(btn);
    if (previous) previous.forEach(window.clearTimeout);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      btn.classList.remove('is-flip');
      midFn();
      return;
    }
    var flipMs = 350;
    var swapMs = 160;
    btn.classList.remove('is-flip');
    void btn.offsetWidth;
    btn.classList.add('is-flip');
    flipTimers.set(btn, [
      window.setTimeout(midFn, swapMs),
      window.setTimeout(function () {
        btn.classList.remove('is-flip');
        flipTimers.delete(btn);
      }, flipMs)
    ]);
  }

  return {
    escapeHtml: escapeHtml,
    norm: norm,
    recordYear: recordYear,
    formatDisplayYear: formatDisplayYear,
    fallbackColor: fallbackColor,
    publisherLogoUrl: publisherLogoUrl,
    recordsToCsv: recordsToCsv,
    downloadCsv: downloadCsv,
    runFlip: runFlip
  };
})();
