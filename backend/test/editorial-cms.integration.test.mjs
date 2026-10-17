import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomBytes} from 'node:crypto';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(import.meta.url);
test('editorial CMS persistence, public visibility, media scopes, roles and archive',{timeout:180000},async()=>{
 assert.equal(process.env.NODE_ENV,'test');const name=`techyfellow_test_cms_${randomBytes(6).toString('hex')}`;
 process.env.MONGODB_URI=`${process.env.TECHYFELLOW_TEST_MONGO??'mongodb://mongodb:27017'}/${name}?replicaSet=rs0`;process.env.AUTH_ALLOWED_ORIGINS='http://localhost:14680';process.env.EMAIL_ENABLED='false';
 const root=await mkdtemp(join(tmpdir(),'techyfellow-cms-private-'));process.env.ACADEMY_MEDIA_ROOT=root;
 const {NestFactory}=require('@nestjs/core'),{getConnectionToken}=require('@nestjs/mongoose'),{ConfigService}=require('@nestjs/config');
 const {AppModule}=require('../dist/app.module'),{AuthExceptionFilter}=require('../dist/auth/auth-exception.filter');
 const app=await NestFactory.create(AppModule,{logger:false});app.setGlobalPrefix('api/v1');app.useGlobalFilters(new AuthExceptionFilter());
 const db=app.get(getConnectionToken());await db.asPromise();assert.equal(db.name,name);assert.equal((await db.db.listCollections().toArray()).length,0);
 try{
  for(const modelName of db.modelNames()){await db.model(modelName).createCollection();await db.model(modelName).createIndexes();}
  await app.listen(0,'127.0.0.1');const base=`http://127.0.0.1:${app.getHttpServer().address().port}/api/v1`,password=randomBytes(20).toString('base64url'),hash=await require('../dist/auth/password').hashPassword(password),cookies={};
  async function req(path,status,{cookie,body,method=body===undefined?'GET':'POST',headers={}}={}){const r=await fetch(base+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(body===undefined?{}:{'Content-Type':'application/json',Origin:'http://localhost:14680','X-CSRF-Protection':'1'}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});const raw=await r.text();assert.equal(r.status,status,`${method} ${path}: ${raw}`);assert.ok(!raw.includes(password));return {json:JSON.parse(raw),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
  for(const role of ['SUPER_ADMIN','CONTENT_EDITOR','MEMBER']){const user=await db.model('User').create({email:`cms-${role.toLowerCase()}@example.invalid`,passwordHash:hash,role,enabled:true});cookies[role]=(await req(role==='MEMBER'?'/account/login':'/auth/login',200,{body:{email:user.email,password}})).cookie;}
  const admin=cookies.SUPER_ADMIN,editor=cookies.CONTENT_EDITOR,member=cookies.MEMBER;
  for(const kind of ['pages','products','projects','research','publications','team','courses']){await req(`/admin/${kind}`,401);await req(`/admin/${kind}`,403,{cookie:member});await req(`/admin/${kind}`,200,{cookie:admin});}
  const create=async(kind,body,cookie=admin)=>(await req(`/admin/${kind}`,201,{cookie,body})).json.data;
  const publish=async(kind,record,cookie=admin)=>(await req(`/admin/${kind}/${record.id}/publish`,200,{cookie,body:{revision:record.revision}})).json.data;
  const project=await create('projects',{slug:'cms-project',title:'CMS project',summary:'Actual test summary',category:'Robotics',problem:'Supplied problem',approach:'Supplied approach',technologies:['TypeScript'],results:['Documented fixture result'],videoInput:'<iframe src="https://youtu.be/M7lc1UVf-VE" allowfullscreen></iframe>',repositoryUrl:'https://example.invalid/repo'});
  assert.equal(project.videoInput,'https://www.youtube.com/embed/M7lc1UVf-VE');await req('/projects/cms-project',404);
  const home=await create('pages',{slug:'homepage',title:'Homepage',summary:'Supplied homepage content',pageType:'homepage',sections:[{key:'hero-1',title:'Supplied banner',image:'/banner/b1.jpg',visible:true},{key:'research',visible:false},{key:'audience-1',title:'Approved audience heading',description:'Approved direction',cta:'Contact us',href:'/contact',visible:true}],featured:[{kind:'projects',slug:project.slug}]},editor);
  await req('/pages/homepage',404);await req(`/admin/pages/${home.id}/publish`,403,{cookie:editor,body:{revision:1}});await req(`/admin/pages/${home.id}/publish`,400,{cookie:admin,body:{revision:1}});assert.equal((await db.model('PageContent').findById(home.id)).status,'draft');
  await publish('projects',project);const publishedHome=await publish('pages',home);const publicHome=(await req('/pages/homepage',200)).json.data;assert.equal(publicHome.featured[0].slug,project.slug);assert.equal(publicHome.sections[1].visible,false);assert.ok(!('revision'in publicHome));
  await req('/admin/pages',403,{cookie:editor,body:{slug:'homepage-two',title:'Bad CSRF',pageType:'homepage'},headers:{'X-CSRF-Protection':''}});
  await req('/admin/pages',400,{cookie:admin,body:{slug:'homepage-two',title:'Wrong target',pageType:'homepage'}});
  await req('/admin/media/video-preview',201,{cookie:editor,body:{input:'https://vimeo.com/76979871'}});await req('/admin/media/video-preview',403,{cookie:member,body:{input:'https://vimeo.com/76979871'}});
  await req(`/admin/projects/${project.id}`,400,{cookie:admin,method:'PATCH',body:{revision:2,videoInput:'<iframe src="https://evil.invalid" onload="alert(1)"></iframe>'}});assert.equal((await db.model('Project').findById(project.id)).revision,2);
  const board=await create('team',{slug:'cms-board',name:'Supplied board profile',summary:'Approved board summary',biography:'Actual biography',classification:'board',role:'Advisor',expertise:['Robotics'],profileLinks:[{label:'Approved profile',url:'https://example.invalid/profile',approved:true},{label:'Unapproved',url:'https://example.invalid/private',approved:false}]});await publish('team',board);const boardPublic=(await req('/team?classification=board',200)).json.data;assert.equal(boardPublic.length,1);assert.equal(boardPublic[0].role,'Advisor');assert.equal(boardPublic[0].profileLinks.length,1);
  for(const group of ['solutions','institutional','consulting']){const item=await create('pages',{slug:({solutions:'solutions-robotics',institutional:'institutional-schools',consulting:'consulting-capstone'})[group],title:'Approved scope',summary:'Actual scope description',pageType:group,blocks:[{title:'Scope',text:'Supplied details',items:['Capability']}],capabilities:['Capability'],deliverables:['Documented deliverable'],faqs:[{question:'Question?',answer:'Approved answer'}],inquiryHref:'/contact',mentorSlugs:[board.slug]});await publish('pages',item);assert.equal((await req(`/pages/${item.slug}`,200)).json.data.faqs[0].answer,'Approved answer');}
  const program=await create('pages',{slug:'institutional-program-cms-workshop',title:'Approved program',summary:'Program scope',pageType:'institutional',programAudience:'schools',blocks:[{title:'Objectives',items:['Actual objective']}],deliverables:['Actual output'],inquiryHref:'/contact'});await publish('pages',program);assert.equal((await req('/pages/'+program.slug,200)).json.data.programAudience,'schools');
  const orphan=await create('pages',{slug:'solutions-unknown-destination',title:'Unknown',summary:'No frontend destination',pageType:'solutions'});await req(`/admin/pages/${orphan.id}/publish`,400,{cookie:admin,body:{revision:1}});
  const research=await create('research',{slug:'cms-research',title:'Research',summary:'Supplied summary',domain:'Robotics',researchStage:'active',methods:['Method'],contributors:[{name:'Contributor',teamSlug:board.slug}],teamRequirements:['Approved requirement'],approvedLinks:[{label:'Approved reference',url:'https://example.invalid/research',approved:true},{label:'Hidden',url:'https://example.invalid/hidden',approved:false}]});await publish('research',research);assert.equal((await req('/research/cms-research',200)).json.data.approvedLinks.length,1);
  const publication=await create('publications',{slug:'cms-paper',title:'Paper',summary:'Supplied publication summary',authors:['Actual author'],venue:'Actual venue',year:2026,abstract:'Approved abstract',citation:'Supplied citation',paperUrl:'https://example.invalid/paper',metrics:[{label:'Approved citations',value:12,year:2026,source:'https://example.invalid/metrics',verified:true},{label:'Unverified',value:999,year:2026,source:'https://example.invalid/unverified',verified:false}]});await publish('publications',publication);const paper=(await req('/publications/cms-paper',200)).json.data;assert.equal(paper.metrics.length,1);assert.equal(paper.metrics[0].year,2026);assert.equal(paper.abstract,'Approved abstract');
  const product=await create('products',{slug:'cms-kit',title:'Kit',summary:'Approved kit description',priceMinor:120000,currency:'BDT',skill:'Beginner',components:[{component:'Board',quantity:1,unitPrice:900}],compatibility:['Documented compatibility']},editor);await req('/products/cms-kit',404);await publish('products',product);const kit=(await req('/products/cms-kit',200)).json.data;assert.equal(kit.priceMinor,120000);assert.ok(!('checkoutUrl'in kit));
  const upload=async(buffer,filename,status,resource='pages',kind='image',cookie=admin)=>{const form=new FormData();form.append('file',new Blob([buffer]),filename);form.append('resource',resource);form.append('altText','Supplied media description');form.append('kind',kind);const r=await fetch(base+'/admin/media/upload',{method:'POST',headers:{Cookie:cookie,Origin:'http://localhost:14680','X-CSRF-Protection':'1'},body:form});assert.equal(r.status,status,filename);return r.json();};
  await upload(Buffer.from('not an image'),'fake.png',400);await upload(Buffer.from('<html>bad</html>'),'fake.pdf',400,'pages','document');await upload(Buffer.from('approved text'),'notes.txt',403,'pages','document',member);
  const png=await require('sharp')({create:{width:2,height:2,channels:3,background:'#16c2ff'}}).png().toBuffer();const storage=app.get(require('../dist/media/r2.storage').R2Storage),configured=storage.requireConfigured;storage.requireConfigured=()=>{throw new (require('@nestjs/common').ServiceUnavailableException)();};await upload(png,'unavailable.png',503);storage.requireConfigured=configured;
  storage.requireConfigured=()=>{};storage.put=async()=>{};storage.url=key=>`https://synthetic.example.invalid/${key}`;
  const image=(await upload(png,'banner.png',201)).data,doc=(await upload(Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF'),'paper.pdf',201,'publications','document')).data;
  const portrait=(await upload(png,'portrait.png',201,'team')).data;
  await req(`/admin/team/${board.id}`,200,{cookie:admin,method:'PATCH',body:{revision:2,media:[{reference:portrait.id,type:'image',altText:'Supplied approved portrait'}]}});assert.equal((await req(`/team/${board.slug}`,200)).json.data.media.length,1);
  await req(`/admin/publications/${publication.id}`,200,{cookie:admin,method:'PATCH',body:{revision:2,media:[{reference:doc.id,type:'document',altText:'Published paper document'}]}});assert.equal((await req(`/publications/${publication.slug}`,200)).json.data.media[0].type,'document');
  await req(`/admin/pages/${home.id}`,400,{cookie:admin,method:'PATCH',body:{revision:2,media:[{reference:portrait.id,type:'image',altText:'Wrong collection scope'}]}});
  await req(`/admin/pages/${home.id}`,200,{cookie:admin,method:'PATCH',body:{revision:2,sections:[{key:'hero-1',image:`media:${image.id}`,alt:'Approved homepage banner',visible:true}]}});assert.match((await req('/pages/homepage',200)).json.data.sections[0].image,/synthetic.example.invalid/);
  async function privateUpload(cookie,status){const form=new FormData();form.append('file',new Blob(['Restricted notes']),'lesson.txt');const r=await fetch(base+'/admin/academy/management/resources/upload',{method:'POST',headers:{Cookie:cookie,Origin:'http://localhost:14680','X-CSRF-Protection':'1'},body:form});assert.equal(r.status,status);return r.json();}
  await privateUpload(member,403);const resource=(await privateUpload(admin,201)).data;assert.equal((await readFile(join(root,resource.key))).toString(),'Restricted notes');assert.equal(await db.model('Media').countDocuments({storageKey:resource.key}),0);assert.ok(await db.model('AcademyAudit').exists({action:'private_resource_upload',target:resource.key}));
  app.get(ConfigService).set('ACADEMY_MEDIA_ROOT','');await privateUpload(admin,503);
  await req(`/admin/products/${product.id}/archive`,200,{cookie:admin,body:{revision:2}});await req('/products/cms-kit',404);assert.equal(await db.model('Product').countDocuments({_id:product.id}),1);await req(`/admin/products/${product.id}`,409,{cookie:admin,method:'PATCH',body:{revision:3,title:'Cannot edit archived'}});
  await req(`/admin/pages/${publishedHome.id}/archive`,200,{cookie:admin,body:{revision:3}});await req('/pages/homepage',404);
  const submitted=(await req('/leads',201,{body:{type:'contact',name:'Synthetic CMS inquiry',email:'cms-inquiry@example.invalid',consent:true,message:'Synthetic CMS contact message'},headers:{'Idempotency-Key':randomBytes(16).toString('hex')}})).json.data;
  await req('/admin/leads?type=contact',403,{cookie:member});await req('/admin/leads?type=contact',403,{cookie:editor});const inquiry=(await req('/admin/leads?type=contact',200,{cookie:admin})).json.data[0];assert.equal(inquiry.reference,submitted.reference);
  await req('/admin/leads/'+inquiry.id,200,{cookie:admin,method:'PATCH',body:{revision:1,status:'triaged',note:'Internal review note'}});assert.equal((await db.model('Lead').findById(inquiry.id)).notes.length,1);
  assert.ok(await db.model('ContentAudit').exists({resource:'pages',action:'publish'}));
  // Complete lifecycle for each collection, using only this randomly named test database.
  const fixtures={
    projects:{slug:'workflow-project',title:'Workflow project',summary:'Owned project summary',category:'Robotics',problem:'Owned problem',approach:'Owned approach',videoInput:'https://youtu.be/M7lc1UVf-VE'},
    research:{slug:'workflow-research',title:'Workflow research',summary:'Owned research summary',domain:'Robotics',researchStage:'active',methods:['Owned method']},
    publications:{slug:'workflow-publication',title:'Workflow publication',summary:'Owned publication summary',authors:['Owned author'],venue:'Owned venue',year:2026},
    team:{slug:'workflow-team',name:'Workflow team',summary:'Owned profile summary',biography:'Owned biography',classification:'team',role:'Engineer'},
    products:{slug:'workflow-product',title:'Workflow product',summary:'Owned product summary',priceMinor:12345},
    courses:{slug:'workflow-course',title:'Workflow course',summary:'Owned course summary',level:'beginner',deliveryMode:'self-paced',duration:{value:2,unit:'hours'}},
    pages:{slug:'about',title:'Workflow about',summary:'Owned about summary',pageType:'about',sections:[{key:'introduction',title:'Owned introduction',description:'Owned positioning'}],faqs:[{question:'Owned question?',answer:'Owned answer'}]}
  };
  const retained=[];
  for(const [kind,body] of Object.entries(fixtures)){
    let current=await create(kind,body);
    await req(`/${kind}/${body.slug}`,404);
    assert.equal((await req(`/admin/${kind}/${current.id}`,200,{cookie:admin})).json.data.slug,body.slug);
    if(kind==='courses'){
      await req(`/admin/academy/courses/${body.slug}`,200,{cookie:admin,body:{enabled:true,category:'Owned category',description:'Owned full course description',outcomes:['Owned outcome'],tools:['Owned tool'],accessTerms:'Owned access terms',benefits:[],thumbnail:{src:'/banner/iot_banner.jpg',alt:'Owned course image'},previewVideoUrl:'https://www.youtube.com/embed/M7lc1UVf-VE',modules:[{id:'module',title:'Owned module',lessons:[{id:'intro',title:'Owned introduction',description:'Owned public video',type:'video',access:'public',videoInput:'https://vimeo.com/76979871',resources:[]},{id:'private',title:'Owned private lesson',type:'text',access:'enrolled',text:'PRIVATE_WORKFLOW_SENTINEL',file:undefined,resources:[]}]}],revision:0}});
    }else if(kind!=='pages'){
      const asset=(await upload(png,`${kind}.png`,201,kind)).data;
      current=(await req(`/admin/${kind}/${current.id}`,200,{cookie:admin,method:'PATCH',body:{revision:current.revision,media:[{reference:asset.id,type:'image',altText:'Owned uploaded image'}]}})).json.data;
    }
    current=await publish(kind,current);
    const visible=(await req(`/${kind}/${body.slug}`,200)).json.data;
    assert.equal(visible.slug,body.slug);
    if(kind==='courses'){
      assert.equal(visible.previewVideoUrl,'https://www.youtube.com/embed/M7lc1UVf-VE');assert.equal((await req(`/academy/courses/${body.slug}`,200)).json.data.previewVideoUrl,'https://www.youtube.com/embed/M7lc1UVf-VE');assert.ok(!JSON.stringify(visible).includes('76979871'));await req(`/academy/courses/${body.slug}/lessons/private`,403,{cookie:member});assert.equal(visible.category,'Owned category');assert.equal(visible.outcomes[0],'Owned outcome');assert.equal(visible.syllabus[0].topics[1],'Owned private lesson');
      assert.ok(!JSON.stringify(visible).includes('PRIVATE_WORKFLOW_SENTINEL'));
      assert.ok(!JSON.stringify(visible).includes('resources'));assert.ok(!JSON.stringify(visible).includes('file'));
    }else if(kind!=='pages')assert.equal(visible.media.length,1);
    const identity=kind==='team'?'name':'title';
    current=(await req(`/admin/${kind}/${current.id}`,200,{cookie:admin,method:'PATCH',body:{revision:current.revision,[identity]:'Owned updated heading'}})).json.data;
    assert.equal((await req(`/${kind}/${body.slug}`,200)).json.data[identity],'Owned updated heading');
    retained.push({kind,id:current.id,revision:current.revision,slug:body.slug});
  }
  for(const group of ['contact','company','academy','projects','research','publications','team','store']){
    const body={slug:group,title:`Owned ${group}`,summary:`Owned ${group} summary`,pageType:group,sections:[{key:'hero',title:'Owned banner',description:'Owned copy'}],...(group==='company'?{contactEmail:'owned@example.invalid',contactPhone:'+880 1000000000',contactAddress:'Owned fixture address',approvedLinks:[{label:'GitHub',url:'https://github.com/owned-fixture',approved:true},{label:'Hidden',url:'https://example.invalid/hidden',approved:false}]}:{})};
    let current=await create('pages',body);await req(`/pages/${group}`,404);current=await publish('pages',current);
    const visible=(await req(`/pages/${group}`,200)).json.data;
    if(group==='company'){assert.equal(visible.contactEmail,body.contactEmail);assert.equal(visible.approvedLinks.length,1);}
    retained.push({kind:'pages',id:current.id,revision:current.revision,slug:group});
  }
  const pathwayRecord=await create('pages',{slug:'solutions-automation',title:'Owned pathways',summary:'Owned solution summary',pageType:'solutions',blocks:[],pathways:[{title:'Owned pathway',description:'Owned discussion',problems:['Owned problem'],approach:'Owned approach',capabilities:[],deliverables:[],requirements:[],evaluation:'Owned limitations'}]});
  await publish('pages',pathwayRecord);assert.equal((await req('/pages/solutions-automation',200)).json.data.pathways[0].title,'Owned pathway');
  // A fresh application/connection must reload the same persisted IDs and revisions.
  await app.close();
  const restarted=await NestFactory.create(AppModule,{logger:false});restarted.setGlobalPrefix('api/v1');restarted.useGlobalFilters(new AuthExceptionFilter());
  const restartedStorage=restarted.get(require('../dist/media/r2.storage').R2Storage);restartedStorage.url=key=>`https://synthetic.example.invalid/${key}`;
  await restarted.listen(0,'127.0.0.1');
  try{
    const reopened=`http://127.0.0.1:${restarted.getHttpServer().address().port}/api/v1`;
    for(const item of retained){
      const saved=await fetch(`${reopened}/admin/${item.kind}/${item.id}`,{headers:{Cookie:admin}});assert.equal(saved.status,200);const record=(await saved.json()).data;assert.equal(record.id,item.id);assert.equal(record.revision,item.revision);
      const archived=await fetch(`${reopened}/admin/${item.kind}/${item.id}/archive`,{method:'POST',headers:{Cookie:admin,'Content-Type':'application/json',Origin:'http://localhost:14680','X-CSRF-Protection':'1'},body:JSON.stringify({revision:record.revision})});assert.equal(archived.status,200);
      assert.equal((await fetch(`${reopened}/${item.kind}/${item.slug}`)).status,404);
      assert.equal((await fetch(`${reopened}/admin/${item.kind}/${item.id}`,{headers:{Cookie:admin}})).status,200);
    }
    console.log('PASS complete per-collection draft/save/reload/publish/edit/public-update/archive lifecycle; singleton company/contact/Academy content; application restart preserves IDs/revisions; course metadata never leaks private lessons.');
  }finally{const connection=restarted.get(getConnectionToken());if(connection.name===name)await connection.dropDatabase();await restarted.close();}

  console.log('PASS all CMS collections, draft/publish/archive, confirmed persistence, member/CSRF denial, references, verified metrics, media validation/scopes, public documents and private resource separation. Live R2 provider NOT RUN.');
 }finally{if(db.readyState===1&&db.name===name&&name.startsWith('techyfellow_test_cms_'))await db.dropDatabase();await app.close();await rm(root,{recursive:true,force:true});}
});
