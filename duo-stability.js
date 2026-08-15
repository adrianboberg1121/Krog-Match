async function waitForKroogleBoot(){
  const started=Date.now();
  while(Date.now()-started<12000){
    const t=(progressText?.textContent||'').toLowerCase();
    if(!t.includes('förbereder')&&!t.includes('hämtar'))return;
    await new Promise(r=>setTimeout(r,200));
  }
}
const activateDuoCore=activateDuo;
activateDuo=async function(){await waitForKroogleBoot();return activateDuoCore()};
const leaveDuoCore=leaveDuo;
leaveDuo=async function(){
  localStorage.removeItem('kroogle-duo-last');
  const u=new URL(location.href);u.searchParams.delete('duo');history.replaceState({},'',u.pathname+u.search+u.hash);
  return leaveDuoCore();
};