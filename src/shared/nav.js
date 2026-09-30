(function () {
  var header = document.querySelector('.site-topnav');
  var tab = header && header.querySelector('.site-nav-tab');
  if (!header || !tab) return;

  function setOpen(open) {
    header.classList.toggle('is-open', open);
    tab.setAttribute('aria-expanded', open ? 'true' : 'false');
    tab.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  tab.addEventListener('click', function () {
    setOpen(!header.classList.contains('is-open'));
  });

  header.addEventListener('click', function (event) {
    if (event.target.closest('a')) setOpen(false);
  });

  document.addEventListener('click', function (event) {
    if (!header.classList.contains('is-open')) return;
    if (header.contains(event.target)) return;
    setOpen(false);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') setOpen(false);
  });
})();
