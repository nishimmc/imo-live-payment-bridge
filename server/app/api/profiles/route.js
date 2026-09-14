import {NextResponse} from 'next/server';
import {adminClient,hasSupabase} from '../../../lib/server';
import {localProfiles} from '../../../lib/store';
const fields='id,name,age,rating,reviews,online,photo,bio,languages,price,price_10,price_20,price_30,price_45,price_60,gallery';
export async function GET(){try{if(!hasSupabase()){const p=await localProfiles();return NextResponse.json({profiles:p.filter(x=>x.active).map(({realImo,...x})=>x),mode:'local'})}const {data,error}=await adminClient().from('profiles').select(fields).eq('active',true).order('created_at',{ascending:false});if(error)throw error;return NextResponse.json({profiles:data||[],mode:'supabase'})}catch(e){return NextResponse.json({profiles:[],error:e.message||'Profiles unavailable',mode:'error'},{status:503})}}
