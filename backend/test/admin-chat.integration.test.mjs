import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
process.env.MESSAGING_BROWSER_FIXTURE='1';const {fixture}=await import('./messaging.integration.test.mjs');
test('staff media is permission checked, scoped to its conversation and private in both directions',{timeout:90000},async()=>{
 const f=await fixture(),{req,actors:a,base,db}=f;
 async function upload(id,who,buffer,name,mime,key=randomUUID(),status=201){const body=new FormData();body.append('key',key);body.append('file',new Blob([buffer],{type:mime}),name);const r=await fetch(`${base}/admin/inbox/${id}/media`,{method:'POST',headers:{Cookie:a[who].cookie,Origin:process.env.MESSAGING_TEST_ORIGIN??'http://localhost:8081','X-CSRF-Protection':'1'},body});const result=await r.json();assert.equal(r.status,status,JSON.stringify(result));return result.data;}
 const getMedia=async(id,who,status)=>{const r=await fetch(`${base}/support/media/${id}`,{headers:{Cookie:a[who].cookie}});assert.equal(r.status,status);return r;};
 try{
 await db.model('User').updateOne({_id:a.client.id},{$set:{name:'Client Alpha'}});await db.model('User').updateOne({_id:a.other.id},{$set:{name:'Client Beta'}});
 const first=(await req('/account/chat/messages',201,{cookie:a.client.cookie,body:{key:randomUUID(),text:'Alpha question'}})).json.data.id,second=(await req('/account/chat/messages',201,{cookie:a.other.cookie,body:{key:randomUUID(),text:'Beta question'}})).json.data.id;
 const list=(await req('/admin/inbox',200,{cookie:a.writer.cookie})).json.data;assert.equal(list.find(t=>t.id===first).client.name,'Client Alpha');assert.equal((await req('/admin/inbox?search=Client%20Alpha',200,{cookie:a.writer.cookie})).json.data.length,1);assert.equal((await req('/admin/inbox/'+first,200,{cookie:a.reader.cookie})).json.data.client.name,'Client Alpha');
 const totals=(await req('/admin/inbox',200,{cookie:a.writer.cookie})).json.counts;assert.deepEqual(totals,{all:2,unread:2});
 const filtered=(await req('/admin/inbox?search=Alpha&filter=unread',200,{cookie:a.writer.cookie})).json;assert.deepEqual(filtered.counts,{all:1,unread:1});assert.equal(filtered.data.length,1);
 const profile=(await req('/admin/inbox/'+first,200,{cookie:a.reader.cookie})).json.data.client;assert.equal(typeof profile.email,'string');assert(profile.createdAt);assert.equal(profile.passwordHash,undefined);assert.equal(profile.role,undefined);
 await req('/admin/inbox/'+first+'/read',201,{cookie:a.writer.cookie,body:{sequence:1}});assert.deepEqual((await req('/admin/inbox',200,{cookie:a.writer.cookie})).json.counts,{all:2,unread:1});
 assert.deepEqual((await req('/account/messages',200,{cookie:a.client.cookie})).json.counts,{all:1,unread:0});
 const image=await require('sharp')({create:{width:20,height:20,channels:3,background:'#16c2ff'}}).png().toBuffer(),pdf=Buffer.from('%PDF-1.4\n%%EOF\n'),audio=Buffer.alloc(16044);audio.write('RIFF');audio.writeUInt32LE(audio.length-8,4);audio.write('WAVEfmt ',8);audio.writeUInt32LE(16,16);audio.writeUInt16LE(1,20);audio.writeUInt16LE(1,22);audio.writeUInt32LE(8000,24);audio.writeUInt32LE(16000,28);audio.writeUInt16LE(2,32);audio.writeUInt16LE(16,34);audio.write('data',36);audio.writeUInt32LE(audio.length-44,40);
 for(const role of ['reader','denied','client'])await upload(first,role,image,'image.png','image/png',randomUUID(),role==='client'?401:403);
 const key=randomUUID(),photo=await upload(first,'writer',image,'image.png','image/png',key);assert.equal((await upload(first,'writer',image,'image.png','image/png',key)).id,photo.id);await upload(second,'writer',image,'image.png','image/png',key,409);await getMedia(photo.id,'client',404);await getMedia(photo.id,'reader',404);await getMedia(photo.id,'writer',200);
 const document=await upload(first,'writer',pdf,'support.pdf','application/pdf'),voice=await upload(first,'writer',audio,'voice.wav','audio/wav'),payload={key:randomUUID(),text:'',attachments:[photo.id,document.id,voice.id]};
 await req(`/admin/inbox/${second}/messages`,403,{cookie:a.writer.cookie,body:payload});await req(`/admin/inbox/${first}/messages`,403,{cookie:a.reader.cookie,body:payload});await req(`/admin/inbox/${first}/messages`,403,{cookie:a.admin.cookie,body:payload});
 await Promise.all(Array.from({length:3},()=>req(`/admin/inbox/${first}/messages`,201,{cookie:a.writer.cookie,body:payload})));assert.equal((await db.model('SupportConversation').findById(first).lean()).messages.length,2);
 for(const who of ['client','writer','reader','admin'])await getMedia(voice.id,who,200);for(const who of ['other','denied'])await getMedia(voice.id,who,404);
 const history=(await req('/account/chat',200,{cookie:a.client.cookie})).json.data;assert.equal(history.messages[1].attachments.length,3);assert.equal(history.messages[1].staff,true);const notifications=(await req('/account/notifications',200,{cookie:a.client.cookie})).json.data;assert.equal(notifications.unread,1);assert.equal(notifications.items[0].text,'image.png');await req(`/admin/inbox/${first}/messages`,201,{cookie:a.writer.cookie,body:payload});assert.equal((await req('/account/notifications',200,{cookie:a.client.cookie})).json.data.unread,1);
 await req(`/admin/inbox/${first}`,200,{cookie:a.admin.cookie,method:'PATCH',body:{assignee:a.writer.id,status:'closed'}});assert.equal((await req('/admin/inbox/'+first,200,{cookie:a.admin.cookie})).json.data.assignee,a.writer.id);
 const staged=await upload(first,'writer',image,'staged.png','image/png');await db.model('User').updateOne({_id:a.writer.id},{$set:{role:'CONTENT_EDITOR'}});await getMedia(voice.id,'writer',404);await getMedia(staged.id,'writer',404);await upload(first,'writer',image,'blocked.png','image/png',randomUUID(),403);await getMedia(voice.id,'client',200);
 console.log('PASS client names/search, staff upload permissions, recipient isolation, staged privacy, bidirectional playback, concurrent retries, notifications, assignment, resolution and permission revocation');
 }finally{await f.cleanup();}
});
