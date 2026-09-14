import crypto from 'crypto';
import {createClient} from '@supabase/supabase-js';

const SESSION_COOKIE='imo_admin';
const SESSION_TTL=8*60*60;

export function hasSupabase(){
 const u=(process.env.NEXT_PUBLIC_SUPABASE_URL||'').trim();
 const k=(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
 try{new URL(u)}catch{return false}return process.env.LOCAL_MODE!=='true' && /^https:\/\//i.test(u) && k && !/YOUR_|CHANGE_THIS|YOUR_PROJECT/i.test(u+' '+k);
}
export function adminClient(){
 if(!hasSupabase()) throw new Error('Supabase is not configured. LOCAL_MODE is enabled or Supabase credentials are missing.');
 return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
}
function encryptionKey(){
 const raw=(process.env.IMO_ENCRYPTION_KEY||'').trim();
 if(/^[0-9a-fA-F]{64}$/.test(raw))return Buffer.from(raw,'hex');
 return crypto.createHash('sha256').update(`imo-live-dev:${process.env.ADMIN_PASSWORD||'ImoLive@2026#7vQ9!mR2'}`).digest();
}
function sessionKey(){
 const configured=(process.env.ADMIN_SESSION_SECRET||'').trim();
 return crypto.createHash('sha256').update(configured||`imo-live-session:${process.env.ADMIN_PASSWORD||'ImoLive@2026#7vQ9!mR2'}`).digest();
}
export function encrypt(text){const key=encryptionKey(),iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key,iv),enc=Buffer.concat([c.update(String(text),'utf8'),c.final()]);return `${iv.toString('hex')}:${c.getAuthTag().toString('hex')}:${enc.toString('hex')}`}
export function decrypt(payload){try{const [ivHex,tagHex,dataHex]=String(payload||'').split(':');if(!ivHex||!tagHex||!dataHex)return '';const d=crypto.createDecipheriv('aes-256-gcm',encryptionKey(),Buffer.from(ivHex,'hex'));d.setAuthTag(Buffer.from(tagHex,'hex'));return Buffer.concat([d.update(Buffer.from(dataHex,'hex')),d.final()]).toString('utf8')}catch{return ''}}

function b64(value){return Buffer.from(value).toString('base64url')}
function unb64(value){return Buffer.from(value,'base64url').toString('utf8')}
function sign(value){return crypto.createHmac('sha256',sessionKey()).update(value).digest('base64url')}
export function createAdminSession(){
 const payload=b64(JSON.stringify({exp:Math.floor(Date.now()/1000)+SESSION_TTL,jti:crypto.randomBytes(12).toString('hex')}));
 return `${payload}.${sign(payload)}`;
}
export function verifyAdminSession(token){
 try{
  const [payload,sig]=String(token||'').split('.');
  if(!payload||!sig)return false;
  const expected=sign(payload);
  if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return false;
  const data=JSON.parse(unb64(payload));
  return Number.isFinite(data.exp)&&data.exp>Math.floor(Date.now()/1000);
 }catch{return false}
}
export function requireAdmin(req){return verifyAdminSession(req.cookies.get(SESSION_COOKIE)?.value)}
export function setAdminCookie(response){response.cookies.set(SESSION_COOKIE,createAdminSession(),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:SESSION_TTL});return response}
export function clearAdminCookie(response){response.cookies.set(SESSION_COOKIE,'',{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:0});return response}
export function randomToken(bytes=32){return crypto.randomBytes(bytes).toString('base64url')}
export function hashToken(token){return crypto.createHash('sha256').update(String(token)).digest('hex')}
export function code(){return `IM${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(5).toString('hex').toUpperCase()}`}
export const ADMIN_DEFAULT_PASSWORD='ImoLive@2026#7vQ9!mR2';
