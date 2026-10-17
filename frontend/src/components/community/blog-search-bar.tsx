'use client';
import Form from 'next/form';
import {useLayoutEffect,useRef,useState} from 'react';
import styles from './blog-search-bar.module.css';

export function BlogSearchBar({search,category,categories,action='/blog'}:{search:string;category:string;categories:string[];action?:string}){
 const bar=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const navbar=document.querySelector<HTMLElement>('[data-community-navbar]');
  const root=bar.current?.closest<HTMLElement>('[data-community-layout]');
  const measure=()=>{bar.current?.style.setProperty('--blog-navbar-height',`${navbar?.getBoundingClientRect().height??0}px`);root?.style.setProperty('--community-filter-height',`${bar.current?.getBoundingClientRect().height??0}px`);};
  measure();
  const observer=navbar?new ResizeObserver(measure):null;
  if(navbar)observer?.observe(navbar,{box:'border-box'});if(bar.current)observer?.observe(bar.current,{box:'border-box'});
  window.addEventListener('resize',measure,{passive:true});
  return()=>{observer?.disconnect();window.removeEventListener('resize',measure);root?.style.removeProperty('--community-filter-height');};
 },[]);
 return <div ref={bar} className={styles.bar} data-blog-search-bar><CategoryForm key={JSON.stringify([search,category,action])} search={search} category={category} categories={categories} action={action}/></div>;
}
function CategoryForm({search,category,categories,action}:{search:string;category:string;categories:string[];action:string}){const [selected,setSelected]=useState(category);const options=selected&&!categories.includes(selected)?[selected,...categories]:categories;return <Form action={action} className={styles.form} aria-label="Filter community posts"><input type="hidden" name="search" value={search}/><label className={styles.category}>Category<select name="category" value={selected} onChange={event=>setSelected(event.target.value)}><option value="">All categories</option>{options.map(value=><option key={value}>{value}</option>)}</select></label><button className={styles.submit} type="submit">Apply filter</button></Form>;}
