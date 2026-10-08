import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './map.css';

export async function initMapGuide(request) {
  const container=document.getElementById('miyazaki-map');
  const sidebar=document.getElementById('map-sidebar');
  const status=document.getElementById('map-status');
  if(!container || !sidebar) return;
  const map=L.map(container,{scrollWheelZoom:false,minZoom:11,maxZoom:17,zoomControl:true,preferCanvas:false});
  map.attributionControl.setPrefix('<a href="https://leafletjs.com/">Leaflet</a>');
  map.zoomControl.setPosition('topright');
  let tileErrors=0, tileLoads=0, revision=0, selectedId=null, current=null;
  const markers=new Map();
  const layer=L.layerGroup().addTo(map);
  const tile=L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png',{
    minZoom:11,maxZoom:17,keepBuffer:1,updateWhenIdle:true,
    attribution:'<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル（淡色地図）</a>'
  });
  function updateTileStatus(){
    if(tileErrors){ status.textContent='背景地図の一部を読み込めませんでした。地点カード・公式出典・概略線はそのまま確認できます。';status.classList.add('map-warning');window.summaryApp.mapTileStatus='error'; }
    else if(tileLoads){status.textContent='地点とカードを選ぶと、同じ場所がハイライトされます。';status.classList.remove('map-warning');window.summaryApp.mapTileStatus='loaded';}
  }
  tile.on('tileload',()=>{tileLoads++;updateTileStatus();});
  tile.on('tileerror',()=>{tileErrors++;updateTileStatus();});
  tile.addTo(map);
  function selectPlace(id,fromMarker=false){
    const marker=markers.get(id);if(!marker)return;
    selectedId=id;
    for(const [key,item] of markers){item.getElement()?.classList.toggle('place-marker-active',key===id);}
    for(const card of sidebar.querySelectorAll('[data-place-id]')){
      const active=card.dataset.placeId===id;card.classList.toggle('is-selected',active);
      card.querySelector('[data-map-place]')?.setAttribute('aria-pressed',String(active));
      if(active && fromMarker)card.scrollIntoView({block:'nearest',inline:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    }
    map.setView(marker.getLatLng(),Math.max(map.getZoom(),15),{animate:false});marker.openTooltip();
    window.summaryApp.mapSelected=id;
  }
  function fit(){
    if(!current)return;
    const coords=current.geojson.features.filter(f=>f.geometry.type==='Point').map(f=>[f.geometry.coordinates[1],f.geometry.coordinates[0]]);
    if(coords.length)map.fitBounds(L.latLngBounds(coords),{padding:[35,35],maxZoom:16,animate:false});
  }
  function apply(data){
    if(data.renderer!=='Rails-ActionView-ERB'||data.controller!=='SummaryController')throw new Error('Rails map response could not be verified');
    current=data;selectedId=null;layer.clearLayers();markers.clear();
    sidebar.innerHTML=data.html;sidebar.dataset.scenario=data.key;
    for(const button of document.querySelectorAll('[data-map-scenario]'))button.setAttribute('aria-pressed',String(button.dataset.mapScenario===data.key));
    const points=data.geojson.features.filter(f=>f.geometry.type==='Point');
    const cardIds=[...sidebar.querySelectorAll('[data-place-id]')].map(x=>x.dataset.placeId);
    if(JSON.stringify(cardIds)!==JSON.stringify(points.map(x=>x.id)))throw new Error('Map and Rails cards do not match');
    for(const feature of data.geojson.features){
      if(feature.geometry.type==='LineString'){
        L.polyline(feature.geometry.coordinates.map(c=>[c[1],c[0]]),{color:'#a3293d',weight:3,dashArray:'7 9',opacity:.72,interactive:false}).addTo(layer);
      }
    }
    for(const feature of points){
      const p=feature.properties;
      const icon=L.divIcon({className:'guide-marker',html:`<span>${Number(p.number)}</span>`,iconSize:[36,36],iconAnchor:[18,18]});
      const marker=L.marker([feature.geometry.coordinates[1],feature.geometry.coordinates[0]],{icon,title:p.name,keyboard:true,riseOnHover:true}).addTo(layer);
      const text=document.createElement('span');text.textContent=p.name;
      marker.bindTooltip(text,{direction:'top',offset:[0,-16],opacity:1});
      marker.on('click',()=>selectPlace(feature.id,true));markers.set(feature.id,marker);
    }
    for(const button of sidebar.querySelectorAll('[data-map-place]'))button.addEventListener('click',()=>selectPlace(button.dataset.mapPlace));
    map.invalidateSize({animate:false});fit();
    window.summaryApp.mapState={key:data.key,geojson:data.geojson,placeIds:cardIds,controller:data.controller,renderer:data.renderer};
    window.summaryApp.mapReady=true;
    status.textContent='背景地図を読み込んでいます。地点カードは利用できます。';updateTileStatus();
  }
  async function loadScenario(key){
    const own=++revision;status.textContent='Rails で地点と導線を切り替えています…';
    try{
      const result=await request(`/map.json?scenario=${encodeURIComponent(key)}`);
      if(own!==revision)return;
      if(result.status!==200)throw new Error('Scenario request failed');
      apply(result.body);
    }catch(error){
      if(own!==revision)return;
      status.textContent='地図データを更新できませんでした。表示中の地点カードと公式の出典を確認してください。';status.classList.add('map-warning');
      window.summaryApp.mapError=error.message;
    }
  }
  for(const button of document.querySelectorAll('[data-map-scenario]'))button.addEventListener('click',()=>loadScenario(button.dataset.mapScenario));
  document.getElementById('fit-map').addEventListener('click',fit);
  window.summaryApp.mapReady=false;
  await loadScenario(sidebar.dataset.scenario || 'arrival');
}

