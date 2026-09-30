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

  btn.addEventListener('click', function () {
    var nextDark = !document.documentElement.classList.contains('db-theme-dark');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      paint(!nextDark);
    } else {
      btn.classList.remove('is-flip');
      void btn.offsetWidth;
      btn.classList.add('is-flip');
      window.setTimeout(function () {
        paint(!nextDark);
      }, 160);
      window.setTimeout(function () {
        btn.classList.remove('is-flip');
      }, 350);
    }
    try {
      localStorage.setItem(KEY, nextDark ? 'dark' : 'light');
    } catch (e) {}
  });
})();
