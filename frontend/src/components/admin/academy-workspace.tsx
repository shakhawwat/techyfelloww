'use client';
import {useRef,useState,type KeyboardEvent} from 'react';
import {Button} from '@/components/ui/button';
import {AcademyCourseEditor} from './academy-course-editor';
import {AcademySimpleScholarships} from './academy-simple-scholarships';
import {useAcademyAdminData} from './academy-management';
import styles from './academy-management.module.css';

type Course={id:string;title:string;slug:string;status:string};
export function AcademyAdminWorkspace(){
 const [tab,setTab]=useState<'courses'|'scholarships'>('courses'),courseTab=useRef<HTMLButtonElement>(null),scholarshipTab=useRef<HTMLButtonElement>(null);
 const [selection,setSelection]=useState<string|null>(null),[q,setQ]=useState(''),[page,setPage]=useState(1),[notice,setNotice]=useState('');
 const params=new URLSearchParams({page:String(page),limit:'20',...(q.trim()?{q:q.trim()}: {})});
 const {data,error,retry}=useAcademyAdminData<{data:Course[];pagination:{total:number;totalPages:number}}>(`/admin/academy/management/courses?${params}`);
 function select(id:string|null){if(selection!==null&&selection!==id&&!window.confirm('Leave this editor? Unsaved course and lesson changes will be lost.'))return;setNotice('');setSelection(id);}
 function switchTab(event:KeyboardEvent<HTMLButtonElement>){if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?'courses':event.key==='End'?'scholarships':tab==='courses'?'scholarships':'courses';setTab(next);(next==='courses'?courseTab:scholarshipTab).current?.focus();}
 return <section aria-label="Academy editing workspace">
  <h1>Academy</h1>
  <div role="tablist" aria-label="Academy" className={`${styles.actions} ${styles.tabs}`}>
   <button type="button" className="button button-primary" ref={courseTab} role="tab" id="academy-courses-tab" aria-controls="academy-courses-panel" aria-selected={tab==='courses'} tabIndex={tab==='courses'?0:-1} onKeyDown={switchTab} onClick={()=>setTab('courses')}>Courses</button>
   <button type="button" className="button button-primary" ref={scholarshipTab} role="tab" id="academy-scholarships-tab" aria-controls="academy-scholarships-panel" aria-selected={tab==='scholarships'} tabIndex={tab==='scholarships'?0:-1} onKeyDown={switchTab} onClick={()=>setTab('scholarships')}>Scholarship codes</button>
  </div>
  <div role="tabpanel" id="academy-courses-panel" aria-labelledby="academy-courses-tab" hidden={tab!=='courses'}>
  {notice&&<p role="status">{notice}</p>}<Button onClick={()=>select('new')}>Add course</Button>
  <label>Find a course to edit<input value={q} onChange={event=>{setQ(event.target.value);setPage(1);}}/></label>
  {!data?error?<p role="alert">{error} <Button onClick={retry}>Retry courses</Button></p>:<p role="status">Loading courses…</p>:<>
   {data.data.length?<ul>{data.data.map(course=><li key={course.id}><Button aria-pressed={selection===course.id} onClick={()=>select(course.id)}>Edit {course.title}</Button> {course.slug} · {course.status}</li>)}</ul>:<p>No courses match this search.</p>}
   <p>{data.pagination.total} courses · Page {page}</p>
   <Button variant="secondary" disabled={page===1} onClick={()=>setPage(value=>value-1)}>Previous courses</Button>
   <Button variant="secondary" disabled={page>=data.pagination.totalPages} onClick={()=>setPage(value=>value+1)}>Next courses</Button>
  </>}
  {selection!==null&&<section className={styles.module} aria-label="Course and lesson editor"><Button variant="secondary" onClick={()=>select(null)}>Close course editor</Button><AcademyCourseEditor simple key={selection} id={selection==='new'?undefined:selection} onSaved={id=>{setNotice('Course and lessons saved to the database.');setSelection(id);retry();}}/></section>}
  </div>
  <div role="tabpanel" id="academy-scholarships-panel" aria-labelledby="academy-scholarships-tab" hidden={tab!=='scholarships'}><AcademySimpleScholarships simple/></div>
 </section>;
}
