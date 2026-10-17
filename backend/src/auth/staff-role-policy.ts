import {BadRequestException} from '@nestjs/common';
import {permissions,roles} from './permissions';
const actions=(resource:string,label:string)=>[{permission:`${resource}:read`,label:`View ${label}`,dependencies:[]},{permission:`${resource}:edit`,label:`Create, edit and archive ${label}`,dependencies:[`${resource}:read`]},{permission:`${resource}:publish`,label:`Publish / unpublish ${label}`,dependencies:[`${resource}:read`,`${resource}:edit`]}];
export const staffPermissionGroups=[
 {id:'workspace',name:'Staff workspace',description:'Workspace entry is included. Resource permissions still control every operation.',options:[{permission:'admin:access',label:'Enter admin workspace',required:true}]},
 {id:'content',name:'Homepage/content',description:'Page permissions also cover Solutions and institutional programs. Product permissions cover store content.',options:[...actions('pages','page content'),...actions('products','products')]},
 {id:'solutions',name:'Solutions/institutional',description:'These editors share pages:* checks with homepage/content. A selection here also updates the matching checkbox there.',options:actions('pages','page content')},
 {id:'research',name:'Research/publications',options:[...actions('research','research'),...actions('publications','publications')]},
 {id:'projects',name:'Projects/team',options:[...actions('projects','projects'),...actions('team','team profiles')]},
 {id:'academy',name:'Academy courses/media',description:'Media access follows its content collection. Private Academy media and course management use courses:edit.',options:actions('courses','Academy course content')},
 {id:'scholarships',name:'Scholarships/enrollments/orders',description:'The current Academy management APIs share courses:edit. There are no separate scholarship, enrollment or order permissions.',options:[{permission:'courses:edit',label:'Manage scholarships, enrollments and orders (also manage courses)',dependencies:['courses:read']}]},
 {id:'blog',name:'Community',options:[{permission:'blog:read',label:'Read community submissions'},{permission:'blog:review',label:'Review and return drafts',dependencies:['blog:read']},{permission:'blog:delete',label:'Delete and restore blog posts',dependencies:['blog:read']},{permission:'blog:publish',label:'Publish / unpublish posts',dependencies:['blog:read','blog:review']}]},
 {id:'inbox',name:'Support inbox',options:[{permission:'inbox:read',label:'Read support conversations'},{permission:'inbox:manage',label:'Reply, assign and resolve',dependencies:['inbox:read']}]},
 {id:'direct-reports',name:'Community moderation',description:'Reason-based, audited review of community conversations. Grant only through SUPER_ADMIN role management.',options:[{permission:'direct-reports:review',label:'Review reports and flags'},{permission:'community:conversations',label:'Open conversations with a recorded reason',dependencies:['direct-reports:review']},{permission:'community:attachments',label:'Access clean conversation attachments with auditing',dependencies:['community:conversations','direct-reports:review']},{permission:'community:actions',label:'Enforce, reverse actions and resolve appeals',dependencies:['community:conversations','direct-reports:review']}]},
 {id:'inquiries',name:'Inquiries',options:[{permission:'leads:read',label:'View inquiries'},{permission:'leads:manage',label:'Manage inquiries and assignments',dependencies:['leads:read']}]},
 {id:'users',name:'Users/access management',description:'Existing full-administrator restrictions are preserved. This permission cannot be delegated through a custom role.',options:[{permission:'users:admin',label:'Manage users and access — SUPER_ADMIN only',reserved:true}]}
];
export function normalizeStaffPermissions(raw:unknown){
 if(!Array.isArray(raw)||raw.length>permissions.length||raw.some(value=>typeof value!=='string'||!permissions.includes(value)||value==='users:admin'))throw new BadRequestException();
 const selected=new Set<string>(['admin:access',...raw]);
 for(const value of [...selected]){if(value.startsWith('community:')){selected.add('direct-reports:review');selected.add('community:conversations');}const [resource,action]=value.split(':');if(action==='edit'||action==='publish')selected.add(`${resource}:read`);if(action==='publish'&&resource!=='blog')selected.add(`${resource}:edit`);if(value==='blog:publish')selected.add('blog:review');if(value==='blog:delete')selected.add('blog:read');if(value==='blog:review')selected.add('blog:read');if(value==='inbox:manage')selected.add('inbox:read');if(value==='leads:manage')selected.add('leads:read');}
 return [...selected].sort();
}
export function staffRoleInput(raw:unknown,editing=false){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new BadRequestException();const input=raw as Record<string,unknown>;
 if(Object.keys(input).some(key=>!['name','description','permissions',...(editing?['revision']:[])].includes(key))||typeof input.name!=='string'||input.description!==undefined&&typeof input.description!=='string')throw new BadRequestException();
 const name=input.name.trim().replace(/\s+/g,' '),description=String(input.description??'').trim(),nameKey=name.normalize('NFKC').toLowerCase();
 if(name.length<2||name.length>64||description.length>400||/[\x00-\x1f\x7f]/.test(name+description)||roles.some(role=>role.replace(/_/g,' ').toLowerCase()===nameKey.replace(/[_-]+/g,' ')))throw new BadRequestException();
 if(editing&&(!Number.isSafeInteger(input.revision)||Number(input.revision)<1))throw new BadRequestException();
 return {name,nameKey,description,permissions:normalizeStaffPermissions(input.permissions),...(editing?{revision:Number(input.revision)}:{})};
}
