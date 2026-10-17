import {companyProfiles} from './company-data';
import type {ListQuery} from '@/lib/public/pages';
export const illustrativeNotice='Illustrative profiles — not confirmed appointments or staff.';
export type DirectoryDemo={slug:string;title:string;role:string;summary:string;expertise:string[];classification:'board'|'team';demo:true};
// Inspected supplied portraits. Assignments are stable across sorting/pagination.
const portraitAssignments:Record<string,'PP'|'PP2'>={
 'illustrative-chairperson':'PP2','illustrative-managing-director':'PP','illustrative-technical-advisor':'PP2',
 'demo-robotics-engineer':'PP2','demo-ai-researcher':'PP','demo-learning-mentor':'PP2','demo-embedded-engineer':'PP',
 'demo-vision-engineer':'PP','demo-software-engineer':'PP2','demo-product-designer':'PP','demo-technical-educator':'PP2',
};
export function directoryPortrait(slug:string){const assigned=portraitAssignments[slug];return assigned?{src:`/banner/${assigned}.jpg`,position:assigned==='PP'?'50% 32%':'50% 23%'}:undefined;}
// No approved board classification has been supplied by the current public API.
// These local examples are never merged into approved published records.
export const boardDemos:DirectoryDemo[]=[
 {slug:'illustrative-chairperson',title:'Fictional Chairperson',role:'Chairperson',summary:'An illustrative board role focused on company direction and governance discussions.',expertise:[],classification:'board',demo:true},
 {slug:'illustrative-managing-director',title:'Fictional Managing Director',role:'Managing Director',summary:'An illustrative board role focused on connecting company priorities and day-to-day coordination.',expertise:[],classification:'board',demo:true},
 {slug:'illustrative-technical-advisor',title:'Fictional Technical Advisor',role:'Technical Advisor',summary:'An illustrative advisory role focused on technical questions across engineering, research and learning.',expertise:[],classification:'board',demo:true},
];
const selectedTeamSlugs=['demo-robotics-engineer','demo-ai-researcher','demo-learning-mentor','demo-embedded-engineer','demo-vision-engineer','demo-software-engineer','demo-product-designer','demo-technical-educator'];
// Explicitly reuse eight existing fictional examples; exclude ratings, portraits,
// credentials and links. The homepage's records and rendering remain untouched.
export const teamDemos:DirectoryDemo[]=companyProfiles({state:'empty',data:[]}).filter(profile=>selectedTeamSlugs.includes(profile.slug)).map(profile=>({slug:profile.slug,title:profile.title,role:profile.role??'Illustrative team role',summary:profile.summary,expertise:profile.expertise??[],classification:'team',demo:true}));
export function demoTeamPage(query:ListQuery){
 let profiles=teamDemos.filter(profile=>!query.values.expertise||profile.expertise.includes(query.values.expertise));
 if(query.sort==='name'||query.sort==='-name')profiles=[...profiles].sort((a,b)=>(a.title<b.title?-1:a.title>b.title?1:0)*(query.sort==='-name'?-1:1));
 // Examples have no publication dates; publication sorts retain supplied order.
 const total=profiles.length,start=(query.page-1)*query.limit;
 return {data:profiles.slice(start,start+query.limit),pagination:{page:query.page,limit:query.limit,total,totalPages:Math.ceil(total/query.limit)}};
}
