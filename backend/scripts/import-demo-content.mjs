import {createRequire} from 'node:module';
import {writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {demoManifest} from './demo-manifest.mjs';
const require=createRequire(import.meta.url),mongoose=require('mongoose'),{Types}=mongoose,{contentDefinitions}=require('../dist/content/content.schemas.js'),{academyDefinitions}=require('../dist/academy/academy.schemas.js'),{authDefinitions}=require('../dist/auth/auth.schemas.js'),{mediaDefinition}=require('../dist/media/media.schema.js'),{databaseOptions}=require('../dist/config/environment.js');
export async function runImport({project,apply=false,backupPath,reportPath}){
 if(!process.env.MONGODB_URI)throw new Error('Server-only MONGODB_URI is required.');
 const manifest=await demoManifest(project),db=await mongoose.createConnection(process.env.MONGODB_URI,{...databaseOptions,serverSelectionTimeoutMS:5000}).asPromise();
 try{
  const models=Object.fromEntries(Object.entries(contentDefinitions).map(([kind,def])=>[kind,db.model(def.name,def.schema,def.collection)])),def=academyDefinitions.find(item=>item.name==='LearningCourse'),learning=db.model(def.name,def.schema,def.collection),media=db.model(mediaDefinition.name,mediaDefinition.schema,mediaDefinition.collection),users=db.model('User',authDefinitions.user.schema,authDefinitions.user.collection),actor=await users.findOne({role:'SUPER_ADMIN',enabled:true}).select('_id').sort({_id:1}).lean();
  if(!actor)throw new Error('An active SUPER_ADMIN is required to attribute the import.');
  const report={mode:apply?'apply':'dry-run',database:db.name,planned:{},imported:{},unchanged:[],conflicts:[],errors:[],warnings:manifest.warnings,mediaChecked:manifest.assets.length},plan=[],existingBackup=[];
  const assets=new Map(manifest.assets.map(asset=>[asset.id,asset]));
  for(const entry of manifest.records){const model=models[entry.kind],payload={...entry.body,_id:new Types.ObjectId(entry.id),importProvenance:{...entry.body.importProvenance,importedAt:new Date()}},document=new model(payload);try{await document.validate();if(entry.learning)await new learning(entry.learning).validate();}catch(error){report.errors.push({sourceId:entry.sourceId,fields:Object.keys(error.errors??{})});continue;}
   const title=entry.body.title??entry.body.name,escaped=title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const identityQuery={$or:[{_id:document._id},{slug:entry.body.slug},{[entry.kind==='team'?'name':'title']:{$regex:`^${escaped}$`,$options:'i'}}]},existing=await model.findOne(identityQuery).lean();const config=entry.learning?await learning.findOne({slug:entry.body.slug}).lean():null;
   if(existing)existingBackup.push({collection:model.collection.name,record:existing});if(config)existingBackup.push({collection:learning.collection.name,record:config});
   if(existing?.importProvenance?.source==='frontend-demo'&&existing.importProvenance.sourceId===entry.sourceId){report.unchanged.push(entry.sourceId);continue;}
   if(existing||config){report.conflicts.push({sourceId:entry.sourceId,reason:existing?'Existing identity/slug/title preserved':'Existing course configuration preserved'});continue;}
   plan.push({entry,document,identityQuery});report.planned[entry.kind]=(report.planned[entry.kind]??0)+1;
  }
  for(const asset of assets.values()){try{await new media({...asset,_id:new Types.ObjectId(asset.id),uploader:actor._id}).validate();}catch(error){report.errors.push({sourceId:asset.id,fields:Object.keys(error.errors??{})});}}
  if(apply&&report.errors.length)throw new Error('Import validation failed; run dry-run and resolve reported errors first.');
  if(apply){if(!backupPath)throw new Error('Apply requires --backup.');await mkdir(dirname(backupPath),{recursive:true});await writeFile(backupPath,require('bson').EJSON.stringify({createdAt:new Date(),database:db.name,existing:existingBackup,plannedIds:plan.map(({entry})=>({kind:entry.kind,id:entry.id,sourceId:entry.sourceId})),media:await media.find({_id:{$in:manifest.assets.map(asset=>new Types.ObjectId(asset.id))}}).lean()},null,2),{mode:0o600,flag:'wx'});
   for(const model of [...new Set(plan.map(item=>models[item.entry.kind])),learning,media])await model.createIndexes();
   for(const {entry,document,identityQuery}of plan){const session=await db.startSession();try{await session.withTransaction(async()=>{
    const model=models[entry.kind],exists=await model.exists(identityQuery).session(session);if(exists)throw new Error('Record changed since dry-run; import aborted without overwriting it.');
    if(entry.learning&&await learning.exists({slug:entry.body.slug}).session(session))throw new Error("Course config changed since dry-run.");
    const references=[...(entry.body.media??[]),...(entry.learning?.thumbnail?[{reference:entry.learning.thumbnail.src.slice(6)}]:[])];
    for(const ref of references){const asset=assets.get(ref.reference);if(!asset)throw new Error('Unknown media reference');await media.updateOne({_id:new Types.ObjectId(asset.id)},{$setOnInsert:{...asset,uploader:actor._id}},{session,upsert:true,runValidators:true,timestamps:false});}
    await model.updateOne({_id:document._id},{$setOnInsert:document.toObject()},{session,upsert:true,runValidators:true});
    if(entry.learning)await learning.updateOne({slug:entry.body.slug},{$setOnInsert:entry.learning},{session,upsert:true,runValidators:true});
    await db.collection('content_audits').insertOne({actor:actor._id,action:'create',resource:entry.kind,contentId:document._id,revision:1,createdAt:new Date()},{session});
   });report.imported[entry.kind]=(report.imported[entry.kind]??0)+1;}finally{await session.endSession();}}
  }
  if(reportPath){await mkdir(dirname(reportPath),{recursive:true});await writeFile(reportPath,JSON.stringify(report,null,2),{mode:0o600});}return report;
 }finally{await db.close();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),value=key=>{const i=args.indexOf(key);return i<0?undefined:args[i+1];};
 try{if(args.some(arg=>arg.startsWith('--')&&!['--apply','--dry-run','--project','--backup','--report'].includes(arg))||args.includes('--apply')&&args.includes('--dry-run'))throw new Error('Unsupported command options');const project=resolve(value('--project')??resolve(dirname(fileURLToPath(import.meta.url)),'../..'));const report=await runImport({project,apply:args.includes('--apply'),backupPath:value('--backup')?resolve(value('--backup')):undefined,reportPath:value('--report')?resolve(value('--report')):undefined});console.log(JSON.stringify(report,null,2));if(report.errors.length)process.exitCode=1;}catch(error){console.error(error instanceof Error&&/^(?:Import|An active|Apply|Server-only|Unsupported|Approved price missing|Media|Missing|Unsupported local)/.test(error.message)?error.message:'Demo import failed. Verify configuration and schema validation; credentials are not logged.');process.exitCode=1;}
}
