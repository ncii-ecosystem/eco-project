(function () {
  'use strict';

  function syncOverlay() {
    if (window.parent.SiteRouter) {
      window.parent.SiteRouter.setDialogOpen(!!document.querySelector('dialog[open]'));
    }
  }

  function open(dialog) {
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    syncOverlay();
  }

  function close(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
    syncOverlay();
  }

  document.querySelectorAll('dialog').forEach(function (dialog) {
    dialog.addEventListener('close', syncOverlay);
  });

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-dialog-open]');
    if (trigger) open(document.getElementById(trigger.dataset.dialogOpen));
    var dismiss = event.target.closest('[data-dialog-close]');
    if (dismiss) close(dismiss.closest('dialog'));
  });

  window.SiteDialogs = {open: open, close: close};
})();
