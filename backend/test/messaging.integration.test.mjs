import {scannerFixture} from './scanner-fixture.mjs';
// Only a randomly named, initially empty test database is ever changed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomBytes,randomUUID} from 'node:crypto';
const require=createRequire(import.meta.url);
export async function fixture(){
 assert.equal(process.env.NODE_ENV,'test');assert.match(process.env.TECHYFELLOW_TEST_MONGO??'',/^mongodb:\/\/172\.[0-9.]+:27017$/);
 const name=`techyfellow_test_messages_${randomBytes(8).toString('hex')}`;process.env.MONGODB_URI=`${process.env.TECHYFELLOW_TEST_MONGO}/${name}?directConnection=true`;process.env.AUTH_ALLOWED_ORIGINS=process.env.MESSAGING_TEST_ORIGIN??'http://localhost:8081';process.env.EMAIL_ENABLED='false';
 const {NestFactory}=require('@nestjs/core'),{getConnectionToken}=require('@nestjs/mongoose'),{AppModule}=require('../dist/app.module.js'),{AuthExceptionFilter}=require('../dist/auth/auth-exception.filter.js');
 const app=await NestFactory.create(AppModule,{logger:false});app.setGlobalPrefix('api/v1');app.useGlobalFilters(new AuthExceptionFilter());const db=app.get(getConnectionToken());await db.asPromise();assert.equal(db.name,name);assert.equal((await db.db.listCollections().toArray()).length,0);
 const scanner=await scannerFixture();
 try{
 for(const model of Object.values(db.models)){await model.createCollection();await model.createIndexes();}
 await app.listen(0,'127.0.0.1');const base=`http://127.0.0.1:${app.getHttpServer().address().port}/api/v1`,password='Isolated support password 123!',hash=await require('../dist/auth/password.js').hashPassword(password),users=db.model('User');
 const role='CUSTOM_'+randomBytes(12).toString('hex');await db.model('StaffRole').create({key:role,name:'Inbox reader',nameKey:'inbox reader',permissions:['admin:access','inbox:read'],revision:1});
 const writerRole='CUSTOM_'+randomBytes(12).toString('hex');await db.model('StaffRole').create({key:writerRole,name:'Inbox writer',nameKey:'inbox writer',permissions:['admin:access','inbox:read','inbox:manage'],revision:1});
 const actors={};for(const [name,roleKey] of [['client','MEMBER'],['other','MEMBER'],['admin','SUPER_ADMIN'],['denied','CONTENT_EDITOR'],['reader',role],['writer',writerRole]]){const u=await users.create({email:`${name}@example.invalid`,name,passwordHash:hash,enabled:true,role:roleKey});actors[name]={id:String(u._id)};}
 async function req(path,status,{body,cookie,method=body===undefined?'GET':'POST',origin=process.env.MESSAGING_TEST_ORIGIN??'http://localhost:8081'}={}){const r=await fetch(base+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(body===undefined?{}:{'Content-Type':'application/json',Origin:origin,'X-CSRF-Protection':'1'})},...(body===undefined?{}:{body:JSON.stringify(body)})});const json=await r.json();assert.equal(r.status,status,`${method} ${path}: ${JSON.stringify(json)}`);return {json,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 for(const name of Object.keys(actors)){await db.model('LoginThrottle').deleteMany({});actors[name].cookie=(await req(name==='client'||name==='other'?'/account/login':'/auth/login',200,{body:{email:`${name}@example.invalid`,password}})).cookie;}
 return {app,db,base,actors,req,scanner,cleanup:async()=>{try{await db.dropDatabase();}finally{await app.close();await scanner.close();}}};
 }catch(error){try{await db.dropDatabase();}finally{await app.close();await scanner.close();}throw error;}
}
if(!process.env.MESSAGING_BROWSER_FIXTURE)test('support lifecycle, retries, read cursors, permissions, ownership and validation',{timeout:90000},async()=>{
 const f=await fixture(),{req,actors:a,db}=f;const client=(path,status,body)=>req('/account/messages'+path,status,{cookie:a.client.cookie,body}),admin=(path,status,body,method)=>req('/admin/inbox'+path,status,{cookie:a.admin.cookie,body,method});
 try{
 const catalogue=(await req('/admin/staff-roles',200,{cookie:a.admin.cookie})).json;assert(catalogue.groups.some(g=>g.id==='inbox'));assert.deepEqual(require('../dist/auth/staff-role-policy.js').normalizeStaffPermissions(['inbox:manage']),['admin:access','inbox:manage','inbox:read']);
 await req('/account/messages',401);await req('/admin/inbox',401,{cookie:a.client.cookie});await req('/admin/inbox',403,{cookie:a.denied.cookie});
 const b={key:randomUUID(),subject:'General help',kind:'general',text:'Client question <img src=x onerror=alert(1)>'},created=(await client('',201,b)).json.data,id=created.id;
 assert.equal((await client('',201,b)).json.data.id,id);assert.equal(await db.model('SupportConversation').countDocuments(),1);
 await client('',409,{...b,text:'Different text'});await client('',400,{...b,key:randomUUID(),text:'x'.repeat(4001)});await client('',400,{...b,key:randomUUID(),subject:' '});await client('',400,{...b,key:randomUUID(),extra:'x'});
 for(const [path,body] of [[`/${id}`,undefined],[`/${id}/messages`,{key:randomUUID(),text:'Unauthorized'}],[`/${id}/read`,{sequence:1}]])await req('/account/messages'+path,404,{cookie:a.other.cookie,body});assert.equal((await req('/account/messages',200,{cookie:a.other.cookie})).json.data.length,0);
 assert.equal((await admin('',200)).json.data[0].unread,1);const detail=(await admin('/'+id,200)).json.data;assert.equal(detail.messages[0].text,b.text);await admin(`/${id}/read`,201,{sequence:1});assert.equal((await admin('?filter=unread',200)).json.data.length,0);
 await req('/admin/inbox/'+id,200,{cookie:a.reader.cookie});await req('/admin/inbox/'+id+'/messages',403,{cookie:a.reader.cookie,body:{key:randomUUID(),text:'No reply permission'}});await req('/admin/inbox/'+id,403,{cookie:a.reader.cookie,method:'PATCH',body:{status:'closed'}});
 const reply={key:randomUUID(),text:'Support reply'},attempts=await Promise.all(Array.from({length:5},()=>admin(`/${id}/messages`,201,reply)));assert.equal(attempts.length,5);assert.equal((await client('/'+id,200)).json.data.messages.length,2);assert.equal((await client('',200)).json.data[0].unread,1);await client(`/${id}/read`,201,{sequence:1});assert.equal((await client('',200)).json.data[0].unread,1);await client(`/${id}/read`,201,{sequence:2});assert.equal((await client('',200)).json.data[0].unread,0);await client(`/${id}/read`,400,{sequence:99});
 await admin('/'+id,400,{assignee:a.denied.id},'PATCH');await admin('/'+id,200,{assignee:a.writer.id,status:'closed'},'PATCH');assert.equal((await admin('?filter=closed',200)).json.data.length,1);await client(`/${id}/messages`,201,{key:randomUUID(),text:'Follow up'});assert.equal((await admin('?filter=open&search=General',200)).json.data.length,1);
 await client('',404,{key:randomUUID(),kind:'order',reference:randomBytes(12).toString('hex'),subject:'Order',text:'Help'});await client('',404,{key:randomUUID(),kind:'course',reference:'missing-course',subject:'Course',text:'Help'});
 const order=await db.collection('academy_orders').insertOne({userId:a.client.id,courseTitle:'Private order'});const orderBody={key:randomUUID(),kind:'order',reference:String(order.insertedId),subject:'Order help',text:'Order question'},orderThread=(await client('',201,orderBody)).json.data;
 await req('/account/messages',404,{cookie:a.other.cookie,body:{...orderBody,key:randomUUID()}});assert.equal((await req('/admin/inbox/'+orderThread.id,200,{cookie:a.reader.cookie})).json.data.reference,'');assert.equal((await admin('/'+orderThread.id,200)).json.data.reference,String(order.insertedId));
 await req('/account/messages',403,{cookie:a.client.cookie,body:{...b,key:randomUUID()},origin:'https://evil.invalid'});
 await db.model('LoginThrottle').deleteMany({key:{$regex:'^support:'}});for(let i=0;i<30;i++)await client(`/${id}/messages`,201,{key:randomUUID(),text:`Rate ${i}`});await client(`/${id}/messages`,429,{key:randomUUID(),text:'Rate denied'});await admin(`/${id}/messages`,201,reply);
 await db.collection('courses').insertOne({slug:'published-support-course',status:'published',title:'Published course'});await db.model('LoginThrottle').deleteMany({key:{$regex:'^support:'}});
 const courseBody={key:randomUUID(),kind:'course',reference:'published-support-course',subject:'Course question',text:'Course help'};const concurrent=await Promise.all(Array.from({length:5},()=>client('',201,courseBody)));assert.equal(new Set(concurrent.map(r=>r.json.data.id)).size,1);
 const model=db.model('SupportConversation'),thread=await model.findById(id).lean();await model.updateOne({_id:id},{$set:{messages:Array.from({length:500},(_,i)=>({key:randomUUID(),sender:a.client.id,staff:false,text:`Bounded ${i}`,at:new Date()}))}});await client(`/${id}/messages`,409,{key:randomUUID(),text:'Beyond thread capacity'});await model.updateOne({_id:id},{$set:{messages:thread.messages}});
 await model.insertMany(Array.from({length:51},(_,i)=>({owner:a.client.id,key:randomUUID(),subject:`Pagination ${i}`,kind:'general',reference:'',status:'open',messages:[],updatedAt:new Date()})));const page1=(await client('?page=1',200)).json,page2=(await client('?page=2',200)).json;assert.equal(page1.data.length,50);assert.equal(page1.pagination.hasMore,true);assert(page2.data.length>0);assert(!page1.data.some(t=>page2.data.some(other=>other.id===t.id)));await client('?page=0',400);assert.equal((await admin('?search=%5B',200)).json.data.length,0);
 console.log('PASS client → admin → client; atomic retries; unread cursors; role checks; cross-user denial; context ownership; CSRF; length; rate limit');
 }finally{await f.cleanup();}
});
