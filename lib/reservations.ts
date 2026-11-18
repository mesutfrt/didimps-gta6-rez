export const branches = [{id:1,name:'Şube 1',area:'Didim',tables:8,price:200},{id:2,name:'Şube 2',area:'Didim',tables:8,price:200}];
export const hours = Array.from({length:24},(_,i)=>i);
export const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const clock = (h:number) => `${String(h).padStart(2,'0')}:00`;
export function validateBooking(b:any) {
 const branch=branches.find(x=>x.id===b.branch);
 if(!branch || !Number.isInteger(b.table) || b.table<1 || b.table>branch.tables) return 'Geçerli bir şube ve masa seçin.';
 if(typeof b.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.date)||!Number.isFinite(Date.parse(b.date))||new Date(b.date).toISOString().slice(0,10)!==b.date) return 'Geçerli bir tarih seçin.';
 if(!Number.isInteger(b.hour)||b.hour<0||b.hour>23||!Number.isInteger(b.duration)||b.duration<1||b.duration>4||b.hour+b.duration>24) return 'Seans 00:00–24:00 arasında, 1–4 saat olmalı.';
 if(new Date(`${b.date}T${clock(b.hour)}:00+03:00`).getTime()<=Date.now()) return 'Geçmiş bir saate rezervasyon yapılamaz.';
 if(Date.parse(b.date)-Date.parse(today())>90*86400000) return 'En fazla 90 gün sonrası için rezervasyon yapılabilir.';
 if(typeof b.name!=='string'||b.name.trim().length<2||b.name.length>80) return 'Ad soyad 2–80 karakter olmalı.';
 if(typeof b.phone!=='string'||! /^(?:\+90|0)?5\d{9}$/.test(b.phone.replace(/[\s()-]/g,''))) return 'Geçerli bir Türkiye cep telefonu girin.';
 return null;
}
