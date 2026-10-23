(function () {
  function prepare(root) {
    root.querySelectorAll('img[data-preview-image]').forEach(function (img, index) {
      function reveal() {
        var source = img.src;
        var decoded = img.decode ? img.decode() : Promise.resolve();
        decoded.catch(function () {}).then(function () {
          if (img.src === source && img.naturalWidth) img.classList.add('is-loaded');
        });
      }

      img.addEventListener('load', reveal);
      img.addEventListener('error', function () { img.classList.remove('is-loaded'); });
      img.loading = index < 3 ? 'eager' : 'lazy';
      if (img.complete && img.naturalWidth) reveal();
    });
  }

  window.PreviewImages = { prepare: prepare };
  prepare(document);
})();
