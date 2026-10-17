export const ADMIN_IDLE_MS=120_000;
export function adminIdleExpired(lastActivity:Date,now=Date.now()){return now-lastActivity.getTime()>=ADMIN_IDLE_MS;}
