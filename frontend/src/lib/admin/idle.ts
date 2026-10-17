export const ADMIN_IDLE_MS=120_000;
export const ADMIN_WARNING_MS=20_000;
export function adminReturnTo(value:unknown){return typeof value==='string'&&/^\/admin(?:\/[a-zA-Z0-9_-]+)*$/.test(value)&&value!=='/admin/login'?value:'/admin';}
export class AdminIdleClock {
 constructor(public lastActivity:number){}
 remaining(now=Date.now()){return Math.max(0,ADMIN_IDLE_MS-(now-this.lastActivity));}
 activity(now=Date.now()){if(!this.remaining(now))return false;this.lastActivity=Math.max(this.lastActivity,now);return true;}
 synchronize(timestamp:number,now=Date.now()){if(!Number.isFinite(timestamp)||timestamp>now+1000||now-timestamp>=ADMIN_IDLE_MS)return false;this.lastActivity=Math.max(this.lastActivity,timestamp);return true;}
}
export class AdminRequests {
 private controller=new AbortController();
 get signal(){return this.controller.signal;}
 clear(){this.controller.abort();}
}

export function syncAdminActivity(clock:AdminIdleClock,scope:string,storage:Pick<Storage,'getItem'>,now=Date.now()){
 try{const value=JSON.parse(storage.getItem('techyfellow.admin.activity')??'null');if(value?.scope===scope)clock.synchronize(value.timestamp,now);}catch{}
}
