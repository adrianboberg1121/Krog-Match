let kroogleBaseAll=null;
function michelinApiUrl(){const q=new URLSearchParams();if(userLocation){q.set('lat',userLocation.lat);q.set('lng',userLocation.lng);q.set('radius',radius)}return '/api/michelin'+(q.toString()?'?'+q:'')}
function duoApproxSearch(){const pool=duoState?.pool||[];const pts=pool.filter(p=>Number.isFinite(Number(p.latitude))&&Number.isFinite(Number(p.longitude)));if(!pts.length)return null;const lat=pts.reduce((s,p)=>s+Number(p.latitude),0)/pts.length,lng=pts.reduce((s,p)=>s+Number(p.longitude),0)/pts.length;const R=6371000,r=x=>x*Math.PI/180;let max=0;for(const p of pts){const dlat=r(Number(p.latitude)-lat),dlng=r(Number(p.longitude)-lng),a=Math.sin(dlat/2)**2+Math.cos(r(lat))*Math.cos(r(Number(p.latitude)))*Math.sin(dlng/2)**2;max=Math.max(max,2*R*Math.asin(Math.sqrt(a)))}return{lat,lng,radius:Math.min(20000,Math.max(2000,Math.round(max*1.25)))} }
async function fetchMichelinForCurrentContext(){const q=new URLSearchParams();if(duoSession){const a=duoApproxSearch();if(a){q.set('lat',a.lat);q.set('lng',a.lng);q.set('radius',a.radius)}}else if(userLocation){q.set('lat',userLocation.lat);q.set('lng',userLocation.lng);q.set('radius',radius)}const r=await fetch('/api/michelin'+(q.toString()?'?'+q:''),{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Kunde inte hämta Michelin-krogar');return d.restaurants||[]}
async function activateMichelinFilter(){
  activeFilter='michelin';document.querySelectorAll('.chip').forEach(x=>x.classList.toggle('active',x.dataset.filter==='michelin'));if($('filterPanel'))$('filterPanel').open=false;deck.innerHTML='<div class="loading">Letar efter Michelin-krogar…</div>';progressText.textContent='Hämtar Michelin…';
  try{
    const rows=await fetchMichelinForCurrentContext();
    if(duoSession){
      if(rows.length){await duoRpc('kroogle_duo_extend_pool',{p_code:duoSession.code,p_token:duoSession.token,p_additions:rows});await fetchDuoState()}
      const done=new Set(duoState?.swiped||[]);all=duoState?.pool||[];queue=shuffle(all.filter(p=>!done.has(p.id)&&!duoLocalSwiped.has(p.id)&&(p.michelinSelected||p.michelinStars||p.michelinBib)));index=0;render();renderDuoRoom();
    }else{
      if(kroogleBaseAll===null)kroogleBaseAll=all;all=rows;applyFilter();
    }
  }catch(e){deck.innerHTML=`<div class="empty">Kunde inte hämta Michelin-krogar.<br><br><small>${esc(e.message)}</small></div>`;progressText.textContent='Något gick fel'}
}
function restoreBaseIfNeeded(){if(!duoSession&&kroogleBaseAll!==null){all=kroogleBaseAll;kroogleBaseAll=null}}
function wireSmartFilters(){document.querySelectorAll('.chip').forEach(b=>{b.onclick=async()=>{if(b.dataset.filter==='michelin')return activateMichelinFilter();restoreBaseIfNeeded();document.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));b.classList.add('active');activeFilter=b.dataset.filter;if(duoSession)duoApplyPersonalFilter();else applyFilter()}});const cuisine=$('cuisineSelect');if(cuisine)cuisine.onchange=e=>{restoreBaseIfNeeded();activeCuisine=e.target.value;if(duoSession)duoApplyPersonalFilter();else load()}}
setTimeout(wireSmartFilters,900);
new MutationObserver(()=>setTimeout(wireSmartFilters,0)).observe(document.body,{attributes:true,attributeFilter:['class']});
