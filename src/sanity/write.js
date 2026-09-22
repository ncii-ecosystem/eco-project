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
        title: input.title,
        authors: input.authors,
        date: input.date,
        source: input.source,
        venue: input.venue,
        medium: input.medium,
        sourceUrl: input.sourceUrl,
        contact: input.contact,
        technologies: input.technologies,
        headlineAnnotations: input.headlineAnnotations
      })
    }).then(function (res) {
      return res.text().then(function (text) {
        var json = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch (e) {
          json = null;
        }
        if (!res.ok) {
          var msg =
            (json && json.error) ||
            text ||
            res.statusText ||
            'Submit failed';
          if (res.status === 429) {
            msg =
              (json && json.error) ||
              'Too many submissions. Please wait and try again.';
          } else if (res.status === 503) {
            msg =
              (json && json.error) ||
              'Server is busy. Please try again shortly.';
          } else if (res.status === 404 || res.status === 405) {
            msg =
              'Submit API is not running.';
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
