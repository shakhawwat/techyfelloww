import {createRequire} from 'node:module';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {runInThisContext} from 'node:vm';
export function loadDemoSources(project){
 const require=createRequire(join(project,'frontend/package.json')),ts=require('typescript'),cache=new Map();
 function load(file){file=resolve(file);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;const local=id=>{if(id.startsWith('.')||id.startsWith('@/')){const base=id.startsWith('@/')?join(project,'frontend/src',id.slice(2)):resolve(dirname(file),id),target=[base,base+'.ts',base+'.tsx',join(base,'index.ts')].find(path=>existsSync(path));if(!target)throw new Error(`Missing source module ${id}`);return load(target);}return require(id);};runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(local,module,module.exports);return module.exports;}
 const get=path=>load(join(project,'frontend/src',path));
 return {home:get('components/public/home-research-data.ts'),legacyCourses:get('components/public/academy-data.ts'),company:get('components/public/company-data.ts'),courses:get('components/public/academy-demo-data.ts'),curriculum:get('components/academy/academy-curriculum.ts'),projects:get('components/public/project-directory-concepts.ts'),research:get('components/public/research-demo-data.ts'),publications:get('components/public/publication-preview-data.ts'),team:get('components/public/team-directory-data.ts'),programs:get('content/institutional-programs.ts'),programMedia:get('content/institutional-program-media.ts')};
}
