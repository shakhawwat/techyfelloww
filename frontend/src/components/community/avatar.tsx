/* Public, server-validated profile images use the same URL across account and Inbox views. */
export function ProfileAvatar({name,photoUrl,size=40}:{name:string;photoUrl?:string;size?:number}){
 return <span style={{width:size,height:size,minWidth:size,display:'inline-flex',alignItems:'center',justifyContent:'center',borderRadius:'50%',overflow:'hidden',background:'#16364c',color:'#7fdefe',fontSize:Math.max(12,size/3),fontWeight:600}}>{photoUrl?
 // Profile URLs are served by the existing same-origin API, without image optimization.
 // eslint-disable-next-line @next/next/no-img-element
 <img src={photoUrl} width={size} height={size} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()||'?'}</span>;
}
