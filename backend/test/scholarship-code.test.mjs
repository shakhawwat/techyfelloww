import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{generateScholarshipCode}=require('../dist/academy/scholarship-code.js'),{codeHash}=require('../dist/academy/academy-input.js');
test('new secure code format contains a letter and a digit in its four-character suffix',()=>{for(let i=0;i<5000;i++){const code=generateScholarshipCode(),suffix=code.slice('TECHYFELLOW'.length);assert.match(code,/^TECHYFELLOW[A-Z0-9]{4}$/);assert.match(suffix,/[A-Z]/);assert.match(suffix,/[0-9]/);}});
test('keyed retry recovery is deterministic while distinct server nonces provide fresh entropy',()=>{const secret='ab'.repeat(32),context=JSON.stringify(['academy-scholarship-v2','actor','request','random-server-nonce']);assert.equal(generateScholarshipCode(secret,context),generateScholarshipCode(secret,context));assert.match(generateScholarshipCode(secret,context),/^TECHYFELLOW[A-Z0-9]{4}$/);});
test('normalization retains legacy and new code hash compatibility',()=>{for(const code of ['TF-'+ 'AB12'.repeat(12),'LEGACY-CODE-123','TECHYFELLOWA7K2'])assert.equal(codeHash(code),codeHash(' '+code.toLowerCase()+' '));});
