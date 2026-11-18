import assert from 'node:assert/strict';
const base='http://127.0.0.1:5173';
const headers={'Content-Type':'application/json',Origin:base};
const date=new Date(Date.now()+86400000).toISOString().slice(0,10);
const payload={branch:1,table:8,date,hour:18,duration:2,name:'API Test',phone:'05550000000'};
const post=(b)=>fetch(base+'/api/reservations',{method:'POST',headers,body:JSON.stringify(b)});
assert.equal((await post({...payload,hour:23})).status,400); // 23:00 + 2h = 25:00 > 24:00 (fails)
assert.equal((await post({...payload,date:'2026-02-30'})).status,400);

// Test 7/24 early hour booking: 02:00 (succeeds)
const early = await post({...payload, hour: 2, duration: 2});
assert.equal(early.status, 201, '02:00 booking should succeed in 7/24');
const earlyBody = await early.json();
await fetch(base+'/api/reservations',{method:'DELETE',headers,body:JSON.stringify({id:earlyBody.id})});

const concurrent=await Promise.all([post(payload),post(payload)]);
assert.deepEqual(concurrent.map(r=>r.status).sort(),[201,409]);
const winner=await concurrent.find(r=>r.status===201).json();
const list=await (await fetch(base+'/api/reservations?date='+date,{headers})).json();
assert.equal(list.filter(r=>r.table_no===8&&r.branch===1&&r.status==='confirmed').length,1);
const other=await post({...payload,branch:2}); assert.equal(other.status,201);const otherBody=await other.json();
for(const id of [winner.id,otherBody.id])assert.equal((await fetch(base+'/api/reservations',{method:'DELETE',headers,body:JSON.stringify({id})})).status,200);
const again=await post(payload);assert.equal(again.status,201);const againBody=await again.json();
await fetch(base+'/api/reservations',{method:'DELETE',headers,body:JSON.stringify({id:againBody.id})});
console.log('PASS: direct access, invalid date, 7/24 early booking, closing time, atomic conflict, branch isolation, cancel and rebook.');
