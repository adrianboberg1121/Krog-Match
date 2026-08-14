const FIELD_MASK=['places.id','places.displayName','places.formattedAddress','places.rating','places.userRatingCount','places.priceLevel','places.photos','places.primaryTypeDisplayName','places.currentOpeningHours','places.websiteUri','places.googleMapsUri','nextPageToken'].join(',');

async function page(apiKey,pageToken){
  const body={
    textQuery:'bra restauranger i Stockholm',
    includedType:'restaurant',
    strictTypeFiltering:false,
    pageSize:20,
    languageCode:'sv',
    regionCode:'SE',
    locationBias:{circle:{center:{latitude:59.3293,longitude:18.0686},radius:12000}}
  };
  if(pageToken)body.pageToken=pageToken;
  const r=await fetch('https://places.googleapis.com/v1/places:searchText',{
    method:'POST',
    headers:{'Content-Type':'application/json','X-Goog-Api-Key':apiKey,'X-Goog-FieldMask':FIELD_MASK},
    body:JSON.stringify(body)
  });
  const data=await r.json();
  if(!r.ok)throw new Error(data?.error?.message||`Google Places ${r.status}`);
  return data;
}

function normalize(p){return{
  id:p.id,
  name:p.displayName?.text||'Okänd restaurang',
  address:p.formattedAddress||'',
  rating:p.rating||null,
  userRatingCount:p.userRatingCount||0,
  priceLevel:p.priceLevel||null,
  photoName:p.photos?.[0]?.name||null,
  type:p.primaryTypeDisplayName?.text||'Restaurang',
  openNow:p.currentOpeningHours?.openNow,
  weekdayDescriptions:p.currentOpeningHours?.weekdayDescriptions||[],
  websiteUri:p.websiteUri||null,
  googleMapsUri:p.googleMapsUri||null
}}

export default async function handler(req,res){
  res.setHeader('Cache-Control','s-maxage=900, stale-while-revalidate=3600');
  const apiKey=process.env.GOOGLE_PLACES_API_KEY;
  if(!apiKey)return res.status(500).json({error:'GOOGLE_PLACES_API_KEY saknas i Vercel'});
  try{
    const first=await page(apiKey);
    let places=first.places||[];
    if(first.nextPageToken){
      try{const second=await page(apiKey,first.nextPageToken);places=places.concat(second.places||[])}catch{}
    }
    const seen=new Set();
    const restaurants=places.map(normalize).filter(p=>p.id&&!seen.has(p.id)&&seen.add(p.id));
    res.status(200).json({restaurants,updatedAt:new Date().toISOString()});
  }catch(e){res.status(502).json({error:e.message||'Kunde inte hämta Google Places'});}
}