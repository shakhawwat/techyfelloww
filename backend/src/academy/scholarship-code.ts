import {createHmac,randomBytes} from 'node:crypto';
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
// Rejection sampling avoids modulo bias. Keyed entropy permits short-lived admin
// request retries without storing plaintext; its context includes a fresh random nonce.
export function generateScholarshipCode(secret?:string,context?:string){
 let counter=0;
 for(;;){let suffix='';while(suffix.length<4){const bytes=secret?createHmac('sha256',Buffer.from(secret,'hex')).update(JSON.stringify([context,counter++])).digest():randomBytes(32);for(const value of bytes){if(value>=252)continue;suffix+=alphabet[value%36];if(suffix.length===4)break;}}
  if(/[A-Z]/.test(suffix)&&/[0-9]/.test(suffix))return `TECHYFELLOW${suffix}`;
 }
}
