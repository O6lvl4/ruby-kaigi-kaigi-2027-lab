// Client-side navigation between Rails-rendered pages, using real URLs
// (/event, /restaurants …) under the site's base path. Each page's HTML was
// rendered by Rails ahead of time; the router swaps it in and mounts the page's
// JavaScript, tearing the previous page down first.
export class Router {
  #current = null;
  #unmount = null;
  #listening = false;

  // pages: Map of app path → { mount(root) → unmount }
  // html(path): the Rails-rendered HTML for a page
  // legacyAnchors: old single-page anchors (#dining) → app paths
  constructor({ root, pages, html, basePath = '/', legacyAnchors = {}, onRender = () => {} }) {
    this.root = root;
    this.pages = pages;
    this.html = html;
    this.scriptName = basePath.replace(/\/$/, '');
    this.legacyAnchors = legacyAnchors;
    this.onRender = onRender;
  }

  get currentPath() {
    return this.#current;
  }

  start() {
    const legacy = this.legacyAnchors[location.hash.slice(1)];
    if (legacy && this.appPath(location.pathname) === '/') {
      history.replaceState(null, '', this.url(legacy, legacy === '/' ? '' : location.hash));
    }
    this.#render(this.appPath(location.pathname), location.hash, { initial: true });
    if (!this.#listening) {
      document.addEventListener('click', this.#onClick);
      window.addEventListener('popstate', this.#onPopState);
      this.#listening = true;
    }
  }

  stop() {
    document.removeEventListener('click', this.#onClick);
    window.removeEventListener('popstate', this.#onPopState);
    this.#listening = false;
    this.#unmount?.();
    this.#unmount = null;
    this.#current = null;
  }

  navigate(path, hash = '') {
    history.pushState(null, '', this.url(path, hash));
    this.#render(path, hash);
  }

  // "/ruby-kaigi-kaigi-2027-lab/event/" → "/event"
  appPath(pathname) {
    let path = pathname.startsWith(this.scriptName) ? pathname.slice(this.scriptName.length) : pathname;
    path = path.replace(/\/index\.html$/, '/').replace(/(.)\/$/, '$1');
    return path || '/';
  }

  url(path, hash = '') {
    return `${this.scriptName}${path}${hash}`;
  }

  #render(path, hash, { initial = false } = {}) {
    if (!this.pages.has(path)) {
      path = '/';
      history.replaceState(null, '', this.url(path));
    }
    this.#unmount?.();
    this.root.innerHTML = this.html(path);
    this.#current = path;
    const main = this.root.querySelector('main');
    if (main?.dataset.pageTitle) document.title = main.dataset.pageTitle;
    this.#unmount = this.pages.get(path).mount?.(this.root) || null;
    this.#reveal(hash, { moveFocus: !initial });
    this.onRender(path);
  }

  #reveal(hash, { moveFocus }) {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
    if (!moveFocus) return;
    const focusTarget = target || this.root.querySelector('main');
    if (!focusTarget) return;
    if (!focusTarget.hasAttribute('tabindex')) focusTarget.setAttribute('tabindex', '-1');
    focusTarget.focus({ preventScroll: true });
  }

  #onClick = event => {
    const url = routableUrl(event);
    if (!url) return;
    const path = this.appPath(url.pathname);
    if (!this.pages.has(path)) return;
    // Same page with an anchor: let the browser scroll natively.
    if (path === this.#current && url.hash) return;
    event.preventDefault();
    this.navigate(path, url.hash);
  };

  #onPopState = () => {
    const path = this.appPath(location.pathname);
    if (path !== this.#current) this.#render(path, location.hash);
  };
}

// The same-origin URL of a plain left click on a link, or null when the browser
// should handle the click itself (new tab, download, modifier keys, other sites).
function routableUrl(event) {
  if (!isPlainLeftClick(event)) return null;
  const link = event.target.closest('a[href]');
  if (!link || link.target || link.hasAttribute('download')) return null;
  const url = new URL(link.href);
  return url.origin === location.origin ? url : null;
}

function isPlainLeftClick(event) {
  return (
    !event.defaultPrevented && event.button === 0 && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
  );
}
