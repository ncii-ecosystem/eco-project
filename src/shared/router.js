(function () {
  'use strict';

  var pages = new Set([
    'index.html', 'home.html', 'database.html', 'about.html',
    'primers.html', 'survivor-support.html'
  ]);

  function pageName(url) {
    return url.pathname.split('/').pop() || 'index.html';
  }

  function localPage(url) {
    return url.origin === location.origin && pages.has(pageName(url));
  }

  function intercept(event, navigate) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
        event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') ||
        (link.target && link.target !== '_self')) return;
    var url = new URL(link.href);
    if (!localPage(url) ||
        (url.pathname === location.pathname && url.hash)) return;
    event.preventDefault();
    url.searchParams.delete('content');
    navigate(url.href);
  }

  // Each page keeps its own scripts, scroll state and timers in its own document.
  if (window.parent !== window && window.parent.SiteRouter) {
    document.documentElement.classList.add('site-content');
    window.addEventListener('storage', function (event) {
      if (event.key === 'db-theme' || event.key === null) {
        document.documentElement.classList.toggle(
          'db-theme-dark', localStorage.getItem('db-theme') === 'dark'
        );
      }
    });
    document.addEventListener('click', function (event) {
      intercept(event, window.parent.SiteRouter.navigate);
      if (event.target.closest('#cw-btn')) window.parent.SiteRouter.startStory();
    });
    document.addEventListener('DOMContentLoaded', function () {
      window.parent.SiteRouter.contentReady(document.title);
    });
    return;
  }

  function init() {
    var frame = document.getElementById('site-content');
    if (!frame) return; // Standalone pages still work without the Node server.
    var header = document.querySelector('.site-topnav');

    function restoreNavigation() {
      document.body.classList.remove('dialog-open');
      document.body.classList.remove('story-started');
      header.inert = false;
      header.classList.remove('is-open');
      var tab = header.querySelector('.site-nav-tab');
      tab.setAttribute('aria-expanded', 'false');
      tab.setAttribute('aria-label', 'Open menu');
    }

    function navigate(href, replace) {
      var url = new URL(href, location.href);
      if (!localPage(url)) { location.assign(url.href); return; }
      url.searchParams.delete('content');
      restoreNavigation();
      document.body.classList.toggle('ss-page', pageName(url) === 'survivor-support.html');
      header.querySelectorAll('nav a').forEach(function (link) {
        if (pageName(new URL(link.href)) === pageName(url)) {
          link.setAttribute('aria-current', 'page');
        } else link.removeAttribute('aria-current');
      });
      if (!replace) history.pushState(null, '', url.href);
      document.title = 'ncii ecosystem';
      url.searchParams.set('content', '1');
      frame.src = url.href;
    }

    window.SiteRouter = {
      navigate: navigate,
      setDialogOpen: function (open) {
        document.body.classList.toggle('dialog-open', open);
        header.inert = open || document.body.classList.contains('story-started');
      },
      startStory: function () {
        document.body.classList.add('story-started');
        header.inert = true;
      },
      contentReady: function (title) {
        document.title = title;
        frame.title = title;
        restoreNavigation();
      }
    };

    document.addEventListener('click', function (event) { intercept(event, navigate); });
    window.addEventListener('popstate', function () { navigate(location.href, true); });
    navigate(location.href, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
