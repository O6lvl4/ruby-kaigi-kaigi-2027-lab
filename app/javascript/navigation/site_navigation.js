// Header menu: always visible on wide screens, a toggled panel on phones.
// Closes on Escape, on choosing a link, and on clicking elsewhere.
const MOBILE = '(max-width:767px)';

export function initSiteNavigation(root) {
  const button = root.querySelector('#menu-toggle');
  const nav = root.querySelector('#site-navigation');
  if (!button || !nav) return () => {};
  const mobile = matchMedia(MOBILE);
  let open = false;

  function setOpen(value, restoreFocus = false) {
    open = value && mobile.matches;
    button.setAttribute('aria-expanded', String(open));
    nav.hidden = mobile.matches && !open;
    if (!open)
      nav.querySelectorAll('details[open]').forEach(details => {
        details.open = false;
      });
    if (restoreFocus) button.focus();
  }

  const onToggle = () => setOpen(!open);
  const onKey = event => {
    if (event.key !== 'Escape' || !(open || nav.querySelector('details[open]'))) return;
    event.preventDefault();
    const summary = nav.querySelector('details[open] > summary');
    setOpen(false, mobile.matches);
    if (!mobile.matches) summary?.focus();
  };
  const onClick = event => {
    if (event.target.closest('#menu-toggle')) return;
    if (!nav.contains(event.target) || event.target.closest('a')) setOpen(false);
  };
  const onViewportChange = () => {
    button.hidden = !mobile.matches;
    setOpen(false);
  };

  button.addEventListener('click', onToggle);
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  mobile.addEventListener('change', onViewportChange);
  onViewportChange();

  return () => {
    button.removeEventListener('click', onToggle);
    document.removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKey);
    mobile.removeEventListener('change', onViewportChange);
  };
}
