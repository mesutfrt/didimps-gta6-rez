import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {branches,validateBooking} from '../../../lib/reservations';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function guard(req:Request,write=false){
 if(!await getChatGPTUser())return json({error:'Devam etmek için giriş yapın.'},401);
 if(write && req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Geçersiz istek.'},403);
 if(!env.DB)return json({error:'Veritabanına bağlanılamadı.'},503);
}
export async function GET(req:Request){
 const error=await guard(req);if(error)return error;
 const date=new URL(req.url).searchParams.get('date');
 if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date))return json({error:'Tarih gerekli.'},400);
 const data=await env.DB!.prepare('SELECT * FROM bookings WHERE date = ? ORDER BY hour, table_no').bind(date).all();
 return json(data.results);
}
export async function POST(req:Request){
 const error=await guard(req,true);if(error)return error;
 let b:any;try{b=await req.json();}catch{return json({error:'Geçersiz veri.'},400);}
 if(!b||typeof b!=='object')return json({error:'Geçersiz veri.'},400);
 const invalid=validateBooking(b);if(invalid)return json({error:invalid},400);
 const id=crypto.randomUUID();const db=env.DB!;const total=branches.find(x=>x.id===b.branch)!.price*b.duration;
 try{
 await db.batch([
 db.prepare('INSERT INTO bookings (id,branch,table_no,date,hour,duration,name,phone,total,status,created) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(id,b.branch,b.table,b.date,b.hour,b.duration,b.name.trim(),b.phone,total,'confirmed',new Date().toISOString()),
 ...Array.from({length:b.duration},(_,i)=>db.prepare('INSERT INTO slots (id,booking,branch,table_no,date,hour) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),id,b.branch,b.table,b.date,b.hour+i))]);
 return json({id,total},201);
 }catch(e){if(String(e).includes('UNIQUE constraint'))return json({error:'Bu masa seçilen saatlerde dolu. Başka bir masa seçin.'},409);return json({error:'Rezervasyon kaydedilemedi. Tekrar deneyin.'},500);}
}
export async function DELETE(req:Request){
 const error=await guard(req,true);if(error)return error;
 let b:any;try{b=await req.json();}catch{return json({error:'Geçersiz veri.'},400);}
 if(typeof b?.id!=='string')return json({error:'Rezervasyon gerekli.'},400);
 const db=env.DB!;
 await db.batch([db.prepare("UPDATE bookings SET status='cancelled' WHERE id=?").bind(b.id),db.prepare('DELETE FROM slots WHERE booking=?').bind(b.id)]);
 return json({ok:true});
}

