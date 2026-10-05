window.SanityWrite = (function () {
  'use strict';

  function createDraftCaseStudy(input) {
    return fetch('/api/submit', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        entries: input.entries,
        submitter: input.submitter
      })
    }).catch(function () {
      throw new Error('We couldn’t submit your entries. Please try again.');
    }).then(function (res) {
      return res.text().then(function (text) {
        var json = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch (e) {
          json = null;
        }
        if (!res.ok) {
          var msg = 'We couldn’t submit your entries. Please try again.';
          if (res.status === 429 || res.status === 503) {
            msg = 'We’re receiving a lot of submissions. Please try again later.';
          } else if (res.status >= 500 || res.status === 404 || res.status === 405) {
            msg = 'Submissions are temporarily unavailable. Please try again later.';
          } else if (json && typeof json.error === 'string' &&
              !/sanity|SANITY_|api\/|token|dataset|project.?id/i.test(json.error)) {
            msg = json.error;
          }
          throw new Error(msg);
        }
        return json || {ok: true};
      });
    });
  }

  return {
    createDraftCaseStudy: createDraftCaseStudy
  };
})();
