import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{validateDocument}=require('../dist/media/document-validation');
test('document types are explicit, bounded and stored with safe filenames',()=>{
 assert.equal(validateDocument(Buffer.from('Approved UTF-8 notes'),'../notes.txt',100).filename,'notes.txt');
 assert.equal(validateDocument(Buffer.from('%PDF-1.7\n%%EOF'),'paper.pdf',100).mimeType,'application/pdf');
 for(const [buffer,name,max] of [[Buffer.from('<html>not a PDF</html>'),'paper.pdf',100],[Buffer.from('notes'),'notes.html',100],[Buffer.from('toolarge'),'notes.txt',2],[Buffer.from([0,1]),'notes.txt',100],[Buffer.from([255]),'notes.txt',100],[Buffer.from('%PDF-1.7 missing end'),'paper.pdf',100]])assert.throws(()=>validateDocument(buffer,name,max),error=>error.getStatus()===400);
});
