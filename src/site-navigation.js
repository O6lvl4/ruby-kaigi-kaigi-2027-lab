// Each header item shows one page; in-page anchors (e.g. #pending) open the page that contains them.
function showPageFor(root,hash){
  const pages=[...root.querySelectorAll('[data-page]')];
  if(!pages.length)return null;
  const target=hash?document.getElementById(hash):null;
  if(target&&!root.contains(target))return null;
  const page=target?.closest('[data-page]')||(target?null:pages[0]);
  if(!page)return target;
  const changed=page.hidden;
  for(const candidate of pages)candidate.hidden=candidate!==page;
  root.querySelectorAll('[data-page-link]').forEach(link=>{if(link.dataset.pageLink===page.dataset.page)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
  // Leaflet measures its container on window resize; a newly shown page needs that once.
  if(changed)window.dispatchEvent(new Event('resize'));
  return target;
}
// A page's first section opens from the top; deeper anchors scroll into view.
function reveal(target){
  if(target&&target.closest('[data-page]')?.querySelector('section')!==target)target.scrollIntoView();
  else window.scrollTo(0,0);
}
export function initSiteNavigation(root){
  const button=root.querySelector('#menu-toggle'),nav=root.querySelector('#site-navigation');
  if(!button||!nav)return;
  const mobile=matchMedia('(max-width:767px)');let open=false;
  function setOpen(value,restoreFocus=false){
    open=value&&mobile.matches;
    button.setAttribute('aria-expanded',String(open));nav.hidden=mobile.matches&&!open;
    if(!open)nav.querySelectorAll('details[open]').forEach(details=>details.open=false);
    if(restoreFocus)button.focus();
  }
  const toggle=()=>setOpen(!open);
  const onKey=event=>{if(event.key==='Escape'&&(open||nav.querySelector('details[open]'))){event.preventDefault();const summary=nav.querySelector('details[open] > summary');setOpen(false,mobile.matches);if(!mobile.matches)summary?.focus();}};
  const onClick=event=>{
    if(event.target.closest('#menu-toggle'))return;
    if(nav.contains(event.target)&&event.target.closest('a'))setOpen(false);
    else if(!nav.contains(event.target))setOpen(false);
  };
  const onHash=()=>{
    setOpen(false);
    const target=showPageFor(root,location.hash.slice(1));
    reveal(target);
    if(target){target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}
  };
  const onResize=()=>{button.hidden=!mobile.matches;setOpen(false);};
  button.addEventListener('click',toggle);document.addEventListener('click',onClick);document.addEventListener('keydown',onKey);window.addEventListener('hashchange',onHash);mobile.addEventListener('change',onResize);onResize();
  reveal(showPageFor(root,location.hash.slice(1)));
  return()=>{button.removeEventListener('click',toggle);document.removeEventListener('click',onClick);document.removeEventListener('keydown',onKey);window.removeEventListener('hashchange',onHash);mobile.removeEventListener('change',onResize);};
}
