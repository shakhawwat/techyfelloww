'use client';
import {UsersAccess} from '@/components/admin/users-access';
import {useAdmin} from '@/components/admin/session';
export default function Page(){const {user}=useAdmin();return user.role==='SUPER_ADMIN'?<UsersAccess/>:<section><h1>Access denied</h1><p>Only full administrators can manage users and access.</p></section>;}
