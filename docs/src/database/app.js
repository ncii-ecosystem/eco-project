(function () {
  'use strict';

  var data = window.DATABASE;
  var utils = window.DatabaseUtils;
  var render = window.DatabaseRender;
  if (!data || !utils || !render) return;

  var records = [];
  var selectedTech = new Set();
  var selectedTypes = new Set();
  var searchQuery = '';
  var sortKey = 'date';
  var sortDir = 'desc';
  var searchBlobs = new WeakMap();
  var techCounts = new Map();
  var typeCounts = new Map();
  var titleCollator = new Intl.Collator(undefined, {sensitivity: 'base'});
  var loadVersion = 0;

  var els = {
    search: document.getElementById('db-search'),
    tech: document.getElementById('db-tech-filters'),
    types: document.getElementById('db-type-filters'),
    results: document.getElementById('db-results'),
    submit: document.getElementById('db-submit'),
    exportBtn: document.getElementById('db-export')
  };

  function countByTech(label) {
    return techCounts.get(label) || 0;
  }

  function countByType(label) {
    return typeCounts.get(label) || 0;
  }

  function recordSearchBlob(r) {
    var parts = [r.title, r.source, r.medium];
    if (r.authors) parts = parts.concat(r.authors);
    if (r.technologies) parts = parts.concat(r.technologies);
    return utils.norm(parts.filter(Boolean).join(' '));
  }

  function matchesFilters(r) {
    if (selectedTypes.size > 0 && !selectedTypes.has(r.medium)) {
      return false;
    }
    if (selectedTech.size > 0) {
      var techs = r.technologies || [];
      var hit = false;
      selectedTech.forEach(function (t) {
        if (techs.indexOf(t) !== -1) hit = true;
      });
      if (!hit) return false;
    }
    if (searchQuery) {
      if (searchBlobs.get(r).indexOf(searchQuery) === -1) return false;
    }
    return true;
  }

  function filteredRecords() {
    var list = records.filter(matchesFilters);
    var dir = sortDir === 'asc' ? 1 : -1;
    list.sort(function (a, b) {
      var cmp = 0;
      if (sortKey === 'title') {
        cmp = titleCollator.compare(String(a.title || ''), String(b.title || ''));
      } else {
        var at = utils.recordDate(a);
        var bt = utils.recordDate(b);
        cmp = at === bt ? 0 : at < bt ? -1 : 1;
        if (cmp === 0) {
          cmp = titleCollator.compare(String(a.title || ''), String(b.title || ''));
        }
      }
      return cmp * dir;
    });
    return list;
  }

  function updateFilterCounts(count) {
    var n = typeof count === 'number' ? count : 0;
    var entryLabel = n === 1 ? 'entry' : 'entries';
    if (els.search) {
      els.search.placeholder = 'Search ' + n + ' ' + entryLabel;
    }
    if (els.exportBtn) {
      els.exportBtn.textContent = 'Export ' + n + ' ' + entryLabel;
      els.exportBtn.disabled = n === 0;
      els.exportBtn.setAttribute('aria-disabled', n === 0 ? 'true' : 'false');
    }
  }

  function renderResults() {
    var list = filteredRecords();
    updateFilterCounts(list.length);
    if (!els.results) return;
    els.results.removeAttribute('aria-busy');
    if (!list.length) {
      els.results.innerHTML =
        '<p class="db-empty">No records match the current search and filters.</p>';
      return;
    }
    els.results.innerHTML = list.map(render.renderResult).join('');
    render.bindMediaFallbacks(els.results);
  }

  function toggleSet(set, value, btn) {
    var active = !set.has(value);
    if (active) set.add(value);
    else set.delete(value);
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
    renderResults();
  }

  function clearTypeSelection() {
    selectedTypes.clear();
    if (!els.types) return;
    els.types.querySelectorAll('[data-type]').forEach(function (btn) {
      btn.classList.remove('is-active');
      btn.setAttribute('aria-pressed', 'false');
    });
  }

  function buildTypeFilters() {
    if (!els.types) return;
    var typeLabels = {'News Article': 'News'};
    var html =
      '<button type="button" class="db-filter-btn is-active" data-type-all="1" aria-pressed="true">All (' +
      records.length +
      ')</button>';

    data.CONTENT_TYPES.forEach(function (label) {
      var n = countByType(label);
      var display = typeLabels[label] || label;
      html +=
        '<button type="button" class="db-filter-btn" data-type="' +
        utils.escapeHtml(label) +
        '" aria-pressed="false">' +
        utils.escapeHtml(display) +
        ' (' +
        n +
        ')</button>';
    });
    els.types.innerHTML = html;

    var allBtn = els.types.querySelector('[data-type-all]');
    if (allBtn) {
      allBtn.addEventListener('click', function () {
        clearTypeSelection();
        allBtn.classList.add('is-active');
        allBtn.setAttribute('aria-pressed', 'true');
        renderResults();
      });
    }

    els.types.querySelectorAll('[data-type]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (allBtn) {
          allBtn.classList.remove('is-active');
          allBtn.setAttribute('aria-pressed', 'false');
        }
        toggleSet(selectedTypes, btn.getAttribute('data-type'), btn);
        if (selectedTypes.size === 0 && allBtn) {
          allBtn.classList.add('is-active');
          allBtn.setAttribute('aria-pressed', 'true');
        }
      });
    });
  }

  function buildTechFilters() {
    if (!els.tech) return;
    var html = '';
    data.TECHNOLOGY_GROUPS.forEach(function (group) {
      var role = (data.ROLE_CLASS && data.ROLE_CLASS[group.label]) || '';
      html +=
        '<div class="db-filter-group" role="group" aria-label="' +
        utils.escapeHtml(group.label) +
        '">' +
        '<h3 class="page-label">' +
        utils.escapeHtml(group.label) +
        '</h3>' +
        '<div class="db-filter-group-chips">';
      group.items.forEach(function (label) {
        var n = countByTech(label);
        html +=
          '<button type="button" class="db-filter-btn ' +
          role +
          '" data-tech="' +
          utils.escapeHtml(label) +
          '" aria-pressed="false">' +
          render.techIconHtml(label) +
          utils.escapeHtml(label) +
          ' (' +
          n +
          ')</button>';
      });
      html += '</div></div>';
    });
    els.tech.innerHTML = html;

    els.tech.querySelectorAll('[data-tech]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        toggleSet(selectedTech, btn.getAttribute('data-tech'), btn);
      });
    });
  }

  if (els.search) {
    els.search.addEventListener('input', function () {
      searchQuery = utils.norm(els.search.value.trim());
      renderResults();
    });
  }

  (function bindSortControls() {
    var root = document.getElementById('db-sort');
    if (!root) return;
    var keyBtn = document.getElementById('db-sort-key');
    var dirBtn = document.getElementById('db-sort-dir');

    function syncKeyButton(animate) {
      if (!keyBtn) return;
      var byDate = sortKey === 'date';
      var label = byDate ? 'date' : 'a–z';
      var labelEl = keyBtn.querySelector('.db-sort-btn-label');
      keyBtn.setAttribute('data-sort', sortKey);
      keyBtn.setAttribute(
        'aria-label',
        byDate
          ? 'Sort by date. Click to switch to a–z.'
          : 'Sort a–z. Click to switch to date.'
      );
      function applyLabel() {
        if (labelEl) labelEl.textContent = label;
        else keyBtn.textContent = label;
      }
      if (animate) utils.runFlip(keyBtn, applyLabel);
      else applyLabel();
    }

    function syncDirButton(animate) {
      if (!dirBtn) return;
      var descending = sortDir === 'desc';
      var glyph = descending ? '↓' : '↑';
      var glyphEl = dirBtn.querySelector('.db-sort-arrow-glyph');
      dirBtn.classList.toggle('is-desc', descending);
      dirBtn.classList.toggle('is-asc', !descending);
      dirBtn.title = descending ? 'Descending' : 'Ascending';
      dirBtn.setAttribute(
        'aria-label',
        descending
          ? 'Sort descending. Click to reverse.'
          : 'Sort ascending. Click to reverse.'
      );
      function applyGlyph() {
        if (glyphEl) glyphEl.textContent = glyph;
        else dirBtn.textContent = glyph;
      }
      if (animate) utils.runFlip(dirBtn, applyGlyph);
      else applyGlyph();
    }

    if (keyBtn) {
      keyBtn.addEventListener('click', function () {
        sortKey = sortKey === 'date' ? 'title' : 'date';
        syncKeyButton(true);
        renderResults();
      });
      syncKeyButton(false);
    }

    if (dirBtn) {
      dirBtn.addEventListener('click', function () {
        sortDir = sortDir === 'desc' ? 'asc' : 'desc';
        syncDirButton(true);
        renderResults();
      });
      syncDirButton(false);
    }
  })();

  if (els.exportBtn) {
    els.exportBtn.addEventListener('click', function () {
      var list = filteredRecords();
      if (!list.length) {
        window.alert('No sources match the current filters.');
        return;
      }
      var stamp = new Date().toISOString().slice(0, 10);
      utils.downloadCsv(
        'ncii-ecosystem-' + stamp + '.csv',
        utils.recordsToCsv(list)
      );
    });
  }

  function showStatus(message) {
    if (els.results) {
      els.results.removeAttribute('aria-busy');
      els.results.innerHTML =
        '<p class="db-empty">' + utils.escapeHtml(message) + '</p>';
    }
  }

  function showSkeletons() {
    if (!els.results) return;
    els.results.setAttribute('aria-busy', 'true');
    var row =
      '<div class="db-result db-result--skeleton" aria-hidden="true">' +
      '<div class="db-result-link">' +
      '<div class="db-result-top">' +
      '<span class="db-skel db-skel--chip"></span>' +
      '<span class="db-skel db-skel--chip db-skel--short"></span>' +
      '</div>' +
      '<div class="db-skel db-skel--title"></div>' +
      '<div class="db-skel db-skel--meta"></div>' +
      '</div>' +
      '<div class="db-result-media db-skel-media"></div>' +
      '</div>';
    els.results.innerHTML = new Array(7).fill(row).join('');
  }

  function mountData(nextRecords) {
    records = Array.isArray(nextRecords) ? nextRecords : [];
    searchBlobs = new WeakMap();
    techCounts.clear();
    typeCounts.clear();
    records.forEach(function (record) {
      searchBlobs.set(record, recordSearchBlob(record));
      typeCounts.set(record.medium, (typeCounts.get(record.medium) || 0) + 1);
      new Set(record.technologies || []).forEach(function (technology) {
        techCounts.set(technology, (techCounts.get(technology) || 0) + 1);
      });
    });
    selectedTech.clear();
    selectedTypes.clear();
    buildTypeFilters();
    buildTechFilters();
    renderResults();
  }

  function loadFromSanity() {
    var version = ++loadVersion;
    showSkeletons();
    if (!window.SanityClient || !window.SanityClient.fetchPublishedCaseStudies) {
      mountData([]);
      showStatus('The database is temporarily unavailable. Please try again later.');
      return;
    }
    window.SanityClient.fetchPublishedCaseStudies()
      .then(function (result) {
        if (version !== loadVersion) return;
        mountData(result.records || []);
      })
      .catch(function (err) {
        if (version !== loadVersion) return;
        console.error(err);
        mountData([]);
        showStatus('The database could not be loaded. Please try again later.');
      });
  }

  loadFromSanity();
  window.addEventListener('db:reload', loadFromSanity);

  (function initSidebarToggle() {
    var KEY = 'db-sidebar-collapsed';
    var KEY_MOBILE = 'db-sidebar-collapsed-mobile';
    var MQ = '(max-width: 720px)';
    var btn = document.getElementById('db-sidebar-toggle');
    var side = document.getElementById('side');
    if (!btn || !side) return;

    function isMobile() {
      return window.matchMedia(MQ).matches;
    }

    function storageKey() {
      return isMobile() ? KEY_MOBILE : KEY;
    }

    function syncMobileChromeHeight() {
      if (!isMobile()) {
        document.body.style.removeProperty('--db-mobile-chrome-h');
        return;
      }
      document.body.style.setProperty(
        '--db-mobile-chrome-h',
        side.offsetHeight + 'px'
      );
    }

    function setCollapsed(collapsed) {
      var mobile = isMobile();
      var expanded = mobile && !collapsed;
      document.documentElement.classList.toggle('db-sidebar-collapsed', !mobile && collapsed);
      document.documentElement.classList.toggle('db-sidebar-expanded', expanded);
      document.body.classList.toggle('db-sidebar-collapsed', !mobile && collapsed);
      document.body.classList.toggle('db-sidebar-expanded', expanded);

      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      var showLabel = 'Show filters';
      var hideLabel = mobile ? 'Hide filters' : 'Put filters away';
      btn.title = collapsed ? showLabel : hideLabel;
      btn.setAttribute('aria-label', collapsed ? showLabel : hideLabel);
      try {
        localStorage.setItem(storageKey(), collapsed ? '1' : '0');
      } catch (e) {}
      window.requestAnimationFrame(syncMobileChromeHeight);
    }

    function isCollapsed() {
      if (isMobile()) {
        return !document.body.classList.contains('db-sidebar-expanded');
      }
      return document.body.classList.contains('db-sidebar-collapsed');
    }

    function readSaved() {
      try {
        return localStorage.getItem(storageKey());
      } catch (e) {
        return null;
      }
    }

    function syncFromStorage() {
      var saved = readSaved();
      if (isMobile()) {
        setCollapsed(saved !== '0');
        return;
      }
      setCollapsed(saved === '1');
    }

    syncFromStorage();

    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        document.body.classList.add('db-sidebar-ready');
        syncMobileChromeHeight();
      });
    });

    btn.addEventListener('click', function () {
      setCollapsed(!isCollapsed());
    });

    var mq = window.matchMedia(MQ);
    function onViewportChange() {
      syncFromStorage();
      syncMobileChromeHeight();
    }
    if (mq.addEventListener) mq.addEventListener('change', onViewportChange);
    else if (mq.addListener) mq.addListener(onViewportChange);

    window.addEventListener('resize', syncMobileChromeHeight);

    if (typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(syncMobileChromeHeight);
      ro.observe(side);
    }
  })();
})();
