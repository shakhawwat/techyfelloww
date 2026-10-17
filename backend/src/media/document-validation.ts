import {BadRequestException} from '@nestjs/common';
export function validateDocument(buffer:Buffer,filename:string,maxBytes:number){
 if(!buffer.length||buffer.length>maxBytes)throw new BadRequestException({fields:['file']});
 const name=filename.split(/[\\/]/).pop()!.replace(/[^a-zA-Z0-9._-]/g,'-').slice(-120);
 const pdf=/\.pdf$/i.test(name),plain=/\.txt$/i.test(name);
 if(pdf){if(!/^%PDF-1\.[0-7]/.test(buffer.subarray(0,8).toString('ascii'))||!buffer.subarray(-1024).includes(Buffer.from('%%EOF')))throw new BadRequestException({fields:['file']});}
 else if(plain){try{new TextDecoder('utf-8',{fatal:true}).decode(buffer);}catch{throw new BadRequestException({fields:['file']});}if(buffer.includes(0))throw new BadRequestException({fields:['file']});}
 else throw new BadRequestException({fields:['file']});
 return {filename:name,data:buffer,size:buffer.length,extension:pdf?'pdf':'txt',mimeType:pdf?'application/pdf':'text/plain',width:1,height:1};
}
