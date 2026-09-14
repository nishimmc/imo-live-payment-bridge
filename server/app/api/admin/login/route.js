import {NextResponse} from 'next/server';
import {ADMIN_DEFAULT_PASSWORD,setAdminCookie} from '../../../../lib/server';
const attempts=new Map();
const WINDOW=15*60*1000, MAX=8;
function clientKey(req){return (req.headers.get('x-forwarded-for')||req.headers.get('x-real-ip')||'unknown').split(',')[0].trim().slice(0,100)||'unknown'}
export async function POST(req){
 try{
  const key=clientKey(req),now=Date.now();
  const a=attempts.get(key)||{count:0,at:now};
  if(now-a.at>WINDOW){a.count=0;a.at=now;}
  if(a.count>=MAX)return NextResponse.json({error:'Too many login attempts. Try again later.'},{status:429,headers:{'Retry-After':String(Math.ceil((WINDOW-(now-a.at))/1000))}});
  const body=await req.json();const password=typeof body?.password==='string'?body.password:'';
  const expected=(process.env.ADMIN_PASSWORD||'').trim() || (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.LOCAL_MODE==='true' ? ADMIN_DEFAULT_PASSWORD : '');
  if(!expected || password!==expected){a.count++;a.at=now;attempts.set(key,a);return NextResponse.json({error:'Wrong password'},{status:401});}
  attempts.delete(key);return setAdminCookie(NextResponse.json({ok:true}));
 }catch{return NextResponse.json({error:'Invalid request'},{status:400})}
}
