window.DatabaseSubmit = (function () {
  'use strict';

  var state = {
    techs: new Set(),
    highlights: [],
    authors: [{name: '', isOrganization: false}],
    publishing: false,
    pendingSelection: null
  };

  function data() {
    return window.DATABASE;
  }

  function utils() {
    return window.DatabaseUtils;
  }

  function render() {
    return window.DatabaseRender;
  }

  function setStatus(message, isError) {
    var el = document.getElementById('db-submit-status');
    if (!el) return;
    if (!message) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    el.hidden = false;
    el.textContent = message;
    el.classList.toggle('is-error', !!isError);
  }

  function resetFormState() {
    state.techs = new Set();
    state.highlights = [];
    state.authors = [{name: '', isOrganization: false}];
    state.publishing = false;
    state.pendingSelection = null;
    var title = document.getElementById('db-sub-title');
    var paint = document.getElementById('db-sub-title-paint');
    var medium = document.getElementById('db-sub-medium');
    var date = document.getElementById('db-sub-date');
    var source = document.getElementById('db-sub-source');
    var venue = document.getElementById('db-sub-venue');
    var url = document.getElementById('db-sub-url');
    var contact = document.getElementById('db-sub-contact');
    var saveBtn = document.getElementById('db-submit-save');
    if (title) title.value = '';
    if (paint) {
      paint.textContent = '';
    }
    if (date) date.value = '';
    if (source) source.value = '';
    if (venue) venue.value = '';
    if (url) url.value = '';
    if (contact) contact.value = '';
    if (medium && medium.options.length) medium.selectedIndex = 0;
    if (saveBtn) saveBtn.disabled = false;
    setStatus('');
    hideTagPicker();
    renderAuthors();
    renderTechChips();
  }

  function renderAuthors() {
    var root = document.getElementById('db-sub-authors');
    if (!root) return;
    root.innerHTML = '';
    state.authors.forEach(function (author, idx) {
      var row = document.createElement('div');
      row.className = 'db-sub-author-row';

      var input = document.createElement('input');
      input.className = 'db-field-input';
      input.type = 'text';
      input.placeholder = 'Name';
      input.value = author.name || '';
      input.setAttribute('aria-label', 'Author name');
      input.setAttribute('maxlength', String(MAX_AUTHOR_NAME));
      input.addEventListener('input', function () {
        state.authors[idx].name = input.value.slice(0, MAX_AUTHOR_NAME);
      });

      var orgLabel = document.createElement('label');
      orgLabel.className = 'db-sub-author-org';
      var orgCheck = document.createElement('input');
      orgCheck.type = 'checkbox';
      orgCheck.className = 'db-sub-author-org-input';
      orgCheck.checked = !!author.isOrganization;
      orgCheck.setAttribute('aria-label', 'Author is an organization');
      orgCheck.addEventListener('change', function () {
        state.authors[idx].isOrganization = orgCheck.checked;
      });
      var orgBox = document.createElement('span');
      orgBox.className = 'db-sub-author-org-box';
      orgBox.setAttribute('aria-hidden', 'true');
      var orgText = document.createElement('span');
      orgText.className = 'db-sub-author-org-text';
      orgText.textContent = 'org';
      orgLabel.appendChild(orgCheck);
      orgLabel.appendChild(orgBox);
      orgLabel.appendChild(orgText);

      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'db-sub-remove';
      remove.textContent = 'remove';
      remove.hidden = state.authors.length < 2;
      remove.addEventListener('click', function () {
        state.authors.splice(idx, 1);
        if (!state.authors.length) {
          state.authors.push({name: '', isOrganization: false});
        }
        renderAuthors();
      });

      row.appendChild(input);
      row.appendChild(orgLabel);
      row.appendChild(remove);
      root.appendChild(row);
    });
  }

  function renderTechChips() {
    var root = document.getElementById('db-sub-techs');
    if (!root) return;
    var html = '';
    (data().TECHNOLOGY_GROUPS || []).forEach(function (group) {
      var role = (data().ROLE_CLASS && data().ROLE_CLASS[group.label]) || '';
      (group.items || []).forEach(function (label) {
        var active = state.techs.has(label);
        html +=
          '<button type="button" class="db-filter-btn ' +
          role +
          (active ? ' is-active' : '') +
          '" data-tech="' +
          utils().escapeHtml(label) +
          '" aria-pressed="' +
          (active ? 'true' : 'false') +
          '">' +
          render().techIconHtml(label) +
          utils().escapeHtml(label) +
          '</button>';
      });
    });
    root.innerHTML = html;
    root.querySelectorAll('[data-tech]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var label = btn.getAttribute('data-tech');
        if (state.techs.has(label)) {
          state.techs.delete(label);
          state.highlights = state.highlights.filter(function (h) {
            return h.technology !== label;
          });
        } else {
          state.techs.add(label);
        }
        renderTechChips();
        renderHighlightedTitle();
      });
    });
  }

  var L = (window.DatabaseConstants && window.DatabaseConstants.LIMITS) || {};
  var MAX_TITLE = L.TITLE || 500;
  var MAX_AUTHORS = L.AUTHORS || 20;
  var MAX_AUTHOR_NAME = L.AUTHOR_NAME || 200;
  var MAX_HIGHLIGHTS = L.HIGHLIGHTS || 30;
  var MAX_HIGHLIGHT_LEN = L.HIGHLIGHT_LEN || 300;
  var MAX_SOURCE = L.SOURCE || 300;
  var MAX_VENUE = L.VENUE || 300;
  var MAX_URL = L.URL || 2000;
  var MAX_CONTACT = L.CONTACT || 200;
  var MAX_TECHNOLOGIES = L.TECHNOLOGIES || 20;

  function titleValue() {
    var el = document.getElementById('db-sub-title');
    return el ? String(el.value || '') : '';
  }

  function isIconNode(node) {
    var el = node && node.nodeType === 3 ? node.parentElement : node;
    return !!(el && el.closest && el.closest('.db-hl-icon'));
  }

  function paintPlainString(paint) {
    if (!paint) return '';
    var out = '';
    var walker = document.createTreeWalker(paint, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      if (isIconNode(node)) continue;
      out += String(node.textContent || '').replace(/\u00a0/g, ' ');
    }
    return out.replace(/\r\n|\r|\n/g, ' ');
  }

  function paintPlainOffset(paint, container, offset) {
    if (!paint || !container) return -1;

    if (container.nodeType === 1) {
      var before = '';
      var kids = container.childNodes;
      var lim = Math.min(offset, kids.length);
      for (var i = 0; i < lim; i++) {
        before += subtreePlain(kids[i]);
      }
      if (container === paint) return before.length;
      var prefix = plainBeforeNode(paint, container);
      if (prefix < 0) return -1;
      return prefix + before.length;
    }

    if (container.nodeType !== 3) return -1;
    if (isIconNode(container)) {
      var icon = container.parentElement && container.parentElement.closest('.db-hl-icon');
      if (!icon) return -1;
      return plainBeforeNode(paint, icon);
    }

    var base = plainBeforeNode(paint, container);
    if (base < 0) return -1;
    var len = String(container.textContent || '').length;
    return base + Math.max(0, Math.min(offset, len));
  }

  function subtreePlain(node) {
    if (!node) return '';
    if (node.nodeType === 3) {
      if (isIconNode(node)) return '';
      return String(node.textContent || '').replace(/\u00a0/g, ' ').replace(/\r\n|\r|\n/g, ' ');
    }
    if (node.nodeType !== 1) return '';
    if (node.classList && node.classList.contains('db-hl-icon')) return '';
    var out = '';
    for (var i = 0; i < node.childNodes.length; i++) {
      out += subtreePlain(node.childNodes[i]);
    }
    return out;
  }

  function plainBeforeNode(paint, target) {
    var out = '';
    var walker = document.createTreeWalker(paint, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      if (node === target) return out.length;
      if (isIconNode(node)) continue;
      if (target.nodeType === 1 && target.contains(node)) return out.length;
      out += String(node.textContent || '').replace(/\u00a0/g, ' ').replace(/\r\n|\r|\n/g, ' ');
    }
    return -1;
  }

  function syncTitleFromPaint() {
    var title = document.getElementById('db-sub-title');
    var paint = document.getElementById('db-sub-title-paint');
    var plain = paintPlainString(paint).trim().slice(0, MAX_TITLE);
    if (title) title.value = plain;
    pruneHighlights();
  }

  function getCaretPlainOffset(paint) {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount || !paint) return -1;
    var range = sel.getRangeAt(0);
    var node = range.startContainer;
    if (node !== paint && !paint.contains(node)) return -1;
    return paintPlainOffset(paint, node, range.startOffset);
  }

  function setCaretPlainOffset(paint, offset) {
    if (!paint) return;
    var plain = paintPlainString(paint);
    var target = Math.max(0, Math.min(offset, plain.length));
    var walker = document.createTreeWalker(paint, NodeFilter.SHOW_TEXT, null);
    var pos = 0;
    var node;
    while ((node = walker.nextNode())) {
      if (isIconNode(node)) continue;
      var text = String(node.textContent || '').replace(/\u00a0/g, ' ');
      var next = pos + text.length;
      if (target <= next) {
        var range = document.createRange();
        var at = Math.max(0, Math.min(target - pos, text.length));
        range.setStart(node, at);
        range.collapse(true);
        var sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
        return;
      }
      pos = next;
    }
    var endRange = document.createRange();
    endRange.selectNodeContents(paint);
    endRange.collapse(false);
    var endSel = window.getSelection();
    if (endSel) {
      endSel.removeAllRanges();
      endSel.addRange(endRange);
    }
  }

  function normalizeTitleAfterEdit() {
    var paint = document.getElementById('db-sub-title-paint');
    var titleEl = document.getElementById('db-sub-title');
    if (!paint) return;

    var raw = paintPlainString(paint);
    var lead = (raw.match(/^\s*/) || [''])[0].length;
    var caretRaw = getCaretPlainOffset(paint);
    var caretInTitle =
      caretRaw < 0 ? -1 : Math.max(0, Math.min(caretRaw - lead, MAX_TITLE));

    var title = raw.trim().slice(0, MAX_TITLE);
    if (titleEl) titleEl.value = title;
    pruneHighlights();

    if (!title) {
      paint.textContent = '';
      return;
    }

    if (!state.highlights.length) {
      paint.textContent = title;
    } else if (render()) {
      paint.innerHTML = render().renderTitleHtml(
        {
          title: title,
          headlineAnnotations: state.highlights
        },
        {icons: true}
      );
      bindHighlightClicks(paint);
    } else {
      paint.textContent = title;
    }

    if (caretInTitle >= 0) {
      setCaretPlainOffset(paint, caretInTitle);
    }
  }

  function pruneHighlights() {
    state.highlights = dedupeHighlights(titleValue(), state.highlights);
  }

  function dedupeHighlights(title, highlights) {
    if (!title || !highlights || !highlights.length) return [];
    var eligible = highlights.filter(function (h) {
      return (
        h &&
        h.text &&
        String(h.text).length <= MAX_HIGHLIGHT_LEN &&
        state.techs.has(h.technology) &&
        title.indexOf(h.text) !== -1
      );
    });
    var placed = highlightOccupiedRanges(title, eligible);
    var kept = [];
    var remaining = eligible.slice();
    placed.forEach(function (range) {
      for (var i = 0; i < remaining.length; i++) {
        if (
          remaining[i].text === range.text &&
          remaining[i].technology === range.technology
        ) {
          kept.push(remaining[i]);
          remaining.splice(i, 1);
          break;
        }
      }
    });
    return kept.slice(0, MAX_HIGHLIGHTS);
  }

  function hideTagPicker() {
    var picker = document.getElementById('db-sub-tag-picker');
    if (picker) {
      picker.hidden = true;
      picker.innerHTML = '';
    }
    state.pendingSelection = null;
  }

  function highlightOccupiedRanges(title, highlights) {
    var occupied = [];
    if (!title || !highlights || !highlights.length) return occupied;
    var remaining = title;
    var base = 0;
    var left = highlights.slice();
    var guard = 0;
    while (remaining.length && left.length && guard < 80) {
      guard += 1;
      var bestIdx = -1;
      var bestAnn = null;
      var bestLeftIdx = -1;
      for (var i = 0; i < left.length; i++) {
        var phrase = left[i] && left[i].text;
        if (!phrase) continue;
        var idx = remaining.indexOf(phrase);
        if (idx === -1) continue;
        if (bestIdx === -1 || idx < bestIdx) {
          bestIdx = idx;
          bestAnn = left[i];
          bestLeftIdx = i;
        }
      }
      if (bestIdx === -1 || !bestAnn) break;
      var start = base + bestIdx;
      var end = start + bestAnn.text.length;
      occupied.push({
        start: start,
        end: end,
        text: bestAnn.text,
        technology: bestAnn.technology
      });
      remaining = remaining.slice(bestIdx + bestAnn.text.length);
      base = end;
      left.splice(bestLeftIdx, 1);
    }
    return occupied;
  }

  function rangesOverlap(a0, a1, b0, b1) {
    return a0 < b1 && b0 < a1;
  }

  function selectionIntersectsHighlight(range) {
    function hlAncestor(node) {
      if (!node) return null;
      if (node.nodeType === 3) node = node.parentElement;
      return node && node.closest ? node.closest('.db-hl') : null;
    }
    if (hlAncestor(range.startContainer) || hlAncestor(range.endContainer)) {
      return true;
    }
    try {
      var frag = range.cloneContents();
      if (frag.querySelector && frag.querySelector('.db-hl')) return true;
    } catch (e) {}
    return false;
  }

  function getPaintSelection() {
    var root = document.getElementById('db-sub-title-paint');
    if (!root) return null;
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
    var range;
    try {
      range = sel.getRangeAt(0);
    } catch (e) {
      return null;
    }
    if (!root.contains(range.commonAncestorContainer)) return null;
    if (selectionIntersectsHighlight(range)) return null;

    var plain = paintPlainString(root);
    var start = paintPlainOffset(root, range.startContainer, range.startOffset);
    var end = paintPlainOffset(root, range.endContainer, range.endOffset);
    if (start < 0 || end < 0) return null;
    if (start > end) {
      var tmp = start;
      start = end;
      end = tmp;
    }
    if (end <= start) return null;

    while (start < end && /\s/.test(plain.charAt(start))) start += 1;
    while (end > start && /\s/.test(plain.charAt(end - 1))) end -= 1;
    if (end <= start) return null;

    var phrase = plain.slice(start, end);
    if (!phrase || !phrase.trim()) return null;
    if (phrase.length > MAX_HIGHLIGHT_LEN) return null;

    var lead = plain.match(/^\s*/)[0].length;
    var title = plain.trim().slice(0, MAX_TITLE);
    var tStart = start - lead;
    var tEnd = end - lead;
    if (tStart < 0 || tEnd > title.length || tEnd <= tStart) return null;
    if (title.slice(tStart, tEnd) !== phrase) return null;

    var occupied = highlightOccupiedRanges(title, state.highlights);
    for (var o = 0; o < occupied.length; o++) {
      if (rangesOverlap(tStart, tEnd, occupied[o].start, occupied[o].end)) {
        return null;
      }
    }

    return {phrase: phrase, start: tStart, end: tEnd};
  }

  function showTagPicker(selection) {
    var picker = document.getElementById('db-sub-tag-picker');
    if (!picker || !render() || !utils()) return;

    var selected = Array.from(state.techs);
    if (!selected.length) {
      hideTagPicker();
      return;
    }

    state.pendingSelection = selection;
    var html = '';
    selected.forEach(function (label) {
      var role = render().roleClassForTech(label);
      html +=
        '<button type="button" class="db-filter-btn ' +
        role +
        '" data-hl-tech="' +
        utils().escapeHtml(label) +
        '">' +
        render().techIconHtml(label) +
        utils().escapeHtml(label) +
        '</button>';
    });
    picker.innerHTML = html;
    picker.hidden = false;

    picker.querySelectorAll('[data-hl-tech]').forEach(function (btn) {
      btn.addEventListener('mousedown', function (e) {
        e.preventDefault();
      });
      btn.addEventListener('click', function () {
        applyHighlight(
          btn.getAttribute('data-hl-tech'),
          state.pendingSelection
        );
      });
    });
  }

  function applyHighlight(technology, selection) {
    if (!technology || !selection || !selection.phrase) return;
    if (!state.techs.has(technology)) {
      hideTagPicker();
      return;
    }
    if (state.highlights.length >= MAX_HIGHLIGHTS) {
      hideTagPicker();
      setStatus('Too many title highlights.', true);
      return;
    }

    syncTitleFromPaint();
    var title = titleValue();
    var phrase = String(selection.phrase || '').trim();
    if (!phrase || phrase.length > MAX_HIGHLIGHT_LEN) {
      hideTagPicker();
      return;
    }

    var start =
      typeof selection.start === 'number' ? selection.start : title.indexOf(phrase);
    var end =
      typeof selection.end === 'number' ? selection.end : start + phrase.length;
    if (start < 0 || end <= start || end > title.length) {
      hideTagPicker();
      return;
    }
    if (title.slice(start, end) !== phrase) {
      hideTagPicker();
      setStatus('Could not apply tag — try selecting again.', true);
      return;
    }

    var occupied = highlightOccupiedRanges(title, state.highlights);
    for (var o = 0; o < occupied.length; o++) {
      if (rangesOverlap(start, end, occupied[o].start, occupied[o].end)) {
        hideTagPicker();
        setStatus('That text is already tagged.', true);
        return;
      }
    }

    var exists = state.highlights.some(function (h) {
      return h.text === phrase && h.technology === technology;
    });
    if (!exists) {
      state.highlights.push({text: phrase, technology: technology});
    }
    hideTagPicker();
    var sel = window.getSelection();
    if (sel) sel.removeAllRanges();
    setStatus('');
    renderHighlightedTitle();
  }

  function bindHighlightClicks(paint) {
    var spans = paint.querySelectorAll('.db-hl');
    for (var i = 0; i < spans.length; i++) {
      (function (span) {
        var tech =
          span.getAttribute('data-technology') ||
          span.getAttribute('title') ||
          '';
        span.setAttribute('data-technology', tech);
        span.setAttribute('title', 'Click to remove');
        span.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          var clone = span.cloneNode(true);
          var icon = clone.querySelector('.db-hl-icon');
          if (icon) icon.remove();
          var phrase = String(clone.textContent || '').trim();
          var technology = span.getAttribute('data-technology') || '';
          state.highlights = state.highlights.filter(function (h) {
            return !(h.text === phrase && h.technology === technology);
          });
          hideTagPicker();
          renderHighlightedTitle();
        });
      })(spans[i]);
    }
  }

  function renderHighlightedTitle() {
    var paint = document.getElementById('db-sub-title-paint');
    var titleEl = document.getElementById('db-sub-title');
    if (!paint || !render()) return;

    syncTitleFromPaint();
    var title = titleValue();
    if (titleEl) titleEl.value = title;

    if (!title) {
      paint.textContent = '';
      return;
    }

    if (!state.highlights.length) {
      paint.textContent = title;
      return;
    }

    paint.innerHTML = render().renderTitleHtml(
      {
        title: title,
        headlineAnnotations: state.highlights
      },
      {icons: true}
    );
    bindHighlightClicks(paint);
  }

  function onPaintInput() {
    hideTagPicker();
    normalizeTitleAfterEdit();
  }

  function onPaintBlur() {
    window.setTimeout(function () {
      var picker = document.getElementById('db-sub-tag-picker');
      if (picker && !picker.hidden) return;
      normalizeTitleAfterEdit();
    }, 0);
  }

  function onPaintPaste(e) {
    e.preventDefault();
    var text = '';
    try {
      text = (e.clipboardData || window.clipboardData).getData('text/plain') || '';
    } catch (err) {
      text = '';
    }
    text = String(text).replace(/\r\n|\r|\n/g, ' ');
    if (document.queryCommandSupported && document.queryCommandSupported('insertText')) {
      document.execCommand('insertText', false, text);
    } else if (window.getSelection) {
      var sel = window.getSelection();
      if (!sel.rangeCount) return;
      sel.deleteFromDocument();
      sel.getRangeAt(0).insertNode(document.createTextNode(text));
      sel.collapseToEnd();
    }
    onPaintInput();
  }

  function onPaintBeforeInput(e) {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    var node = sel.getRangeAt(0).startContainer;
    if (isIconNode(node)) {
      e.preventDefault();
    }
  }

  function onPaintSelectionEnd() {
    if (state.techs.size === 0) {
      hideTagPicker();
      return;
    }
    var selection = getPaintSelection();
    if (!selection) {
      hideTagPicker();
      return;
    }
    showTagPicker(selection);
  }

  function formatAuthorsForDisplay(authors) {
    if (window.SanityClient && window.SanityClient.normalizeCaseStudy) {
      var normalized = window.SanityClient.normalizeCaseStudy({
        title: 'x',
        authors: authors,
        medium: 'Research'
      });
      return (normalized && normalized.authors) || [];
    }
    return authors
      .map(function (a) {
        return a && a.name ? String(a.name).trim() : '';
      })
      .filter(Boolean);
  }

  function buildDraftRecord() {
    var title = titleValue().trim();
    var medium = (document.getElementById('db-sub-medium') || {}).value || '';
    var dateRaw = ((document.getElementById('db-sub-date') || {}).value || '').trim();
    var source = ((document.getElementById('db-sub-source') || {}).value || '').trim();
    var venue = ((document.getElementById('db-sub-venue') || {}).value || '').trim();
    var sourceUrl = ((document.getElementById('db-sub-url') || {}).value || '').trim();
    var contact = ((document.getElementById('db-sub-contact') || {}).value || '').trim();
    var authorsRaw = state.authors
      .map(function (a) {
        var name = String(a.name || '').trim().slice(0, MAX_AUTHOR_NAME);
        if (!name) return null;
        return {name: name, isOrganization: !!a.isOrganization};
      })
      .filter(Boolean)
      .slice(0, MAX_AUTHORS);

    var techs = Array.from(state.techs);
    var highlights = dedupeHighlights(title, state.highlights);
    highlights.forEach(function (h) {
      if (h.technology && techs.indexOf(h.technology) === -1) {
        techs.push(h.technology);
      }
    });

    return {
      id: 'local-draft',
      title: title.slice(0, MAX_TITLE),
      authors: formatAuthorsForDisplay(authorsRaw),
      authorsRaw: authorsRaw,
      date: dateRaw || null,
      source: source.slice(0, MAX_SOURCE),
      venue: venue.slice(0, MAX_VENUE),
      medium: medium,
      provenance: 'Open Submission',
      technologies: techs.slice(0, MAX_TECHNOLOGIES),
      summary: '',
      sourceUrl: sourceUrl.slice(0, MAX_URL),
      contact: contact.slice(0, MAX_CONTACT),
      imageUrl: '',
      sensitiveThumbnail: true,
      headlineAnnotations: highlights
    };
  }

  function validateDate(value) {
    if (!value) return true;
    if (/^\d{4}$/.test(value)) {
      var y = Number(value);
      return y >= 1900 && y <= 2100;
    }
    var m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return false;
    var year = Number(m[1]);
    var month = Number(m[2]);
    var day = Number(m[3]);
    if (year < 1900 || year > 2100) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    var dt = new Date(Date.UTC(year, month - 1, day));
    return (
      dt.getUTCFullYear() === year &&
      dt.getUTCMonth() === month - 1 &&
      dt.getUTCDate() === day
    );
  }

  function validateUrl(value) {
    if (!value) return true;
    try {
      var u = new URL(value);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch (e) {
      return false;
    }
  }

  function validateContact(value) {
    if (!value) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= MAX_CONTACT;
  }

  function submitEntry(event) {
    if (event) event.preventDefault();
    if (state.publishing) return;

    syncTitleFromPaint();
    var draft = buildDraftRecord();
    if (!draft.title) {
      setStatus('Title is required.', true);
      return;
    }
    if (!(draft.authorsRaw || []).length) {
      setStatus('At least one author is required.', true);
      return;
    }
    if (!draft.medium) {
      setStatus('Type is required.', true);
      return;
    }
    if (!draft.date) {
      setStatus('Date is required.', true);
      return;
    }
    if (!validateDate(draft.date)) {
      setStatus('Date must be YYYY or YYYY-MM-DD.', true);
      return;
    }
    if (!draft.sourceUrl) {
      setStatus('URL is required.', true);
      return;
    }
    if (!validateUrl(draft.sourceUrl)) {
      setStatus('URL must start with http:// or https://.', true);
      return;
    }
    if (!draft.contact) {
      setStatus('Contact email is required.', true);
      return;
    }
    if (!validateContact(draft.contact)) {
      setStatus('Enter a valid contact email.', true);
      return;
    }
    if (!window.SanityWrite || !window.SanityWrite.createDraftCaseStudy) {
      setStatus('Sanity write module missing.', true);
      return;
    }

    var saveBtn = document.getElementById('db-submit-save');

    state.publishing = true;
    if (saveBtn) saveBtn.disabled = true;
    setStatus('Submitting…');

    window.SanityWrite.createDraftCaseStudy({
      title: draft.title,
      authors: draft.authorsRaw,
      date: draft.date,
      source: draft.source,
      venue: draft.venue,
      medium: draft.medium,
      provenance: draft.provenance,
      sourceUrl: draft.sourceUrl,
      contact: draft.contact,
      technologies: draft.technologies,
      headlineAnnotations: draft.headlineAnnotations
    })
      .then(function () {
        setStatus('Submitted as a draft — review in Studio when ready.');
        window.setTimeout(function () {
          state.publishing = false;
          closeSubmit();
        }, 700);
      })
      .catch(function (err) {
        console.error(err);
        setStatus(
          (err && err.message) || 'Could not submit draft to Sanity.',
          true
        );
        state.publishing = false;
        if (saveBtn) saveBtn.disabled = false;
      });
  }

  function fillMediumOptions() {
    var select = document.getElementById('db-sub-medium');
    if (!select) return;
    select.innerHTML = '';
    (data().CONTENT_TYPES || []).forEach(function (label) {
      var opt = document.createElement('option');
      opt.value = label;
      opt.textContent = label;
      select.appendChild(opt);
    });
  }

  function openSubmit() {
    var dialog = document.getElementById('db-submit-dialog');
    if (!dialog) return;
    fillMediumOptions();
    resetFormState();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    var paint = document.getElementById('db-sub-title-paint');
    if (paint) paint.focus();
  }

  function closeSubmit() {
    var dialog = document.getElementById('db-submit-dialog');
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  function bind() {
    var submitBtn = document.getElementById('db-submit');
    var form = document.getElementById('db-submit-form');
    var paint = document.getElementById('db-sub-title-paint');
    var closeSubmitBtn = document.getElementById('db-submit-close');
    var cancelBtn = document.getElementById('db-submit-cancel');
    var addAuthorBtn = document.getElementById('db-sub-add-author');

    if (submitBtn) {
      submitBtn.addEventListener('click', function () {
        openSubmit();
      });
    }
    if (form) {
      form.addEventListener('submit', submitEntry);
    }
    if (paint) {
      paint.addEventListener('beforeinput', onPaintBeforeInput);
      paint.addEventListener('input', onPaintInput);
      paint.addEventListener('blur', onPaintBlur);
      paint.addEventListener('paste', onPaintPaste);
      paint.addEventListener('mouseup', onPaintSelectionEnd);
      paint.addEventListener('keyup', function (e) {
        if (
          e.key === 'Shift' ||
          e.key.indexOf('Arrow') === 0 ||
          e.key === 'Home' ||
          e.key === 'End'
        ) {
          onPaintSelectionEnd();
        }
      });
    }
    if (closeSubmitBtn) closeSubmitBtn.addEventListener('click', closeSubmit);
    if (cancelBtn) cancelBtn.addEventListener('click', closeSubmit);
    if (addAuthorBtn) {
      addAuthorBtn.addEventListener('click', function () {
        if (state.authors.length >= MAX_AUTHORS) {
          setStatus('Author limit is ' + MAX_AUTHORS + '.', true);
          return;
        }
        state.authors.push({name: '', isOrganization: false});
        renderAuthors();
      });
    }

    var submitDialog = document.getElementById('db-submit-dialog');
    if (submitDialog) {
      submitDialog.addEventListener('cancel', function (e) {
        e.preventDefault();
        closeSubmit();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }

  return {open: openSubmit};
})();
