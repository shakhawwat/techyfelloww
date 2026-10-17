// Legacy generated codes remain valid for recovery of saved generation requests.
export function isGeneratedScholarshipCode(value:unknown):value is string {
 if(typeof value!=='string')return false;
 if(/^TF-[A-F0-9]{48}$/.test(value))return true;
 if(!/^TECHYFELLOW[A-Z0-9]{4}$/.test(value))return false;
 const suffix=value.slice('TECHYFELLOW'.length);
 return /[A-Z]/.test(suffix)&&/[0-9]/.test(suffix);
}
