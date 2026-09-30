(function () {
  try {
    if (localStorage.getItem('db-theme') === 'dark') {
      document.documentElement.classList.add('db-theme-dark');
    }
  } catch (e) {}
})();
