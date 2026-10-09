window.DatabaseSubmit = (function () {
  'use strict';

  var state = {
    entries: [],
    openIndex: 0,
    publishing: false
  };

  var limitUpdates = [];

  function refreshLimitMessages() {
    limitUpdates.forEach(function (update) { update(); });
    updateSubmitAvailability();
  }

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

  function blankEntry() {
    return {
      title: '',
      techs: new Set(),
      authors: '',
      medium: '',
      date: '',
      source: '',
      url: ''
    };
  }

  function currentEntry() {
    return state.entries[state.openIndex] || null;
  }

  function fieldValue(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || '') : '';
  }

  function readOpenEntry() {
    var entry = currentEntry();
    if (!entry) return;
    entry.title = fieldValue('db-sub-title').slice(0, MAX_TITLE);
    entry.authors = fieldValue('db-sub-authors-input').trim();
    entry.medium = fieldValue('db-sub-medium');
    entry.date = fieldValue('db-sub-date').trim();
    entry.source = fieldValue('db-sub-source').trim().slice(0, MAX_SOURCE);
    entry.url = fieldValue('db-sub-url').trim().slice(0, MAX_URL);
  }

  function writeOpenEntry() {
    var entry = currentEntry();
    if (!entry) return;
    var title = document.getElementById('db-sub-title');
    var authors = document.getElementById('db-sub-authors-input');
    var medium = document.getElementById('db-sub-medium');
    var date = document.getElementById('db-sub-date');
    var source = document.getElementById('db-sub-source');
    var url = document.getElementById('db-sub-url');
    if (title) title.value = entry.title || '';
    if (authors) authors.value = entry.authors || '';
    if (date) date.value = entry.date || '';
    if (source) source.value = entry.source || '';
    if (url) url.value = entry.url || '';
    if (medium) {
      if (entry.medium) medium.value = entry.medium;
      else if (medium.options.length) medium.selectedIndex = 0;
    }
    refreshLimitMessages();
  }

  function updateIdentityUI() {
    var nameReq = document.getElementById('db-sub-name-req');
    var name = document.getElementById('db-sub-name');
    var listPublicly = document.getElementById('db-sub-list-publicly');
    var required = !!(listPublicly && listPublicly.checked);
    if (nameReq) nameReq.hidden = !required;
    if (name) {
      name.required = required;
      name.setAttribute('aria-required', String(required));
      name.setCustomValidity(required && !name.value.trim() ? 'Name is required for public credit.' : '');
    }
  }

  function resetFormState() {
    state.entries = [blankEntry()];
    state.openIndex = 0;
    state.publishing = false;
    var saveBtn = document.getElementById('db-submit-save');
    var name = document.getElementById('db-sub-name');
    var affiliation = document.getElementById('db-sub-affiliation');
    var contact = document.getElementById('db-sub-contact');
    var listPublicly = document.getElementById('db-sub-list-publicly');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Submit for review';
    }
    if (name) name.value = '';
    if (affiliation) affiliation.value = '';
    if (contact) contact.value = '';
    if (listPublicly) listPublicly.checked = false;
    setStatus('');
    updateIdentityUI();
    writeOpenEntry();
    renderEntryList();
    renderTechChips();
  }

  function renderEntryList() {
    var root = document.getElementById('db-sub-entry-list');
    var editor = document.getElementById('db-sub-editor');
    if (!root) return;
    if (editor && editor.parentNode) editor.parentNode.removeChild(editor);
    root.innerHTML = '';
    state.entries.forEach(function (entry, idx) {
      var open = idx === state.openIndex;
      var row = document.createElement('div');
      row.className = 'db-sub-entry-row' + (open ? ' is-open' : '');

      var head = document.createElement('div');
      head.className = 'db-sub-entry-head';

      var label = document.createElement('div');
      label.className = 'db-sub-entry';
      var index = document.createElement('span');
      index.className = 'db-sub-entry-index';
      index.textContent = String(idx + 1);
      var title = document.createElement('span');
      title.className = 'db-sub-entry-title';
      title.textContent = 'entry';
      var entryTitle = String(entry.title || '').trim().replace(/\s+/g, ' ');
      if (!open && entryTitle) {
        var characters = Array.from(entryTitle);
        var shortTitle = characters.length > 40
          ? characters.slice(0, 39).join('').trimEnd() + '…'
          : entryTitle;
        title.textContent = '"' + shortTitle + '" entry';
        title.title = entryTitle;
      }
      label.appendChild(index);
      label.appendChild(title);

      var actions = document.createElement('div');
      actions.className = 'db-sub-entry-actions';

      var edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'db-sub-entry-action';
      edit.innerHTML = '<i class="fas fa-fw ' + (open ? 'fa-chevron-up' : 'fa-chevron-down') + '" aria-hidden="true"></i>';
      edit.title = open ? 'Close entry' : 'Edit entry';
      edit.setAttribute('aria-expanded', open ? 'true' : 'false');
      edit.setAttribute('aria-label', (open ? 'Close' : 'Edit') + ' entry ' + (idx + 1));
      edit.addEventListener('click', function () {
        openEntry(idx);
      });

      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'db-sub-entry-action';
      remove.innerHTML = '<i class="fas fa-fw fa-trash-alt" aria-hidden="true"></i>';
      remove.title = 'Remove entry';
      remove.setAttribute('aria-label', 'Remove entry ' + (idx + 1));
      remove.addEventListener('click', function () {
        removeEntry(idx);
      });

      actions.appendChild(edit);
      actions.appendChild(remove);
      head.appendChild(label);
      head.appendChild(actions);
      row.appendChild(head);
      root.appendChild(row);
    });

    refreshLimitMessages();
    if (!editor) return;
    var openRow = state.openIndex >= 0 ? root.children[state.openIndex] : null;
    if (openRow) {
      openRow.appendChild(editor);
      editor.hidden = false;
    } else {
      editor.hidden = true;
      if (root.parentNode) root.parentNode.appendChild(editor);
    }
  }

  function openEntry(idx) {
    if (idx < 0 || idx >= state.entries.length) return;
    readOpenEntry();
    if (idx === state.openIndex) {
      state.openIndex = -1;
      renderEntryList();
      return;
    }
    state.openIndex = idx;
    writeOpenEntry();
    renderEntryList();
    renderTechChips();
  }

  function removeEntry(idx) {
    if (idx < 0 || idx >= state.entries.length) return;
    readOpenEntry();
    if (state.entries.length < 2) {
      state.entries = [blankEntry()];
      state.openIndex = 0;
    } else {
      state.entries.splice(idx, 1);
      if (state.openIndex > idx) state.openIndex -= 1;
      if (state.openIndex >= state.entries.length) {
        state.openIndex = state.entries.length - 1;
      }
    }
    writeOpenEntry();
    renderEntryList();
    renderTechChips();
  }

  function renderTechChips() {
    var root = document.getElementById('db-sub-techs');
    var entry = currentEntry();
    if (!root || !entry) return;
    var html = '';
    (data().TECHNOLOGY_GROUPS || []).forEach(function (group) {
      var role = (data().ROLE_CLASS && data().ROLE_CLASS[group.label]) || '';
      (group.items || []).forEach(function (label) {
        var active = entry.techs.has(label);
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

  }

  var L = (window.DatabaseConstants && window.DatabaseConstants.LIMITS) || {};
  var MAX_TITLE = L.TITLE || 500;
  var MAX_AUTHORS = L.AUTHORS || 4038;
  var MAX_SOURCE = L.SOURCE || 300;
  var MAX_URL = L.URL || 2000;
  var MAX_CONTACT = L.CONTACT || 200;
  var MAX_NAME = L.SUBMITTER_NAME || 200;
  var MAX_AFFILIATION = L.SUBMITTER_AFFILIATION || 300;
  var MAX_TECHNOLOGIES = L.TECHNOLOGIES || 20;
  var MAX_ENTRIES = L.ENTRIES || 25;

  function onTitleInput() {
    var title = document.getElementById('db-sub-title');
    var entry = currentEntry();
    if (!title || !entry) return;
    title.value = String(title.value || '').slice(0, MAX_TITLE);
    entry.title = title.value;
  }

  function validateDate(value) {
    var match = String(value || '').match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
    if (!match || Number(match[1]) < 1900 || Number(match[1]) > 2100) return false;
    if (match[2] && (Number(match[2]) < 1 || Number(match[2]) > 12)) return false;
    if (match[3]) {
      var days = new Date(Date.UTC(Number(match[1]), Number(match[2]), 0)).getUTCDate();
      if (Number(match[3]) < 1 || Number(match[3]) > days) return false;
    }
    return true;
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

  function readSubmitter() {
    var name = document.getElementById('db-sub-name');
    var affiliation = document.getElementById('db-sub-affiliation');
    var contact = document.getElementById('db-sub-contact');
    var listPublicly = document.getElementById('db-sub-list-publicly');
    var listing = !!(listPublicly && listPublicly.checked);
    return {
      anonymous: !listing,
      name: name ? String(name.value || '').trim().slice(0, MAX_NAME) : '',
      affiliation: affiliation
        ? String(affiliation.value || '').trim().slice(0, MAX_AFFILIATION)
        : '',
      contact: contact ? String(contact.value || '').trim().slice(0, MAX_CONTACT) : '',
      listPublicly: !!(listPublicly && listPublicly.checked)
    };
  }

  function entryError(entry, index) {
    var prefix = 'Entry ' + (index + 1) + ': ';
    if (!String(entry.title || '').trim()) return prefix + 'Title is required.';
    if (!entry.authors) return prefix + 'Author(s)/organization is required.';
    if (entry.authors.length > MAX_AUTHORS) return prefix + 'You’ve reached the maximum number of characters for this field.';
    if (!entry.medium) return prefix + 'Type is required.';
    if (!entry.date) return prefix + 'Date is required.';
    if (!validateDate(entry.date)) return prefix + 'Enter a valid date.';
    if (!entry.url) return prefix + 'URL is required.';
    if (!validateUrl(entry.url)) return prefix + 'URL must start with http:// or https://.';
    return '';
  }

  function updateSubmitAvailability() {
    updateIdentityUI();
    var button = document.getElementById('db-submit-save');
    if (!button) return;
    readOpenEntry();
    var submitter = readSubmitter();
    var problem = submitter.listPublicly && !submitter.name ? 'Name is required for public credit.' : '';
    state.entries.forEach(function (entry, index) {
      if (!problem) problem = entryError(entry, index);
    });
    if (!problem && submitter.contact && !validateContact(submitter.contact)) {
      problem = 'Enter a valid email address.';
    }
    button.disabled = state.publishing || state.entries.length === 0 || !!problem;
  }

  function submitEntry(event) {
    if (event) event.preventDefault();
    if (state.publishing) return;

    readOpenEntry();
    var submitter = readSubmitter();

    if (submitter.listPublicly && !submitter.name) {
      setStatus('Name is required for public credit.', true);
      updateSubmitAvailability();
      document.getElementById('db-sub-name').focus();
      return;
    }

    var problemIndex = -1;
    var problem = '';
    state.entries.forEach(function (entry, idx) {
      if (problem) return;
      var message = entryError(entry, idx);
      if (message) {
        problem = message;
        problemIndex = idx;
      }
    });
    if (problem) {
      if (problemIndex !== state.openIndex) openEntry(problemIndex);
      var invalidEntry = state.entries[problemIndex];
      if (!invalidEntry.url || !validateUrl(invalidEntry.url)) {
        refreshLimitMessages();
        var urlInput = document.getElementById('db-sub-url');
        var urlHint = document.getElementById('db-sub-url-limit');
        if (!invalidEntry.url && urlHint) {
          urlHint.textContent = 'URL is required.';
          urlHint.hidden = false;
          urlInput.setAttribute('aria-invalid', 'true');
        }
        urlInput.focus();
        return;
      }
      setStatus(problem, true);
      return;
    }

    if (submitter.contact && !validateContact(submitter.contact)) {
      updateSubmitAvailability();
      return;
    }

    if (!window.SanityWrite || !window.SanityWrite.createDraftCaseStudy) {
      setStatus('Submissions are temporarily unavailable. Please try again later.', true);
      return;
    }

    var payloadEntries = state.entries.map(function (entry) {
      return {
        title: String(entry.title || '').trim().slice(0, MAX_TITLE),
        authors: entry.authors,
        date: entry.date,
        source: entry.source,
        medium: entry.medium,
        sourceUrl: entry.url,
        technologies: Array.from(entry.techs).slice(0, MAX_TECHNOLOGIES),
        headlineAnnotations: []
      };
    });

    var saveBtn = document.getElementById('db-submit-save');
    state.publishing = true;
    if (saveBtn) saveBtn.disabled = true;
    setStatus('Submitting…');

    window.SanityWrite.createDraftCaseStudy({
      entries: payloadEntries,
      submitter: submitter
    })
      .then(function () {
        resetFormState();
        var count = payloadEntries.length;
        setStatus(count === 1
          ? 'Thanks for contributing! We’ve received your entry, and our researchers will take a look.'
          : 'Thanks for contributing! We’ve received your ' + count + ' entries, and our researchers will take a look.');
      })
      .catch(function (err) {
        console.error(err);
        setStatus((err && err.message) || 'We couldn’t submit your entries. Please try again.', true);
        state.publishing = false;
        updateSubmitAvailability();
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
    window.SiteDialogs.open(dialog);
    var title = document.getElementById('db-sub-title');
    if (title) title.focus();
  }

  function closeSubmit() {
    var dialog = document.getElementById('db-submit-dialog');
    if (!dialog) return;
    window.SiteDialogs.close(dialog);
  }

  function bind() {
    var techRoot = document.getElementById('db-sub-techs');
    if (techRoot) {
      techRoot.addEventListener('click', function (event) {
        var button = event.target.closest('[data-tech]');
        var entry = currentEntry();
        if (!button || !techRoot.contains(button) || !entry) return;
        var label = button.getAttribute('data-tech');
        if (entry.techs.has(label)) entry.techs.delete(label);
        else entry.techs.add(label);
        var active = entry.techs.has(label);
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });
    }
    var fields = [
      ['db-sub-title', MAX_TITLE],
      ['db-sub-source', MAX_SOURCE],
      ['db-sub-url', MAX_URL],
      ['db-sub-name', MAX_NAME],
      ['db-sub-affiliation', MAX_AFFILIATION],
      ['db-sub-contact', MAX_CONTACT],
      ['db-sub-date', 10, 'Enter a valid date.'],
      ['db-sub-authors-input', MAX_AUTHORS]
    ];
    fields.forEach(function (spec) {
      var input = document.getElementById(spec[0]);
      if (!input) return;
      input.maxLength = spec[1];
      var hint = document.createElement('span');
      hint.id = spec[0] + '-limit';
      hint.className = 'db-field-hint';
      hint.hidden = true;
      hint.setAttribute('aria-live', 'polite');
      function updateLimit() {
        var message = '';
        if (spec[0] === 'db-sub-date') {
          var medium = fieldValue('db-sub-medium');
          if (input.value && !validateDate(input.value.trim())) message = spec[2];
        } else if (spec[0] === 'db-sub-url' && input.value.trim() && !validateUrl(input.value.trim())) {
          message = 'Enter a valid URL starting with http:// or https://.';
        } else if (spec[0] === 'db-sub-contact' && input.value.trim() && !validateContact(input.value.trim())) {
          message = 'Enter a valid email address.';
        } else if (input.value.length >= spec[1]) {
          message = spec[2] || 'You’ve reached the maximum number of characters for this field.';
        }
        hint.textContent = message;
        hint.hidden = !message;
        input.setAttribute('aria-invalid', message ? 'true' : 'false');
      }
      input.addEventListener('input', updateLimit);
      limitUpdates.push(updateLimit);
      updateLimit();
      input.insertAdjacentElement('afterend', hint);
      var describedBy = input.getAttribute('aria-describedby');
      input.setAttribute('aria-describedby', (describedBy ? describedBy + ' ' : '') + hint.id);
    });
    var addButton = document.getElementById('db-sub-add-entry');
    if (addButton) {
      var hint = document.createElement('span');
      hint.className = 'db-field-hint';
      hint.hidden = true;
      hint.setAttribute('aria-live', 'polite');
      limitUpdates.push(function () {
        var reached = state.entries.length >= MAX_ENTRIES;
        hint.textContent = reached ? 'Maximum ' + MAX_ENTRIES + ' entries reached.' : '';
        hint.hidden = !reached;
      });
      addButton.insertAdjacentElement('afterend', hint);
    }
    var submitBtn = document.getElementById('db-submit');
    var form = document.getElementById('db-submit-form');
    var closeSubmitBtn = document.getElementById('db-submit-close');
    var cancelBtn = document.getElementById('db-submit-cancel');
    var addEntryBtn = document.getElementById('db-sub-add-entry');
    var listPublicly = document.getElementById('db-sub-list-publicly');

    if (submitBtn) {
      submitBtn.addEventListener('click', function () {
        openSubmit();
      });
    }
    if (form) {
      form.addEventListener('submit', submitEntry);
      function updateForm() {
        refreshLimitMessages();
      }
      form.addEventListener('input', updateForm);
      form.addEventListener('change', updateForm);
      form.addEventListener('focusout', updateForm);
    }
    var titleInput = document.getElementById('db-sub-title');
    if (titleInput) titleInput.addEventListener('input', onTitleInput);
    if (closeSubmitBtn) closeSubmitBtn.addEventListener('click', closeSubmit);
    if (cancelBtn) cancelBtn.addEventListener('click', closeSubmit);
    if (listPublicly) listPublicly.addEventListener('change', updateIdentityUI);
    if (addEntryBtn) {
      addEntryBtn.addEventListener('click', function () {
        readOpenEntry();
        if (state.entries.length >= MAX_ENTRIES) {
          setStatus('You can add up to ' + MAX_ENTRIES + ' entries at a time.', true);
          return;
        }
        setStatus('');
        state.entries.push(blankEntry());
        state.openIndex = state.entries.length - 1;
        writeOpenEntry();
        renderEntryList();
        renderTechChips();
        var title = document.getElementById('db-sub-title');
        if (title) title.focus();
      });
    }

    var submitDialog = document.getElementById('db-submit-dialog');
    if (submitDialog) {
      submitDialog.addEventListener('cancel', function (e) {
        e.preventDefault();
        closeSubmit();
      });
    }

    if (new URLSearchParams(window.location.search).get('submit') === '1') {
      openSubmit();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }

  return {open: openSubmit};
})();
