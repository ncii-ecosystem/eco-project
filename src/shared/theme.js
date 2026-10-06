(function () {
  var KEY = 'db-theme';
  var btn = document.getElementById('site-theme-toggle');
  if (!btn) return;
  var iconEl = btn.querySelector('.site-theme-toggle-icon');

  function paint(light) {
    document.documentElement.classList.toggle('db-theme-dark', !light);
    btn.setAttribute(
      'aria-label',
      light ? 'Switch to dark mode' : 'Switch to light mode'
    );
    btn.title = light ? 'Dark mode' : 'Light mode';
    if (!iconEl) return;
    iconEl.classList.toggle('fa-moon', light);
    iconEl.classList.toggle('fa-sun', !light);
  }

  function savedIsDark() {
    try {
      return localStorage.getItem(KEY) === 'dark';
    } catch (e) {
      return document.documentElement.classList.contains('db-theme-dark');
    }
  }

  paint(!savedIsDark());

  window.addEventListener('storage', function (event) {
    if (event.key === KEY || event.key === null) paint(!savedIsDark());
  });

  btn.addEventListener('animationend', function (event) {
    if (event.animationName === 'site-theme-flip') btn.classList.remove('is-flip');
  });

  btn.addEventListener('click', function () {
    var nextDark = !document.documentElement.classList.contains('db-theme-dark');
    paint(!nextDark);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      btn.classList.remove('is-flip');
    } else {
      btn.classList.remove('is-flip');
      void btn.offsetWidth;
      btn.classList.add('is-flip');

    }
    try {
      localStorage.setItem(KEY, nextDark ? 'dark' : 'light');
    } catch (e) {}
  });
})();
