window.DatabaseRender = (function () {
  'use strict';

  function u() {
    return window.DatabaseUtils;
  }

  function data() {
    return window.DATABASE;
  }

  function roleClassForTech(label) {
    return (data().TECH_ROLE && data().TECH_ROLE[label]) || '';
  }

  function techIconHtml(label) {
    var icon = data().TECH_ICONS && data().TECH_ICONS[label];
    if (!icon) return '';
    return (
      '<span class="inline-icon" aria-hidden="true">' +
      '<i class="fas ' +
      icon +
      '"></i></span>'
    );
  }

  function renderTitleHtml(r) {
    var escapeHtml = u().escapeHtml;
    var title = r.title || '';
    var anns = r.headlineAnnotations;
    if (!anns || !anns.length) return escapeHtml(title);

    var remaining = title;
    var html = '';
    var guard = 0;

    while (remaining.length && guard < 50) {
      guard += 1;
      var bestIdx = -1;
      var bestAnn = null;
      for (var i = 0; i < anns.length; i++) {
        var phrase = anns[i].text;
        if (!phrase) continue;
        var idx = remaining.indexOf(phrase);
        if (idx === -1) continue;
        if (bestIdx === -1 || idx < bestIdx) {
          bestIdx = idx;
          bestAnn = anns[i];
        }
      }
      if (bestIdx === -1 || !bestAnn) {
        html += escapeHtml(remaining);
        break;
      }
      if (bestIdx > 0) html += escapeHtml(remaining.slice(0, bestIdx));
      html +=
        '<span class="text-highlight ' +
        roleClassForTech(bestAnn.technology) +
        '" data-technology="' +
        escapeHtml(bestAnn.technology || '') +
        '" title="' +
        escapeHtml(bestAnn.technology || '') +
        '">' +
        escapeHtml(bestAnn.text);
      html +=
        ' <span class="text-highlight-icons" aria-hidden="true" contenteditable="false">(' +
        techIconHtml(bestAnn.technology) +
        ')</span>';
      html += '</span>';
      remaining = remaining.slice(bestIdx + bestAnn.text.length);
    }
    return html;
  }

  function techTagsHtml(r) {
    var escapeHtml = u().escapeHtml;
    var techs = (r.technologies || []).filter(Boolean);
    if (!techs.length) return '';
    return (
      '<div class="db-tech-tags" aria-label="Related technologies">' +
      techs
        .map(function (t) {
          var icon = techIconHtml(t);
          var role = roleClassForTech(t);
          if (!icon) {
            return (
              '<span class="db-tech-tag ' +
              role +
              '" title="' +
              escapeHtml(t) +
              '" aria-label="' +
              escapeHtml(t) +
              '">' +
              escapeHtml(t.charAt(0) || '?') +
              '</span>'
            );
          }
          return (
            '<span class="db-tech-tag db-tech-tag--icon ' +
            role +
            '" title="' +
            escapeHtml(t) +
            '" aria-label="' +
            escapeHtml(t) +
            '">' +
            icon +
            '</span>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function authorsMatchOrg(authors, org) {
    return !!authors && !!org && u().norm(authors) === u().norm(org);
  }

  function mediaHtml(r) {
    var escapeHtml = u().escapeHtml;
    var key = r.id || r.title || r.source || 'x';
    var color = u().fallbackColor(key + (r.source || ''));
    var useBrand = r.sensitiveThumbnail || !r.imageUrl;

    if (useBrand) {
      var logo = u().publisherLogoUrl(r);
      var logoImg = logo
        ? '<img class="db-result-media-logo" src="' +
          escapeHtml(logo) +
          '" alt="" loading="lazy" decoding="async" />'
        : '';
      return (
        '<div class="db-result-media db-result-media--brand" aria-hidden="true" style="--db-brand-color:' +
        escapeHtml(color) +
        '">' +
        logoImg +
        '</div>'
      );
    }

    return (
      '<div class="db-result-media" aria-hidden="true">' +
      '<img class="db-result-media-photo" src="' +
      escapeHtml(r.imageUrl) +
      '" alt="" loading="lazy" decoding="async" data-color="' +
      escapeHtml(color) +
      '" data-logo="' +
      escapeHtml(u().publisherLogoUrl(r)) +
      '" />' +
      '</div>'
    );
  }

  function renderResult(r) {
    var escapeHtml = u().escapeHtml;
    var hasLink = !!r.sourceUrl;
    var authors =
      r.authors || '';
    var time = u().formatDisplayDate(r);
    var org = r.source || '';
    var hideAuthors = authorsMatchOrg(authors, org);
    var showAuthors = authors && !hideAuthors;

    var inner =
      '<div class="db-result-top">' +
      '<div class="db-result-top-left">' +
      '<span class="db-result-type">' +
      escapeHtml(r.medium || '') +
      '</span>' +
      techTagsHtml(r) +
      '</div>' +
      (time
        ? '<div class="content-date">' + escapeHtml(time) + '</div>'
        : '<div class="content-date" aria-hidden="true"></div>') +
      '</div>' +
      '<h2 class="content-title">' +
      renderTitleHtml(r) +
      '</h2>' +
      '<div class="db-result-bottom' +
      (hideAuthors ? ' db-result-bottom--org-only' : '') +
      '">' +
      (org
        ? '<div class="db-result-org">' + escapeHtml(org) + '</div>'
        : '<div class="db-result-org" aria-hidden="true"></div>') +
      (showAuthors
        ? '<div class="content-authors">' +
          escapeHtml(authors) +
          '</div>'
        : '<div class="content-authors" aria-hidden="true"></div>') +
      '</div>';

    var linkBlock = hasLink
      ? '<a href="' +
        escapeHtml(r.sourceUrl) +
        '" target="_blank" rel="noopener noreferrer" class="db-result-link">' +
        inner +
        '</a>'
      : '<div class="db-result-link">' + inner + '</div>';

    return (
      '<div class="db-result" data-id="' +
      escapeHtml(r.id) +
      '">' +
      linkBlock +
      mediaHtml(r) +
      '</div>'
    );
  }

  function bindMediaFallbacks(root) {
    if (!root) return;
    var photos = root.querySelectorAll('.db-result-media-photo');
    for (var i = 0; i < photos.length; i++) {
      (function (img) {
        img.addEventListener(
          'error',
          function () {
            var parent = img.parentNode;
            if (!parent) return;
            parent.classList.add('db-result-media--brand');
            parent.style.setProperty(
              '--db-brand-color',
              img.getAttribute('data-color') || '#8a8a8a'
            );
            var logo = img.getAttribute('data-logo') || '';
            if (logo) {
              img.className = 'db-result-media-logo';
              img.removeAttribute('data-color');
              img.removeAttribute('data-logo');
              img.src = logo;
            } else {
              img.remove();
            }
          },
          {once: true}
        );
      })(photos[i]);
    }
  }

  return {
    techIconHtml: techIconHtml,
    roleClassForTech: roleClassForTech,
    renderTitleHtml: renderTitleHtml,
    renderResult: renderResult,
    bindMediaFallbacks: bindMediaFallbacks
  };
})();
