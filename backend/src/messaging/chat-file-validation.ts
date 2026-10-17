import {BadRequestException} from '@nestjs/common';
import {validateImage} from '../media/image-validation';
import {validateDocument} from '../media/document-validation';
export async function validateChatFile(file:{buffer:Buffer;originalname:string;mimetype:string},limit:number){
  if(/\.(?:exe|dll|com|bat|cmd|ps1|sh|js|html?|svg|zip|rar|7z|tar|gz)$/i.test(file.originalname)||file.buffer.subarray(0,2).toString('ascii')==='MZ'||file.buffer.subarray(0,4).equals(Buffer.from([0x7f,0x45,0x4c,0x46]))||file.buffer.subarray(0,4).equals(Buffer.from([0x50,0x4b,3,4])))throw new BadRequestException('Executable files and archives are not supported.');
  let data=file.buffer,mimeType='',name=file.originalname.split(/[\\/]/).pop()!.replace(/[^a-zA-Z0-9._-]/g,'-').slice(-100)||'attachment';
  if(['image/jpeg','image/png','image/webp'].includes(file.mimetype)){const image=await validateImage(data,name,{bytes:limit,dimension:8192,pixels:40000000});data=image.data;mimeType=image.mimeType;name=image.filename;}
  else if(file.mimetype==='application/pdf'){if(/\/(?:JavaScript|JS|OpenAction|AA|Launch|EmbeddedFile|RichMedia|XFA)\b/i.test(data.toString('latin1')))throw new BadRequestException('Active PDF content is not allowed.');const pdf=validateDocument(data,name,limit);if(pdf.mimeType!=='application/pdf')throw new BadRequestException();mimeType=pdf.mimeType;name=pdf.filename;}
  else {
   const mime=file.mimetype.split(';')[0].trim();
   const webm=data.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]))&&data.includes(Buffer.from('webm'))&&data.includes(Buffer.from('A_OPUS'))&&data.includes(Buffer.from('OpusHead'))&&!data.includes(Buffer.from('V_VP'))&&!data.includes(Buffer.from('V_AV1'));
   const ogg=data.toString('ascii',0,4)==='OggS'&&data.includes(Buffer.from('OpusHead'));
   const wav=data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WAVE'&&data.includes(Buffer.from('fmt '))&&data.includes(Buffer.from('data'));
   const mp4=data.toString('ascii',4,8)==='ftyp'&&data.includes(Buffer.from('soun'))&&!data.includes(Buffer.from('vide'));
   if(data.length<64||!(mime==='audio/webm'&&webm||mime==='audio/ogg'&&ogg||mime==='audio/wav'&&wav||mime==='audio/mp4'&&mp4))throw new BadRequestException('Unsupported audio');
   mimeType=mime;name=`voice.${mime.split('/')[1]}`;
  }
 return {data,mimeType,name};
}
