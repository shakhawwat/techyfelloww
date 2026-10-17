import { api, ApiError } from '@/lib/admin/api';
export interface AccountUser { id: string; name?: string; photoUrl?: string; email: string; role: string; emailVerified: boolean }
export async function accountRequest<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  try { return await api<T>(`/account/${path}`, method, body); }
  catch (error) {
    const status = error instanceof ApiError ? error.status : 0;
    const messages: Record<number, string> = {400:path==='login'?'Enter a valid email address and password.':'Check your details. An account could not be created with those values.',401:'Email or password is incorrect, or this account cannot sign in.',403:'This request could not be authorized. Reload and try again.',429:'Too many attempts. Please try again later.'};
    throw new ApiError(status, messages[status] ?? 'The account service is unavailable. Please try again.');
  }
}
export function checkedAccount(value: AccountUser): AccountUser {
  if (!value || typeof value.id !== 'string' || typeof value.email !== 'string' || typeof value.role !== 'string' || typeof value.emailVerified !== 'boolean' || (value.name !== undefined && typeof value.name !== 'string')) throw new Error('Invalid account response');
  return value;
}
