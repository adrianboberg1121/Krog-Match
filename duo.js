const KROOGLE_DB_URL='https://vhoaliujkgnnmmzdfdbi.supabase.co';
const KROOGLE_DB_KEY='sb_publishable_eS90uE7LZC7T4nkuvYLdxQ_TuZFt6zy';
let duoSession=null,duoState=null,duoPoll=null;

function duoEsc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]))}
async function duoRpc(fn,body){
  const r=await fetch(`${KROOGLE_DB_URL}/rest/v1/rpc/${fn}`,{method:'POST',headers:{'Content-Type':'application/json','apikey':KROOGLE_DB_KEY,'Authorization':`Bearer ${KROOGLE_DB_KEY}`},body:JSON.stringify(body)});
  const raw=await r.text();let data;try{data=raw?JSON.parse(raw):null}catch{data=raw}
  if(!r.ok)throw new Error(data?.message||data?.hint||'Duo kunde inte ansluta');
  return data;
}
function duoStore(s){duoSession=s;localStorage.setItem(`kroogle-duo-${s.code}`,JSON.stringify(s));localStorage.setItem('kroogle-duo-last',s.code)}
function duoLoadStored(code){try{return JSON.parse(localStorage.getItem(`kroogle-duo-${code}`)||'null')}catch{return null}}
function duoInviteUrl(code){const u=new URL(location.href);u.search='';u.hash='';u.searchParams.set('duo',code);return u.toString()}
function duoTrimPool(items){return items.slice(0,80).map(p=>({...p,reviews:(p.reviews||[]).slice(0,3),editorial:(p.editorial||[]).slice(0,3)}))}
function duoErrorMessage(e){const m=String(e?.message||e);if(/Room full/i.test(m))return'Det här Duo-rummet har redan två personer.';if(/Room not found/i.test(m))return'Jag hittar inte Duo-rummet. Länken kan ha gått ut.';if(/unique/i.test(m))return'Välj ett annat namn än din kompis.';return m}

function buildDuoUI(){
  const top=document.querySelector('.topbar');
  const saved=$('savedBtn');
  const wrap=document.createElement('div');wrap.className='duo-top-actions';
  const btn=document.createElement('button');btn.id='duoBtn';btn.className='duo-btn';btn.innerHTML='DUO <span>♥</span>';btn.onclick=openDuoSheet;
  saved.parentNode.insertBefore(wrap,saved);wrap.append(btn,saved);

  const bar=document.createElement('div');bar.id='duoBar';bar.className='duo-bar';bar.innerHTML='<button id="duoPeople" class="duo-people">DUO</button><button id="duoMatchesBtn" class="duo-matches-btn">♥ MATCHES <span id="duoMatchCount">0</span></button><button id="duoShareBtn" class="duo-share-mini">↗</button>';
  document.querySelector('.primary-controls').after(bar);

  document.body.insertAdjacentHTML('beforeend',`
  <div class="sheet duo-sheet" id="duoSheet"><div class="sheet-card duo-card"><button class="close" id="closeDuo">✕</button>
    <div class="kicker">KROOGLE DUO</div><h2>Kroogla ihop.</h2><p class="duo-intro">Ni får samma krogar men swipar var för sig. När båda väljer ♥ blir det en match.</p>
    <div id="duoSetup">
      <div class="duo-choice"><button id="duoCreateTab" class="active">Bjud in en vän</button><button id="duoJoinTab">Gå med</button></div>
      <div id="duoCreatePane" class="duo-pane active"><label>Ditt namn<input id="duoCreateName" maxlength="30" autocomplete="given-name" placeholder="T.ex. Adrian"></label><button id="duoCreateBtn" class="duo-primary">SKAPA DUO</button><small>Krogarna du har framför dig just nu blir er gemensamma pool.</small></div>
      <div id="duoJoinPane" class="duo-pane"><label>Ditt namn<input id="duoJoinName" maxlength="30" autocomplete="given-name" placeholder="T.ex. Linnea"></label><label>Kod<input id="duoJoinCode" maxlength="6" autocapitalize="characters" placeholder="ABC123"></label><button id="duoJoinBtn" class="duo-primary">GÅ MED</button></div>
    </div>
    <div id="duoRoom" class="duo-room hidden"><div class="duo-room-code"><span>ER KOD</span><b id="duoCode"></b></div><div id="duoMembers" class="duo-members"></div><button id="duoBigShare" class="duo-primary">BJUD IN / DELA LÄNK</button><button id="duoLeave" class="duo-secondary">Tillbaka till Solo</button></div>
    <div id="duoMessage" class="duo-message"></div>
  </div></div>
  <div class="sheet" id="matchesSheet"><div class="sheet-card saved-card"><button class="close" id="closeMatches">✕</button><div class="saved-head"><div class="kicker">NI BÅDA ♥</div><h2>Matches</h2><p id="matchesSubtitle">Krogar ni båda vill testa.</p></div><div id="matchesList" class="saved-list"></div></div></div>
  <div id="matchToast" class="match-toast"><div class="match-heart">♥</div><div class="kicker">IT'S A MATCH</div><h2 id="matchToastName"></h2><p>Ni vill båda gå hit.</p><button id="matchToastClose">FORTSÄTT SWIPA</button></div>`);

  $('closeDuo').onclick=()=>closeSheet('duoSheet');$('closeMatches').onclick=()=>closeSheet('matchesSheet');
  $('duoCreateTab').onclick=()=>duoTab('create');$('duoJoinTab').onclick=()=>duoTab('join');
  $('duoCreateBtn').onclick=createDuo;$('duoJoinBtn').onclick=joinDuo;
  $('duoBigShare').onclick=shareDuo;$('duoShareBtn').onclick=shareDuo;$('duoMatchesBtn').onclick=openMatches;
  $('duoLeave').onclick=leaveDuo;$('matchToastClose').onclick=()=>$('matchToast').classList.remove('open');
}
function closeSheet(id){$(id)?.classList.remove('open')}
function duoTab(which){$('duoCreateTab').classList.toggle('active',which==='create');$('duoJoinTab').classList.toggle('active',which==='join');$('duoCreatePane').classList.toggle('active',which==='create');$('duoJoinPane').classList.toggle('active',which==='join')}
function openDuoSheet(){
  $('duoMessage').textContent='';
  if(duoSession){$('duoSetup').classList.add('hidden');$('duoRoom').classList.remove('hidden');renderDuoRoom()}else{$('duoSetup').classList.remove('hidden');$('duoRoom').classList.add('hidden')}
  $('duoSheet').classList.add('open');
}
async function createDuo(){
  const name=$('duoCreateName').value.trim();if(!name)return duoMsg('Skriv ditt namn först.');if(!all?.length)return duoMsg('Krogarna laddas fortfarande – prova igen om en sekund.');
  duoBusy($('duoCreateBtn'),true,'SKAPAR…');
  try{const s=await duoRpc('kroogle_create_duo_room',{p_name:name,p_pool:duoTrimPool(all)});duoStore(s);await activateDuo();await shareDuo();}
  catch(e){duoMsg(duoErrorMessage(e))}finally{duoBusy($('duoCreateBtn'),false,'SKAPA DUO')}
}
async function joinDuo(){
  const name=$('duoJoinName').value.trim(),code=$('duoJoinCode').value.trim().toUpperCase();if(!name||code.length<6)return duoMsg('Fyll i namn och den sex tecken långa koden.');
  duoBusy($('duoJoinBtn'),true,'ANSLUTER…');
  try{const s=await duoRpc('kroogle_join_duo_room',{p_code:code,p_name:name});duoStore(s);await activateDuo();}
  catch(e){duoMsg(duoErrorMessage(e))}finally{duoBusy($('duoJoinBtn'),false,'GÅ MED')}
}
function duoBusy(btn,on,text){btn.disabled=on;btn.textContent=text}
function duoMsg(text){$('duoMessage').textContent=text}
async function fetchDuoState(){if(!duoSession)return null;duoState=await duoRpc('kroogle_duo_state',{p_code:duoSession.code,p_token:duoSession.token});return duoState}
async function activateDuo(){
  try{await fetchDuoState();document.body.classList.add('duo-active');$('duoSetup').classList.add('hidden');$('duoRoom').classList.remove('hidden');closeSheet('duoSheet');
    activeFilter='all';activeCuisine='all';document.querySelectorAll('.chip').forEach(x=>x.classList.toggle('active',x.dataset.filter==='all'));if($('cuisineSelect'))$('cuisineSelect').value='all';
    userLocation=null;$('areaLabel').textContent='DUO';
    const done=new Set(duoState.swiped||[]);all=(duoState.pool||[]);queue=shuffle(all.filter(p=>!done.has(p.id)));index=0;render();renderDuoRoom();startDuoPoll();
  }catch(e){duoMsg(duoErrorMessage(e));openDuoSheet()}
}
function renderDuoRoom(){if(!duoSession||!duoState)return;$('duoCode').textContent=duoSession.code;const ms=duoState.members||[];$('duoMembers').innerHTML=ms.map(m=>`<div><span class="duo-dot ${m.isMe?'me':''}"></span><b>${duoEsc(m.name)}</b>${m.isMe?'<small>DU</small>':''}</div>`).join('')+(ms.length<2?'<div class="duo-wait"><span class="duo-dot waiting"></span><b>Väntar på vän…</b></div>':'');$('duoPeople').textContent=ms.length===2?ms.map(x=>x.name).join(' × '):`${ms[0]?.name||'Du'} × …`;$('duoMatchCount').textContent=(duoState.matches||[]).length;$('duoBtn').classList.add('active')}
async function refreshDuoQuiet(){try{await fetchDuoState();renderDuoRoom()}catch{}}
function startDuoPoll(){clearInterval(duoPoll);duoPoll=setInterval(refreshDuoQuiet,5000)}
async function duoSwipeRestaurant(p,liked){
  if(!duoSession||!p)return;
  try{const r=await duoRpc('kroogle_duo_swipe',{p_code:duoSession.code,p_token:duoSession.token,p_restaurant_id:p.id,p_liked:!!liked});if(r?.matched){await refreshDuoQuiet();showMatch(p)}}catch(e){console.warn('Kroogle Duo swipe failed',e)}
}
function showMatch(p){$('matchToastName').textContent=p.name;$('matchToast').classList.add('open');navigator.vibrate?.([35,50,35])}
async function openMatches(){if(!duoSession)return;await refreshDuoQuiet();const ids=new Set(duoState?.matches||[]),pool=duoState?.pool||[],matches=pool.filter(p=>ids.has(p.id));$('matchesSubtitle').textContent=matches.length?`${matches.length} ${matches.length===1?'krog':'krogar'} ni båda har swipat höger på.`:'När ni båda gillar samma krog dyker den upp här.';$('matchesList').innerHTML=matches.length?matches.map(p=>`<div class="saved-item"><div class="saved-thumb" style="${photoStyle(p)}"></div><div><b>${duoEsc(p.name)}</b><small>${duoEsc(p.cuisine||p.type||'Restaurang')} · ★ ${p.rating?Number(p.rating).toFixed(1):'–'}</small></div><a class="maps-save" href="${duoEsc(p.googleMapsUri||'#')}" target="_blank" rel="noopener">MAPS</a></div>`).join(''):'<div class="empty">Inga matches ännu.<br><br>Fortsätt swipa var för sig 👀</div>';$('matchesSheet').classList.add('open')}
async function shareDuo(){if(!duoSession)return;const url=duoInviteUrl(duoSession.code),text=`Kroogla med mig! Gå med i mitt Kroogle Duo: ${duoSession.code}`;try{if(navigator.share)await navigator.share({title:'Kroogle Duo',text,url});else{await navigator.clipboard.writeText(url);duoMsg('Inbjudningslänken är kopierad!');openDuoSheet()}}catch{}}
async function leaveDuo(){clearInterval(duoPoll);duoPoll=null;duoSession=null;duoState=null;document.body.classList.remove('duo-active');$('duoBtn').classList.remove('active');$('areaLabel').textContent='STOCKHOLM';closeSheet('duoSheet');await load()}

const soloDecide=decide;
decide=function(type,card=deck.querySelector('.front'),dir=type==='like'?1:-1){const p=queue[index];if(duoSession&&p)duoSwipeRestaurant(p,type==='like');return soloDecide(type,card,dir)};

async function bootDuo(){
  buildDuoUI();
  const params=new URLSearchParams(location.search),invite=params.get('duo')?.toUpperCase();
  if(invite){$('duoJoinCode').value=invite;const stored=duoLoadStored(invite);if(stored){duoSession=stored;await activateDuo()}else{duoTab('join');setTimeout(openDuoSheet,350)}}else{const last=localStorage.getItem('kroogle-duo-last'),stored=last&&duoLoadStored(last);if(stored){duoSession=stored;try{await activateDuo()}catch{duoSession=null}}}
}
setTimeout(bootDuo,450);
