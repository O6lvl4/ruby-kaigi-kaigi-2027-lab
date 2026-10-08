import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
export function createDiningMap(container,venues,onSelect,onStatus){
  const map=L.map(container,{fadeAnimation:false,zoomAnimation:false,scrollWheelZoom:false,minZoom:11,maxZoom:18});
  // Establish the view before adding markers so their DOM and initial filter styles exist.
  if(venues.length)map.fitBounds(L.latLngBounds(venues.map(v=>[v.coordinates[1],v.coordinates[0]])),{padding:[38,38],maxZoom:15,animate:false});
  else map.setView([31.915,131.424],13);
  const markers=new Map();let disposed=false,errors=0;
  const tile=L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png',{maxZoom:18,keepBuffer:0,updateWhenIdle:true,attribution:'<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル（淡色地図）</a>'}).addTo(map);
  tile.on('tileerror',()=>{errors++;onStatus('error');});tile.on('load',()=>onStatus(errors?'error':'loaded'));
  for(const venue of venues){
    const marker=L.marker([venue.coordinates[1],venue.coordinates[0]],{title:venue.name,keyboard:true,icon:L.divIcon({className:'dining-pin',html:`<span>${venue.number}</span>`,iconSize:[34,34],iconAnchor:[17,17]})}).addTo(map);
    const label=document.createElement('span');label.textContent=venue.name;marker.bindTooltip(label,{direction:'top',offset:[0,-14]});marker.on('click',()=>onSelect(venue.id));markers.set(venue.id,marker);
    marker.getElement()?.setAttribute('data-dining-pin',venue.id);
  }
  return{
    fit(){if(disposed)return;map.invalidateSize({animate:false});if(venues.length)map.fitBounds(L.latLngBounds(venues.map(v=>[v.coordinates[1],v.coordinates[0]])),{padding:[38,38],maxZoom:15,animate:false});else map.setView([31.915,131.424],13);},
    update(matches,selected){for(const [id,marker]of markers){marker.getElement()?.classList.toggle('dining-pin-muted',!matches.has(id));marker.getElement()?.classList.toggle('dining-pin-selected',id===selected);}},
    select(id){for(const [key,marker]of markers){marker.getElement()?.classList.toggle('dining-pin-selected',key===id);if(key!==id)marker.closeTooltip();}markers.get(id)?.openTooltip();},
    dispose(){disposed=true;tile.off();map.remove();markers.clear();container.replaceChildren();container.removeAttribute('style');container.className='dining-map-canvas';}
  };
}
