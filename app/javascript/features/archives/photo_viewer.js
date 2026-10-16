// Native dialog supplies focus trapping and Escape; no carousel or extra runtime.
export function initPhotoViewer(root) {
  const dialog = root.querySelector('#archive-photo-dialog');
  if (!dialog) return () => {};
  const image = dialog.querySelector('img');
  const title = dialog.querySelector('#archive-photo-title');
  const caption = dialog.querySelector('.archive-photo-dialog-caption');
  let opener = null;
  let previousOverflow = '';
  // Both elements: iOS Safari keeps scrolling the page when only <body> is locked.
  const lock = value => {
    document.documentElement.style.overflow = value;
    document.body.style.overflow = value;
  };

  function restore() {
    lock(previousOverflow);
    opener?.isConnected && opener.focus({ preventScroll: true });
    opener = null;
  }

  function open(event) {
    const button = event.target.closest('[data-photo-open]');
    if (!button || dialog.open) return;
    const figure = button.closest('[data-archive-photo]');
    const original = figure.querySelector('img');
    image.src = original.currentSrc || original.src;
    image.alt = original.alt;
    title.textContent = figure.querySelector('.archive-photo-title').textContent;
    caption.replaceChildren(figure.querySelector('figcaption').cloneNode(true));
    opener = button;
    previousOverflow = document.body.style.overflow;
    lock('hidden');
    dialog.showModal();
  }

  function close(event) {
    if (event.target === dialog || event.target.closest('[data-photo-close]')) dialog.close();
  }

  const dismiss = () => {
    if (dialog.open) dialog.close();
  };
  window.addEventListener('popstate', dismiss);
  root.addEventListener('click', open);
  dialog.addEventListener('click', close);
  dialog.addEventListener('close', restore);
  return () => {
    window.removeEventListener('popstate', dismiss);
    root.removeEventListener('click', open);
    dialog.removeEventListener('click', close);
    dialog.removeEventListener('close', restore);
    if (dialog.open) {
      dialog.close();
      lock(previousOverflow);
    }
    opener = null;
  };
}
