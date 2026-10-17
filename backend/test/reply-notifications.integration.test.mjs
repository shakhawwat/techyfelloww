import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
process.env.MESSAGING_BROWSER_FIXTURE='1';
const {fixture}=await import('./messaging.integration.test.mjs');
test('reply notifications are atomic, private, deduplicated and persisted',{timeout:90000},async()=>{
 const f=await fixture(),{req,actors:a,db}=f;
 let cookie=a.client.cookie;
 const notifications=async()=> (await req('/account/notifications',200,{cookie})).json.data;
 const reply=async(id,body,who='admin')=>req(`/admin/inbox/${id}/messages`,201,{cookie:a[who].cookie,body});
 try{
  await req('/account/notifications',401);await req('/account/notifications?owner='+a.other.id,400,{cookie});
  assert.deepEqual((await notifications()).items,[]);assert.equal((await notifications()).unread,0);
  const thread=(await req('/account/messages',201,{cookie,body:{key:randomUUID(),kind:'general',subject:'Notification support',text:'User question'}})).json.data;
  assert.equal((await notifications()).unread,0);
  const outgoing={key:randomUUID(),text:'First real staff reply'};
  await Promise.all(Array.from({length:5},()=>reply(thread.id,outgoing)));
  const first=await notifications();assert.equal(first.ownerId,a.client.id);assert.equal(first.items.length,1);assert.equal(first.unread,1);assert.equal(first.items[0].conversationId,thread.id);assert.equal(first.items[0].readAt,null);assert.equal(first.items[0].text,outgoing.text);assert(Number.isFinite(Date.parse(first.items[0].createdAt)));
  const id=first.items[0].id;assert.equal((await req('/account/notifications',200,{cookie:a.other.cookie})).json.data.unread,0);
  await req(`/account/notifications/${id}/read`,404,{cookie:a.other.cookie,body:{}});await req('/account/notifications/read-all',201,{cookie:a.other.cookie,body:{through:first.through}});assert.equal((await notifications()).unread,1);
  await req(`/account/notifications/${id}/read`,201,{cookie,body:{}});await req(`/account/notifications/${id}/read`,201,{cookie,body:{}});assert.equal((await notifications()).unread,0);assert((await notifications()).items[0].readAt);
  const stored=await db.model('SupportConversation').findById(thread.id).lean();assert(stored.messages[1].notificationReadAt instanceof Date);
  const relogin=await req('/account/login',200,{body:{email:'client@example.invalid',password:'Isolated support password 123!'}});cookie=relogin.cookie;assert.equal((await notifications()).unread,0);assert.equal((await req('/account/messages/'+thread.id,200,{cookie})).json.data.messages.length,2);
  await reply(thread.id,{key:randomUUID(),text:'Second reply'});const snapshot=await notifications();assert.equal(snapshot.unread,1);await delay(5);await reply(thread.id,{key:randomUUID(),text:'Newer reply'});
  await req('/account/notifications/read-all',201,{cookie,body:{through:snapshot.through}});assert.equal((await notifications()).unread,1,'newer reply remains unread');const latest=await notifications();await req('/account/notifications/read-all',201,{cookie,body:{through:latest.through}});assert.equal((await notifications()).unread,0);await reply(thread.id,outgoing);assert.equal((await notifications()).unread,0,'retry must not resurrect notification');
  await req('/account/notifications/read-all',400,{cookie,body:{through:new Date(Date.now()+86400000).toISOString()}});await req('/account/notifications/read-all',400,{cookie,body:{}});await req(`/account/notifications/${id}/read`,400,{cookie,body:{owner:a.other.id}});await req('/account/notifications/bad/read',404,{cookie,body:{}});await req(`/account/notifications/${id}/read`,403,{cookie,body:{},origin:'https://invalid.example'});
  await req(`/admin/inbox/${thread.id}/messages`,403,{cookie:a.reader.cookie,body:{key:randomUUID(),text:'Unauthorized reply'}});assert.equal((await notifications()).items.length,3);
  const own=(await req('/account/messages',201,{cookie:a.admin.cookie,body:{key:randomUUID(),kind:'general',subject:'Staff own thread',text:'My own question'}})).json.data;await reply(own.id,{key:randomUUID(),text:'My own message'});assert.equal((await req('/account/notifications',200,{cookie:a.admin.cookie})).json.data.items.length,0);
  console.log('PASS notifications: user → admin → user, concurrent retry dedupe, read/all-read persistence, re-login history, new-reply race, own-message exclusion, ownership, staff permissions and CSRF');
 }finally{await f.cleanup();}
});
