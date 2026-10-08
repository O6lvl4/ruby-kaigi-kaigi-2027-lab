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
  const onHash=()=>{setOpen(false);const target=document.getElementById(location.hash.slice(1));if(target){target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}};
  const onResize=()=>{button.hidden=!mobile.matches;setOpen(false);};
  button.addEventListener('click',toggle);document.addEventListener('click',onClick);document.addEventListener('keydown',onKey);window.addEventListener('hashchange',onHash);mobile.addEventListener('change',onResize);onResize();
  return()=>{button.removeEventListener('click',toggle);document.removeEventListener('click',onClick);document.removeEventListener('keydown',onKey);window.removeEventListener('hashchange',onHash);mobile.removeEventListener('change',onResize);};
}
