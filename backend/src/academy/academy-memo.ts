import sharp from 'sharp';
import {resolve} from 'node:path';
process.env.FONTCONFIG_FILE ??= resolve(process.cwd(),'assets/fonts/fonts.conf');
// Render text with the existing image engine; embed each page in a real PDF.
// No remote assets or executable markup are accepted.
export async function memoPdf(memo:{number:string;createdAt:Date;learner:{name:string;email:string};memoStatus:string;subtotalMinor:number;discountMinor:number;finalMinor:number;items:{course:{title:string};subtotalMinor:number;discountMinor:number;finalMinor:number;scholarshipPercentage?:number;codeReference?:string}[]}) {
 const money=(value:number)=>`BDT ${(value/100).toFixed(2)}`;
 const lines=[`Academy order memo ${memo.number}`,new Date(memo.createdAt).toISOString(),memo.learner.name,memo.learner.email,memo.memoStatus,''];
 for(const item of memo.items)lines.push(item.course.title,`Original ${money(item.subtotalMinor)} | Discount ${money(item.discountMinor)} | Total ${money(item.finalMinor)}`,`Scholarship ${item.scholarshipPercentage===undefined?'N/A':item.scholarshipPercentage+'%'} | ${item.codeReference??'No code'}`,'');
 lines.push(`Original amount: ${money(memo.subtotalMinor)}`,`Discount: ${money(memo.discountMinor)}`,`Final total: ${money(memo.finalMinor)}`);
 const wrapped=lines.flatMap(line=>Array.from({length:Math.max(1,Math.ceil([...line].length/85))},(_,i)=>[...line].slice(i*85,(i+1)*85).join('')));
 const escape=(s:string)=>s.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));
 const pages:Buffer[]=[];
 for(let i=0;i<wrapped.length;i+=48){const overlays=[];for(const [j,line] of wrapped.slice(i,i+48).entries()){if(!line)continue;const input=await sharp({text:{text:escape(line),font:'DejaVu Sans 23',fontfile:resolve(process.cwd(),'assets/fonts/DejaVuSans.ttf'),rgba:true,width:1100,height:30,align:'left'}}).png().toBuffer();overlays.push({input,left:70,top:65+j*32});}pages.push(await sharp({create:{width:1240,height:1754,channels:3,background:'#ffffff'}}).composite(overlays).jpeg({quality:95}).toBuffer());}
 const objects:Buffer[]=[];const add=(value:string|Buffer)=>objects.push(Buffer.isBuffer(value)?value:Buffer.from(value));
 add('<< /Type /Catalog /Pages 2 0 R >>');add(`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] >>`);
 pages.forEach((jpeg,i)=>{const id=3+i*3;add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Image ${id+1} 0 R >> >> /Contents ${id+2} 0 R >>`);add(Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),jpeg,Buffer.from('\nendstream')]));const stream='q 595 0 0 842 0 0 cm /Image Do Q';add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);});
 const parts=[Buffer.from('%PDF-1.4\n')],offsets=[0];let size=parts[0].length;objects.forEach((object,i)=>{offsets.push(size);const part=Buffer.concat([Buffer.from(`${i+1} 0 obj\n`),object,Buffer.from('\nendobj\n')]);parts.push(part);size+=part.length;});parts.push(Buffer.from(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${size}\n%%EOF\n`));return Buffer.concat(parts);
}
