// Isolated component/data tests. Responses are explicit fixtures, never runtime data.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
function compile(path,deps={}){const compiled={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module:compiled,exports:compiled.exports,require:name=>deps[name],URLSearchParams,Set,Number,Date,Error});return compiled.exports;}
const pages=compile('../src/lib/public/pages.ts',{'./content':{}}),concepts=compile('../src/components/public/project-directory-concepts.ts');
test('eight stable local concepts have complete proposal fields, verified media paths and exact filters',()=>{
 assert.equal(concepts.projectConcepts.length,8);assert.equal(new Set(concepts.projectConcepts.map(p=>p.id)).size,8);
 for(const p of concepts.projectConcepts){for(const field of ['summary','problem','approach','architecture'])assert.ok(p[field].length>30);for(const field of ['technologies','scope','evaluation','outputs'])assert.ok(p[field].length);assert.ok(p.outputs.every(value=>value.startsWith('Expected:')));assert.ok(fs.existsSync(new URL('../public'+p.image.url,import.meta.url)));assert.ok(p.image.altText.startsWith('Illustrative'));assert.equal(p.video,undefined);assert.equal(p.repository,undefined);}
 assert.equal(concepts.conceptPage(pages.parseListQuery('projects',{category:'IoT',technology:'MQTT'})).pagination.total,2);
 assert.equal(concepts.conceptPage(pages.parseListQuery('projects',{category:'iot'})).pagination.total,0);
 const selected=concepts.conceptPage(pages.parseListQuery('projects',{limit:'3',page:'2',sort:'title'}));assert.equal(selected.data.length,3);assert.equal(selected.pagination.totalPages,3);
});
const empty={state:'available',data:[],pagination:{page:1,limit:20,total:0,totalPages:0}};
function nodes(value){if(!value||typeof value!=='object')return [];if(Array.isArray(value))return value.flatMap(nodes);return [value,...nodes(value.props?.children)];}
async function render(responses){const calls=[];const jsx=(type,props)=>({type,props});const copy=compile('../src/content/public-pages.ts');const {ProjectDirectory}=compile('../src/components/public/project-directory.tsx',{
 'react/jsx-runtime':{jsx,jsxs:jsx},'next/link':'Link','lucide-react':{},'@/content/public-pages':copy,'@/lib/inquiry/schema':{inquiryHref:()=>'/build-with-us?type=engineering'},'@/lib/public/pages':pages,'@/lib/public/server-pages':{contentList:async(_,query)=>{calls.push(query);return responses.shift();}},'./project-directory-image':{ProjectDirectoryImage:'ProjectDirectoryImage'},'./project-directory.module.css':{default:{}},'./project-directory-concepts':concepts,'./project-directory-previews':{ProjectConceptPreviews:'ProjectConceptPreviews'},
 });const tree=await ProjectDirectory({search:{category:'Robotics'}});return {calls,previews:nodes(tree).filter(n=>n.type==='ProjectConceptPreviews')};}
test('demo fallback requires successful unfiltered empty confirmation; errors and real filtered zero-results do not use demos',async()=>{
 const noData=await render([{...empty},{...empty}]);assert.equal(noData.previews.length,1);assert.equal(noData.previews[0].props.projects.length,2);assert.equal(noData.calls[1].values.category,undefined);
 for(const responses of [[{state:'unavailable'}],[{...empty},{state:'unavailable'}],[{...empty},{state:'available',data:[{}],pagination:{page:1,limit:1,total:1,totalPages:1}}]])assert.equal((await render(responses)).previews.length,0);
});
