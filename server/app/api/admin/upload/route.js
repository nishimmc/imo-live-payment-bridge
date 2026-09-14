import {NextResponse} from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import {adminClient,requireAdmin} from '../../../../lib/server';
export const runtime='nodejs';
const BUCKET='profile-images';const MAX=8*1024*1024;
const SIGNATURES=[
 {type:'image/jpeg',ext:'jpg',test:b=>b.length>=3&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff},
 {type:'image/png',ext:'png',test:b=>b.length>=8&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))},
 {type:'image/webp',ext:'webp',test:b=>b.length>=12&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'},
 {type:'image/gif',ext:'gif',test:b=>b.length>=6&&(b.toString('ascii',0,6)==='GIF87a'||b.toString('ascii',0,6)==='GIF89a')}
];
const uploadHits=new Map();
function allowed(req){const k=(req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();const now=Date.now();const a=uploadHits.get(k)||{n:0,t:now};if(now-a.t>60000){a.n=0;a.t=now}if(a.n>=30)return false;a.n++;uploadHits.set(k,a);return true}
async function ensureBucket(db){const {data,error}=await db.storage.getBucket(BUCKET);if(!error&&data)return;const {error:createError}=await db.storage.createBucket(BUCKET,{public:true,fileSizeLimit:`${MAX}`,allowedMimeTypes:SIGNATURES.map(x=>x.type)});if(createError&&!/already exists|duplicate/i.test(createError.message||''))throw createError}
export async function POST(req){
 if(!requireAdmin(req))return NextResponse.json({error:'Unauthorized'},{status:401});
 if(!allowed(req))return NextResponse.json({error:'Too many uploads. Please wait a minute.'},{status:429});
 try{
  const fd=await req.formData(),file=fd.get('file');if(!file||typeof file.arrayBuffer!=='function')throw new Error('কোনো image file পাওয়া যায়নি।');
  if(file.size<=0)throw new Error('Image fileটি empty।');if(file.size>MAX)throw new Error('Image সর্বোচ্চ 8MB হতে পারবে।');
  const buffer=Buffer.from(await file.arrayBuffer());const detected=SIGNATURES.find(x=>x.test(buffer));if(!detected)throw new Error('ফাইলটি সত্যিকারের JPG, PNG, WEBP বা GIF image নয়।');
  const declared=(file.type||'').toLowerCase();if(declared&&declared!==detected.type)throw new Error('Image MIME type ও file content মিলছে না।');
  try{const db=adminClient();await ensureBucket(db);const storagePath=`profiles/${crypto.randomBytes(24).toString('hex')}.${detected.ext}`;const {error}=await db.storage.from(BUCKET).upload(storagePath,buffer,{contentType:detected.type,upsert:false,cacheControl:'3600'});if(error)throw error;const {data}=db.storage.from(BUCKET).getPublicUrl(storagePath);if(!data?.publicUrl)throw new Error('Public image URL তৈরি করা যায়নি।');return NextResponse.json({ok:true,url:data.publicUrl,path:storagePath,source:'supabase'})}
  catch(storageError){if(process.env.NODE_ENV!=='development')throw storageError;const filename=`${crypto.randomBytes(24).toString('hex')}.${detected.ext}`,dir=path.join(process.cwd(),'public','uploads');await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,filename),buffer,{flag:'wx'});return NextResponse.json({ok:true,url:`/uploads/${filename}`,source:'local',warning:'Supabase Storage unavailable; saved locally for development.'})}
 }catch(e){console.error('ADMIN_IMAGE_UPLOAD_ERROR',e);return NextResponse.json({error:e?.message||'Image upload failed'},{status:400})}
}
