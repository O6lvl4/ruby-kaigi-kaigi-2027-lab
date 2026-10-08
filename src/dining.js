export function matchesDiningFilter(venue, minimum, area = 'all') {
  return (area === 'all' || venue.area === area) && (venue.groupCapacity === null || venue.groupCapacity >= minimum);
}
export function initDiningGuide(sourceVenues = []) {
  const root=document.getElementById('dining');
  if(!root)return;
  const select=root.querySelector('#dining-capacity'),areaSelect=root.querySelector('#dining-area');
  const cards=[...root.querySelectorAll('[data-restaurant-id]')];
  const byId=new Map(sourceVenues.map(venue=>[venue.id,venue]));
  const venues=cards.map((card,index)=>({...byId.get(card.dataset.restaurantId),id:card.dataset.restaurantId,area:card.dataset.diningArea,number:index+1,card}));
  const located=venues.filter(v=>Array.isArray(v.coordinates)&&v.coordinates.length===2&&v.coordinates.every(Number.isFinite)&&v.coordinateSourceUrl?.startsWith('https://'));
  const mapPanel=root.querySelector('#dining-map-panel'),grid=root.querySelector('.dining-grid'),detail=root.querySelector('#dining-map-detail');
  const status=root.querySelector('#dining-map-status');
  let mode='list',selected=null,map=null,disposed=false,mapGeneration=0,matches=[];
  function setDetail(id){
    selected=id;
    root.querySelector('#dining-map-choice').value=id||'';
    for(const venue of venues){venue.card.classList.toggle('dining-card-selected',venue.id===id);venue.card.querySelector('[data-dining-focus]')?.setAttribute('aria-pressed',String(venue.id===id));}
    detail.replaceChildren();
    const venue=venues.find(v=>v.id===id);
    if(venue){if(!matches.some(v=>v.id===id)){const notice=document.createElement('p');notice.className='note';notice.textContent='現在の絞り込み条件の対象外です';detail.append(notice);}const clone=venue.card.cloneNode(true);clone.hidden=false;clone.removeAttribute('data-restaurant-id');clone.removeAttribute('data-group-capacity');clone.dataset.diningDetailId=venue.id;clone.querySelector('[data-dining-focus]')?.remove();detail.append(clone);}
    else{const p=document.createElement('p');p.className='dining-detail-empty';p.textContent='ピンを選ぶと、名称・住所・移動リンクをここで確認できます';detail.append(p);}
    map?.select(id);
  }
  function update(preserveSelection=false){
    const minimum=Number(select.value),area=areaSelect.value;
    matches=venues.filter(v=>matchesDiningFilter(v,minimum,area));
    const matchedIds=new Set(matches.map(v=>v.id));
    for(const venue of venues)venue.card.hidden=!matchedIds.has(venue.id);
    const known=matches.filter(v=>v.groupCapacity!==null).length,unknown=matches.length-known;
    root.querySelector('#dining-results').textContent=`${area==='all'?'全エリア':area} · ${minimum?minimum+'人以上の掲載目安':'すべての人数'}：${known}件 ＋ 人数要確認 ${unknown}件`;
    root.querySelector('#dining-empty').hidden=minimum===0 || known>0;
    const locatedMatches=located.filter(v=>matchedIds.has(v.id));
    const locatedKnown=locatedMatches.filter(v=>v.groupCapacity!==null).length;
    root.querySelector('#dining-map-count').textContent=`全${located.length}地点を表示 · 掲載人数の条件内${locatedKnown}地点 ＋ 人数要確認${locatedMatches.length-locatedKnown}地点 · 位置未確認${matches.filter(v=>!located.includes(v)).length}件は一覧で確認`;
    if(selected){
      if(!matchedIds.has(selected)&&preserveSelection!==true)setDetail(null);
      else setDetail(selected);
    }
    map?.update(matchedIds,selected);
    window.diningGuideState={mode,selected,matchingIds:matches.map(v=>v.id),mappedIds:located.map(v=>v.id)};
  }
  async function showMap(){
    const run=++mapGeneration;
    status.textContent='地図を読み込んでいます…';
    try{
      const {createDiningMap}=await import('./dining-map.js');
      if(disposed||run!==mapGeneration||mode!=='map')return;
      map=createDiningMap(root.querySelector('#dining-map-canvas'),located,id=>{setDetail(id);update(true);},state=>{if(!disposed&&mode==='map')status.textContent=state==='error'?'背景地図を読み込めません。地点・住所・Google Mapsのリンクは引き続き利用できます。':'地理院の背景地図に、出典を確認した地点を重ねています';});
      update();map.fit();
    }catch{
      if(disposed||run!==mapGeneration)return;
      status.textContent='地図を読み込めませんでした。一覧の住所・移動リンクをご利用ください';
    }
  }
  function setMode(next){
    if(mode===next)return;
    const toolbar=root.querySelector('.dining-toolbar');
    const toolbarTop=toolbar.getBoundingClientRect().top;
    mode=next;
    root.querySelectorAll('[data-dining-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.diningView===mode)));
    mapPanel.hidden=mode!=='map';grid.hidden=mode!=='list';
    if(mode==='map'){setDetail(selected);showMap();}
    else{mapGeneration++;map?.dispose();map=null;}
    update();
    window.scrollBy({top:toolbar.getBoundingClientRect().top-toolbarTop,behavior:'instant'});
  }
  const onClick=event=>{
    const view=event.target.closest('[data-dining-view]');if(view){setMode(view.dataset.diningView);return;}
    const focus=event.target.closest('[data-dining-focus]');if(focus){setDetail(focus.dataset.diningFocus);setMode('map');update();root.querySelector('.dining-toolbar').scrollIntoView({block:'start',behavior:'auto'});root.querySelector('#dining-map-choice').focus({preventScroll:true});return;}
    if(event.target.closest('#dining-map-fit'))map?.fit();
  };
  const mapChoice=root.querySelector('#dining-map-choice');
  const choose=()=>{setDetail(mapChoice.value||null);update(true);};
  mapChoice.addEventListener('change',choose);
  select.addEventListener('change',update);areaSelect.addEventListener('change',update);root.addEventListener('click',onClick);
  setDetail(null);update();
  return ()=>{disposed=true;mapGeneration++;mapChoice.removeEventListener('change',choose);map?.dispose();map=null;select.removeEventListener('change',update);areaSelect.removeEventListener('change',update);root.removeEventListener('click',onClick);delete window.diningGuideState;};
}
