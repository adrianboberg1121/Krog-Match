let duoLocalSwiped=new Set();

function duoMatchesPersonalFilter(p){
  const typeOk=activeFilter==='all'||
    activeFilter==='casual'&&p.casual||
    activeFilter==='open'&&isOpen(p)||
    activeFilter==='4.5'&&(p.rating||0)>=4.5||
    activeFilter==='budget'&&['PRICE_LEVEL_INEXPENSIVE','PRICE_LEVEL_MODERATE'].includes(p.priceLevel)||
    activeFilter==='michelin'&&(p.michelinSelected||p.michelinStars||p.michelinBib);
  const cuisineOk=activeCuisine==='all'||p.cuisine===activeCuisine;
  return typeOk&&cuisineOk;
}

function duoApplyPersonalFilter(){
  if(!duoSession||!duoState)return;
  const serverDone=new Set(duoState.swiped||[]);
  const pool=duoState.pool||[];
  all=pool;
  queue=shuffle(pool.filter(p=>!serverDone.has(p.id)&&!duoLocalSwiped.has(p.id)&&duoMatchesPersonalFilter(p)));
  index=0;
  render();
  const panel=$('filterPanel');if(panel)panel.open=false;
}

function syncDuoFilterPlacement(){
  const panel=$('filterPanel'),bar=$('duoBar'),primary=document.querySelector('.primary-controls');
  if(!panel||!bar||!primary)return;
  if(document.body.classList.contains('duo-active')){
    const matches=$('duoMatchesBtn');
    if(panel.parentElement!==bar)bar.insertBefore(panel,matches||null);
  }else if(panel.parentElement!==primary){
    primary.appendChild(panel);
  }
}

function wireDuoPersonalFilters(){
  const cuisine=$('cuisineSelect');
  if(cuisine)cuisine.onchange=e=>{
    activeCuisine=e.target.value;
    if(document.body.classList.contains('duo-active'))duoApplyPersonalFilter();else load();
  };
  document.querySelectorAll('.chip').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');activeFilter=b.dataset.filter;
    if(document.body.classList.contains('duo-active'))duoApplyPersonalFilter();else applyFilter();
  });
}

const originalDuoSwipeRestaurant=duoSwipeRestaurant;
duoSwipeRestaurant=async function(p,liked){
  if(p?.id)duoLocalSwiped.add(p.id);
  return originalDuoSwipeRestaurant(p,liked);
};

const originalActivateDuo=activateDuo;
activateDuo=async function(){
  const result=await originalActivateDuo();
  duoLocalSwiped=new Set(duoState?.swiped||[]);
  syncDuoFilterPlacement();
  wireDuoPersonalFilters();
  return result;
};

const originalLeaveDuo=leaveDuo;
leaveDuo=async function(){
  duoLocalSwiped=new Set();
  const result=await originalLeaveDuo();
  syncDuoFilterPlacement();
  wireDuoPersonalFilters();
  return result;
};

new MutationObserver(syncDuoFilterPlacement).observe(document.body,{attributes:true,attributeFilter:['class']});
setTimeout(()=>{syncDuoFilterPlacement();wireDuoPersonalFilters()},700);
