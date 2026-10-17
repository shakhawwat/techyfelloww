import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(import.meta.url),ts=require('typescript'),root=await mkdtemp(join(tmpdir(),'techyfellow-admin-idle-'));
await writeFile(join(root,'idle.cjs'),ts.transpileModule(await readFile(new URL('../src/lib/admin/idle.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
const {AdminIdleClock,AdminRequests,syncAdminActivity,adminReturnTo}=require(join(root,'idle.cjs'));
test('timestamp expiry handles suspension and meaningful continued activity',()=>{const idle=new AdminIdleClock(1000);assert.equal(idle.remaining(120999),1);assert.equal(idle.remaining(121000),0);assert.equal(idle.activity(121001),false);const active=new AdminIdleClock(1000);assert(active.activity(60000));assert.equal(active.remaining(150000),30000);assert.equal(active.remaining(180000),0);});
test('active tabs synchronize suspended tabs; stale/future timestamps cannot revive them',()=>{const hidden=new AdminIdleClock(1000);const storage={getItem:()=>JSON.stringify({scope:'fresh',timestamp:150000})};syncAdminActivity(hidden,'fresh',storage,200000);assert.equal(hidden.remaining(200000),70000);assert.equal(hidden.synchronize(300000,200000),false);assert.equal(hidden.synchronize(1000,200000),false);const other=new AdminIdleClock(1000);syncAdminActivity(other,'old',storage,200000);assert.equal(other.remaining(200000),0);});
test('cache cleanup aborts every scoped request; fresh login has a fresh request scope',async()=>{const old=new AdminRequests(),fresh=new AdminRequests();const result=new Promise(resolve=>old.signal.addEventListener('abort',()=>resolve('cancelled')));old.clear();assert.equal(await result,'cancelled');assert(old.signal.aborted);assert(!fresh.signal.aborted);});
test('return paths reject external destinations and login loops',()=>{assert.equal(adminReturnTo('/admin/academy/courses/abc'),'/admin/academy/courses/abc');for(const bad of ['//external.invalid','https://external.invalid','/admin/../account','/admin/login','/admin?next=external','javascript:alert(1)'])assert.equal(adminReturnTo(bad),'/admin');});

for(const file of ['contracts','api','media']){const code=await readFile(new URL('../src/lib/admin/'+file+'.ts',import.meta.url),'utf8');await writeFile(join(root,file+'.js'),ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);}
const {api}=require(join(root,'api.js'));
test('late authenticated responses are rejected after cleanup even if the fetch transport finishes',async()=>{const previous=globalThis.fetch,scope=new AdminRequests();let finish;globalThis.fetch=async()=>({ok:true,status:200,json:()=>new Promise(resolve=>{finish=resolve;})});try{const pending=api('/admin/projects','GET',undefined,scope.signal);await new Promise(resolve=>setImmediate(resolve));scope.clear();finish({data:['private record']});await assert.rejects(pending,/session has ended/);}finally{globalThis.fetch=previous;}});

test('authenticated XHR uploads are cancelled with the admin request scope',async()=>{const {uploadImage}=require(join(root,'media.js')),previous=globalThis.XMLHttpRequest,scope=new AdminRequests();let aborted=false;globalThis.XMLHttpRequest=class{upload={};open(){}setRequestHeader(){}send(){}abort(){aborted=true;this.onabort?.();this.onloadend?.();}};try{const pending=uploadImage(new File(['fixture'],'fixture.txt'),'courses','Test fixture',()=>{},'document',scope.signal);scope.clear();await assert.rejects(pending,/session ended/);assert(aborted);}finally{globalThis.XMLHttpRequest=previous;}});

after(()=>rm(root,{recursive:true,force:true}));
