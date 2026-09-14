import {NextResponse} from 'next/server';
import {adminClient,hasSupabase,requireAdmin} from '../../../../lib/server';
import {localProfiles} from '../../../../lib/store';
export async function GET(req){
 if(!requireAdmin(req)) return NextResponse.json({error:'Unauthorized'},{status:401});
 try{
  if(!hasSupabase()) return NextResponse.json({ok:true,mode:'local',message:'Local mode is active. No Supabase connection is required.',profiles:(await localProfiles()).length});
  const {error}=await adminClient().from('profiles').select('id').limit(1);
  if(error) throw error;
  return NextResponse.json({ok:true,mode:'supabase',message:'Supabase connected.'});
 }catch(e){return NextResponse.json({ok:false,mode:'supabase',message:e.message||'Supabase connection failed'},{status:503});}
}
