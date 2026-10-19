// Enhance anchor navigation: URLs remain shareable, and unenhanced HTML stays readable.
export function initDiningTabs(root) {
  const list = root.querySelector('#dining-tabs');
  if (!list) return () => {};
  const tabs = [...list.querySelectorAll('[data-dining-tab]')];
  const panels = [...root.querySelectorAll('[data-dining-panel]')];
  let active = 'dining';
  prepareTabs(list, tabs, panels);

  function select(id) {
    active = id;
    for (const panel of panels) panel.hidden = panel.id !== id;
    for (const tab of tabs) {
      const selected = tab.dataset.diningTab === id;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
  }
  function sync() {
    const id = fragmentId();
    const target = document.getElementById(id);
    const panel = target?.closest('[data-dining-panel]');
    select(panel?.id || (id === 'food-candidates' ? 'candidates-bento' : id ? active : 'dining'));
    // Native anchor scrolling happens before hashchange, while its panel may still be hidden.
    if (panel) target.scrollIntoView({ block: 'start' });
  }
  function activate(tab) {
    if (active !== tab.dataset.diningTab || location.hash !== tab.hash) history.pushState(null, '', tab.hash);
    select(tab.dataset.diningTab);
    tab.focus({ preventScroll: true });
  }
  function click(event) {
    const tab = event.target.closest('[data-dining-tab]');
    if (!tab || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    activate(tab);
  }
  function key(event) {
    const current = tabs.indexOf(event.target);
    if (current < 0) return;
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      activate(tabs[current]);
      return;
    }
    const offsets = { ArrowRight: 1, ArrowLeft: -1, Home: -current, End: tabs.length - current - 1 };
    if (!(event.key in offsets)) return;
    event.preventDefault();
    activate(tabs[(current + offsets[event.key] + tabs.length) % tabs.length]);
  }
  list.addEventListener('click', click);
  list.addEventListener('keydown', key);
  window.addEventListener('hashchange', sync);
  window.addEventListener('popstate', sync);
  sync();
  return () => {
    list.removeEventListener('click', click);
    list.removeEventListener('keydown', key);
    window.removeEventListener('hashchange', sync);
    window.removeEventListener('popstate', sync);
  };
}

function prepareTabs(list, tabs, panels) {
  list.setAttribute('role', 'tablist');
  tabs.forEach(tab => {
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', tab.dataset.diningTab);
  });
  panels.forEach(panel => {
    panel.setAttribute('role', 'tabpanel');
    panel.tabIndex = 0;
  });
}

function fragmentId() {
  try {
    return decodeURIComponent(location.hash.slice(1));
  } catch {
    return '';
  }
}
