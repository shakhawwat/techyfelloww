'use client';
import {createContext,useContext,type ReactNode} from 'react';
import type {PublishedItem} from '@/lib/public/content';
import type {EditorialPage} from '@/lib/public/editorial';
const HomeEditorial=createContext<{page:EditorialPage|null;mentors:PublishedItem[]}>({page:null,mentors:[]});
export function HomeEditorialProvider({page,children,mentors=[]}:{page:EditorialPage|null;children:ReactNode;mentors?:PublishedItem[]}){return <HomeEditorial.Provider value={{page,mentors}}>{children}</HomeEditorial.Provider>;}
export function useHomeSection(key:string){return useContext(HomeEditorial).page?.sections.find(section=>section.key===key);}

export function useHomeSections(){return useContext(HomeEditorial).page?.sections??[];}

export function useHomeMentors(){return useContext(HomeEditorial).mentors;}
