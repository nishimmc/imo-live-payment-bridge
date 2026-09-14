import {NextResponse} from 'next/server';
import {adminClient,code,hasSupabase,hashToken,randomToken,requireAdmin} from '../../../lib/server';
import {localProfiles,localBookings,localAddBooking} from '../../../lib/store';
const ds=[10,20,30,45,60];
const attempts=new Map();
const WINDOW=60*1000, MAX=10;
function key(req){return (req.headers.get('x-forwarded-for')||req.headers.get('x-real-ip')||'unknown').split(',')[0].trim().slice(0,100)||'unknown'}
function limited(req){const k=key(req),now=Date.now(),a=attempts.get(k)||{count:0,at:now};if(now-a.at>WINDOW){a.count=0;a.at=now}if(a.count>=MAX)return true;a.count++;a.at=now;attempts.set(k,a);return false}
function validText(v,max){return typeof v==='string'&&v.trim().length>0&&v.trim().length<=max}
export async function POST(req){
 try{
  if(limited(req))return NextResponse.json({error:'Too many booking requests. Please wait a minute.'},{status:429});
  const b=await req.json(),duration=Number(b.duration);
  if(!validText(b.profileId,100)||!validText(b.userImo,40)||!validText(b.paymentSource,40)||!['bkash','nagad'].includes(String(b.provider||'').trim().toLowerCase())||!ds.includes(duration))return NextResponse.json({error:'Missing or invalid booking data'},{status:400});
  const userImo=b.userImo.trim(),provider=String(b.provider).trim().toLowerCase(),paymentSource=b.paymentSource.trim().replace(/\D/g,'');
  if(!/^[\d+\-() ]{7,40}$/.test(userImo))return NextResponse.json({error:'Invalid Imo number.'},{status:400});
  if(!/^01\d{9}$/.test(paymentSource))return NextResponse.json({error:'Invalid payment source number.'},{status:400});
  let p;
  if(!hasSupabase()){
   p=(await localProfiles()).find(x=>x.id===b.profileId&&x.active);
   if(!p)return NextResponse.json({error:'Profile not found'},{status:404});
  }else{
   const {data,error}=await adminClient().from('profiles').select('id,name,price_10,price_20,price_30,price_45,price_60,active').eq('id',b.profileId).single();
   if(error||!data||!data.active)return NextResponse.json({error:'Profile not found'},{status:404});p=data;
  }
  const price=Number(p[`price_${duration}`]);
  if(!Number.isFinite(price)||price<=0)return NextResponse.json({error:'This duration is not available for this profile'},{status:400});
  const accessToken=randomToken(32),accessHash=hashToken(accessToken);
  const row={code:code(),profile_id:p.id,profile_name:p.name,user_imo:userImo,trx_id:`${provider}:${paymentSource}:${price}:${Date.now()}:${randomToken(8)}`,provider,payment_source:paymentSource,duration,price,status:'pending',access_token_hash:accessHash};
  let data;
  if(!hasSupabase()){
   try{data=await localAddBooking(row)}catch(e){if(e.code==='DUPLICATE_TRX')return NextResponse.json({error:'Duplicate booking request.'},{status:409});throw e}
  }else{
   const r=await adminClient().from('bookings').insert(row).select('id,code,status,duration,price,profile_name,created_at,provider,payment_source').single();
   if(r.error){if(r.error.code==='23505')return NextResponse.json({error:'এই Transaction ID দিয়ে Booking ইতিমধ্যে আছে।'},{status:409});throw r.error}data={...r.data,access_token_hash:accessHash};
  }
  return NextResponse.json({booking:{id:data.id,code:data.code,status:data.status,duration:data.duration,price:data.price,profileName:data.profile_name,accessToken}},{status:201});
 }catch(e){return NextResponse.json({error:e.message||'Booking failed'},{status:500})}
}
export async function GET(req){
 if(!requireAdmin(req))return NextResponse.json({error:'Unauthorized'},{status:401});
 try{if(!hasSupabase())return NextResponse.json({bookings:await localBookings(),mode:'local'});const {data,error}=await adminClient().from('bookings').select('id,code,profile_id,profile_name,user_imo,trx_id,provider,payment_source,duration,price,status,created_at').order('created_at',{ascending:false});if(error)throw error;return NextResponse.json({bookings:data||[],mode:'supabase'})}catch(e){return NextResponse.json({error:e.message||'Could not load bookings'},{status:500})}
}
