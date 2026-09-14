import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const dir=path.join(process.cwd(),'.localdata');
const file=path.join(dir,'db.json');
const lockDir=path.join(dir,'.db.lock');
const demos=[
 ['Aisha',22,true,'https://randomuser.me/api/portraits/women/44.jpg','Friendly and professional verified agency profile.',['Bengali','English','Hindi']],
 ['Nusrat',24,true,'https://randomuser.me/api/portraits/women/49.jpg','Warm personality and easy conversation.',['Bengali','English']],
 ['Maya',21,false,'https://randomuser.me/api/portraits/women/52.jpg','Cheerful and outgoing verified agency profile.',['Bengali','English']],
 ['Tania',23,true,'https://randomuser.me/api/portraits/women/45.jpg','Friendly verified model profile.',['Bengali','English','Hindi']],
 ['Mim',25,true,'https://randomuser.me/api/portraits/women/47.jpg','Professional and polite agency profile.',['Bengali','English']],
 ['Jannat',22,false,'https://randomuser.me/api/portraits/women/48.jpg','Easy-going and friendly verified profile.',['Bengali','English']],
 ['Riya',26,true,'https://randomuser.me/api/portraits/women/50.jpg','Calm, friendly and professional.',['Bengali','English','Hindi']],
 ['Sadia',23,true,'https://randomuser.me/api/portraits/women/51.jpg','Verified agency profile for private video calls.',['Bengali','English']],
 ['Nila',21,false,'https://randomuser.me/api/portraits/women/53.jpg','Cheerful and conversational verified profile.',['Bengali','English']],
 ['Puja',24,true,'https://randomuser.me/api/portraits/women/54.jpg','Friendly and professional verified profile.',['Bengali','English','Hindi']]
];
const prices={10:300,20:600,30:900,45:1200,60:1500};
const now=()=>new Date().toISOString();
let writeQueue=Promise.resolve();
async function read(){try{return JSON.parse(await fs.readFile(file,'utf8'))}catch{return null}}
async function writeUnsafe(db){await fs.mkdir(dir,{recursive:true});const tmp=`${file}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;await fs.writeFile(tmp,JSON.stringify(db,null,2),'utf8');await fs.rename(tmp,file)}
async function acquireFileLock(){await fs.mkdir(dir,{recursive:true});for(let attempt=0;attempt<80;attempt++){try{await fs.mkdir(lockDir);await fs.writeFile(path.join(lockDir,'owner'),JSON.stringify({pid:process.pid,at:Date.now()}));return}catch{try{const st=await fs.stat(path.join(lockDir,'owner'));if(Date.now()-st.mtimeMs>30000)await fs.rm(lockDir,{recursive:true,force:true})}catch{}await new Promise(r=>setTimeout(r,25))}}throw new Error('Local data store is busy. Please retry.')}
async function releaseFileLock(){await fs.rm(lockDir,{recursive:true,force:true}).catch(()=>{})}
async function withLock(fn){const previous=writeQueue;let release;writeQueue=new Promise(r=>{release=r});await previous;await acquireFileLock();try{return await fn()}finally{await releaseFileLock();release()}}
function demoProfiles(){return demos.map((d,i)=>({id:crypto.randomUUID(),name:d[0],age:d[1],online:d[2],photo:d[3],gallery:[d[3]],bio:d[4],languages:d[5],rating:5,reviews:0,price:300,price_10:prices[10],price_20:prices[20],price_30:prices[30],price_45:prices[45],price_60:prices[60],realImo:`0170000${String(i+1).padStart(4,'0')}`,active:true,created_at:now()}))}
async function initLocalUnsafe(){let db=await read();if(!db){db={profiles:demoProfiles(),bookings:[],payment_events:[],reviews:[],settings:{id:1,manager_number:process.env.NEXT_PUBLIC_MANAGER_NUMBER||'+8801770255813',manager_name:'ImoLive Manager',bkash_number:'017XX-XXXXXX',nagad_number:'01XX-XXXXXX',top_banner_enabled:true,top_banner_text:'✨ Verified Models • Fast Booking • Secure Agency Service',top_banner_image:'',top_banner_link:'',top_banner_animation:'marquee',bottom_banner_enabled:true,bottom_banner_text:'📲 Payment করুন — নম্বর ও Amount দিয়ে automatic verification',bottom_banner_image:'',bottom_banner_link:'',bottom_banner_animation:'pulse'}};await writeUnsafe(db)}if(!Array.isArray(db.payment_events))db.payment_events=[];return db}
export async function initLocal(){return withLock(initLocalUnsafe)}
export async function localProfiles(){return (await initLocal()).profiles}
export async function localAddProfile(p){return withLock(async()=>{const db=await initLocalUnsafe();const row={...p,id:crypto.randomUUID(),created_at:now()};db.profiles.unshift(row);await writeUnsafe(db);return row})}
export async function localUpdateProfile(id,p){return withLock(async()=>{const db=await initLocalUnsafe();const i=db.profiles.findIndex(x=>x.id===id);if(i<0)throw new Error('Profile not found');db.profiles[i]={...db.profiles[i],...p,id};await writeUnsafe(db);return db.profiles[i]})}
export async function localHideProfile(id){return localUpdateProfile(id,{active:false})}
export async function localRestoreProfile(id){return localUpdateProfile(id,{active:true})}
export async function localBookings(){return (await initLocal()).bookings}
export async function localAddBooking(b){return withLock(async()=>{const db=await initLocalUnsafe();const provider=String(b.provider||'').trim().toLowerCase();const source=String(b.payment_source||'').replace(/\D/g,'');if(!provider||!source)throw new Error('Payment source required');const row={...b,id:crypto.randomUUID(),created_at:now(),provider,payment_source:source};db.bookings.unshift(row);await writeUnsafe(db);return row})}
export async function localAddPaymentAndMatch(event){return withLock(async()=>{const db=await initLocalUnsafe();const hash=String(event.sms_hash||'').trim();if(hash&&db.payment_events.some(x=>x.sms_hash===hash)){const e=new Error('Duplicate payment SMS');e.code='DUPLICATE_SMS';throw e}const ev={...event,id:crypto.randomUUID(),created_at:now(),used:false};db.payment_events.unshift(ev);const provider=String(event.provider||'').trim().toLowerCase();const source=String(event.payment_source||'').replace(/\D/g,'');const amount=Number(event.amount);const received=Date.parse(event.received_at||ev.created_at);const min=received-15*60*1000;const max=received+2*60*1000;const idx=db.bookings.findIndex(b=>b.status==='pending'&&String(b.provider||'').toLowerCase()===provider&&String(b.payment_source||'').replace(/\D/g,'')===source&&Number(b.price)===amount&&Date.parse(b.created_at)>=min&&Date.parse(b.created_at)<=max);if(idx>=0){db.bookings[idx].status='approved';db.bookings[idx].payment_event_id=ev.id;ev.used=true;ev.booking_id=db.bookings[idx].id;await writeUnsafe(db);return {matched:true,booking:db.bookings[idx],event:ev}}await writeUnsafe(db);return {matched:false,event:ev}})}
export async function localPaymentEvents(){return (await initLocal()).payment_events||[]}
export async function localPaymentDeviceHeartbeat(info){return withLock(async()=>{const db=await initLocalUnsafe();if(!db.payment_device)db.payment_device={device_key:'',app_version:'',device_model:'',last_seen_at:null,last_sms_at:null,last_upload_at:null,last_result:'',created_at:now()};db.payment_device={...db.payment_device,...info,last_seen_at:now()};await writeUnsafe(db);return db.payment_device})}
export async function localPaymentDevice(){return (await initLocal()).payment_device||null}

export async function localUpdateBooking(id,status,expectedStatus=null){return withLock(async()=>{const db=await initLocalUnsafe();const i=db.bookings.findIndex(x=>x.id===id);if(i<0)throw new Error('Booking not found');if(expectedStatus&&db.bookings[i].status!==expectedStatus){const e=new Error(`Booking is already ${db.bookings[i].status}.`);e.code='INVALID_STATUS';throw e}db.bookings[i].status=status;await writeUnsafe(db);return db.bookings[i]})}
export async function localSettings(){return (await initLocal()).settings}
export async function localUpdateSettings(s){return withLock(async()=>{const db=await initLocalUnsafe();db.settings={...db.settings,...s,id:1};await writeUnsafe(db);return db.settings})}
export async function localAddReview(r){return withLock(async()=>{const db=await initLocalUnsafe();if(!db.profiles.some(p=>p.id===r.profile_id))throw new Error('Profile not found');db.reviews.push({...r,id:crypto.randomUUID(),created_at:now()});const rows=db.reviews.filter(x=>x.profile_id===r.profile_id);const avg=rows.reduce((a,x)=>a+Number(x.rating),0)/rows.length;const p=db.profiles.find(x=>x.id===r.profile_id);if(p){p.rating=Number(avg.toFixed(1));p.reviews=rows.length}await writeUnsafe(db);return {rating:Number(avg.toFixed(1)),reviews:rows.length}})}
