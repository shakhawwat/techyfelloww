import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(import.meta.url),ts=require('typescript');
const temporary=await mkdtemp(join(tmpdir(),'techyfellow-public-decode-'));
for(const [source,target] of [['lib/public/content.ts','content'],['lib/public/pages.ts','pages'],['components/public/publication-preview-data.ts','publication-preview-data'],['components/public/publication-citation.ts','publication-citation']]){
 const code=await readFile(new URL('../src/'+source,import.meta.url),'utf8');
 const compiled=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText.replaceAll('@/lib/public/pages','./pages');
 await writeFile(join(temporary,target+'.js'),compiled);
}
const {decodeRecord,approvedImage,createPagesLoader,parseListQuery}=require(join(temporary,'pages.js'));
const {publishedPreview}=require(join(temporary,'publication-preview-data.js'));
const {citationText}=require(join(temporary,'publication-citation.js'));
const previousHost=process.env.NEXT_PUBLIC_MEDIA_HOST;process.env.NEXT_PUBLIC_MEDIA_HOST='synthetic.example.invalid';
after(async()=>{if(previousHost===undefined)delete process.env.NEXT_PUBLIC_MEDIA_HOST;else process.env.NEXT_PUBLIC_MEDIA_HOST=previousHost;await rm(temporary,{recursive:true,force:true});});
const now=Date.UTC(2026,9,14),base={slug:'owned-record',title:'Owned title',summary:'Owned summary',publishedAt:'2026-01-01T00:00:00Z'};
const image={type:'image',url:'https://synthetic.example.invalid/techyfellow/media/'+ 'a'.repeat(32)+'.png',altText:'Owned approved image',width:20,height:20};
test('published team portraits and course galleries survive decoding',()=>{
 const team=decodeRecord({...base,name:'Owned profile',biography:'Owned biography',media:[image]},'team',now);
 assert.equal(team.media[0].url,image.url);assert(approvedImage(team.media[0].url));
 const course=decodeRecord({...base,level:'beginner',deliveryMode:'self-paced',duration:{value:1,unit:'hours'},media:[image],category:'Robotics',outcomes:['Owned outcome'],tools:['Owned tool'],syllabus:[{title:'Owned module',topics:['Publicly described lesson']}],previewVideoUrl:'https://www.youtube.com/embed/M7lc1UVf-VE',privateFile:'NEVER_EXPOSE'},'courses',now);
 assert.equal(course.media[0].url,image.url);assert.equal(course.category,'Robotics');assert.deepEqual(course.outcomes,['Owned outcome']);assert.deepEqual(course.tools,['Owned tool']);assert.equal(course.publicVideo.embedUrl,'https://www.youtube.com/embed/M7lc1UVf-VE');assert.ok(!JSON.stringify(course).includes('NEVER_EXPOSE'));
 assert.equal(approvedImage('https://other.example.invalid/image.png'),false);
});
test('publication previews retain supplied abstracts and citations',()=>{
 const record=decodeRecord({...base,authors:['Owned author'],venue:'Owned venue',year:2026,abstract:'Saved complete abstract',citation:'Saved approved citation'},'publications',now);
 const preview=publishedPreview(record);assert.equal(preview.abstract,'Saved complete abstract');assert.equal(citationText(preview),'Saved approved citation');
});
test('loader uses fresh publication after cache expiry and never returns archived/missing snapshots',async()=>{
 let time=now,title='Original',status=200;
 const loader=createPagesLoader('https://api.example.invalid/api/v1',async()=>new Response(JSON.stringify({data:{...base,title,category:'Robotics',problem:'Owned problem',approach:'Owned approach'}}),{status}),()=>time);
 assert.equal((await loader.detail('projects',base.slug)).data.title,'Original');title='Updated';time+=60001;
 assert.equal((await loader.detail('projects',base.slug)).data.title,'Updated');status=404;time+=60001;assert.equal((await loader.detail('projects',base.slug)).state,'missing');
 const failed=createPagesLoader('https://api.example.invalid/api/v1',async()=>new Response('{}',{status:503}),()=>time);
 assert.equal((await failed.list('projects',parseListQuery('projects',{}))).state,'unavailable');
});
