import {NextResponse} from 'next/server';
import {adminClient,hashToken,hasSupabase,requireAdmin} from '../../../../lib/server';
import {localBookings,localSettings} from '../../../../lib/store';
function tokenFrom(req){return req.headers.get('x-booking-token')||new URL(req.url).searchParams.get('token')||''}
function publicBooking(data,managerNumber){return {id:data.id,code:data.code,profileName:data.profile_name,duration:data.duration,price:data.price,status:data.status,createdAt:data.created_at,...(data.status==='approved'&&managerNumber?{managerNumber}: {})}}
export async function GET(req,{params}){
 try{
  const admin=requireAdmin(req);let data;
  if(!hasSupabase()) data=(await localBookings()).find(x=>x.id===params.id);
  else {const r=await adminClient().from('bookings').select('id,code,profile_name,duration,price,status,created_at,access_token_hash').eq('id',params.id).single();if(!r.error)data=r.data}
  if(!data)return NextResponse.json({error:'Not found'},{status:404});
  if(!admin){const token=tokenFrom(req);if(!token||!data.access_token_hash||hashToken(token)!==data.access_token_hash)return NextResponse.json({error:'Unauthorized'},{status:401})}
  let managerNumber='';
  if(data.status==='approved'){
   const s=hasSupabase()?await adminClient().from('settings').select('manager_number').eq('id',1).single():{data:await localSettings()};
   managerNumber=s.data?.manager_number||'';
  }
  return NextResponse.json({booking:publicBooking(data,managerNumber)});
 }catch(e){return NextResponse.json({error:'Not found'},{status:404})}
}
