export default async function handler(req,res){
  const apiKey=process.env.GOOGLE_PLACES_API_KEY;
  const name=String(req.query?.name||'');
  if(!apiKey)return res.status(500).send('Missing API key');
  if(!/^places\/[^/]+\/photos\/[^/]+$/.test(name))return res.status(400).send('Bad photo name');
  try{
    const url=`https://places.googleapis.com/v1/${name}/media?maxWidthPx=1200&skipHttpRedirect=false&key=${encodeURIComponent(apiKey)}`;
    const r=await fetch(url,{redirect:'follow'});
    if(!r.ok)return res.status(r.status).send('Photo unavailable');
    const type=r.headers.get('content-type')||'image/jpeg';
    const buf=Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type',type);
    res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).send(buf);
  }catch(e){res.status(502).send('Photo error')}
}