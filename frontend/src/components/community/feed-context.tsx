'use client';
import {createContext} from 'react';
import type {BlogPost} from './types';
export const FeedContext=createContext<{posts:BlogPost[];edit:(post:BlogPost)=>void;changed:()=>void;moderate:boolean}>({posts:[],edit:()=>{},changed:()=>{},moderate:false});
