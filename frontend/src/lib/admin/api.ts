import { checkedSessionUser, checkedUser, resources, type SessionUser, type User } from "./contracts";
export class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly fields: string[] = [], public readonly code?: string, public readonly courseSlug?:string) { super(message); }
}
export function apiBase(): string {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1";
  if (value === "/api/v1") return value;
  try {
    const url = new URL(value);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.username || url.password || url.search || url.hash || !["/api/v1", "/api/v1/"].includes(url.pathname) ||
      (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && local && url.protocol === "http:"))) throw new Error();
    return value.replace(/\/$/, "");
  } catch { throw new ApiError(0, "The admin API URL is not configured correctly."); }
}
export async function api<T>(path: string, method = "GET", body?: unknown, signal?:AbortSignal): Promise<T> {
  let response: Response;
  const base = apiBase();
  try {
    response = await fetch(base + path, { method, credentials: "include", cache: "no-store", signal: signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000),
      headers: body === undefined ? {} : { "Content-Type": "application/json", "X-CSRF-Protection": "1" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  } catch { throw new ApiError(0, "The request could not be confirmed. Check the connection, then reload the saved record before retrying."); }
  const messages: Record<number, string> = {
    413: "Image exceeds the configured upload size limit.",
    400: "Check the highlighted fields and request values.", 401: "Your session has expired. Sign in again.",
    403: "You do not have permission for this action, or the request origin is not allowed.",
    404: "This content could not be found.", 409: "The slug or saved revision conflicts with the current record. Your input has been kept.",
    429: "Too many login attempts. Please try again later.", 503: "The service is unavailable. Your changes have not been confirmed.",
  };
  let result;
  try { result = await response.json(); } catch { throw new ApiError(response.status, messages[response.status] ?? "The server response could not be verified. Reload before retrying.", [], "UNEXPECTED_API_RESPONSE"); }
  if(!response.ok&&path.startsWith('/admin/academy/')&&result?.error?.code==='INVALID_VIDEO_EMBED')throw new ApiError(response.status,'Paste a supported HTTPS YouTube or Vimeo URL, or a single iframe. Scripts, event handlers and unsupported hosts are not allowed.',[],'INVALID_VIDEO_EMBED');
  const promo:Record<string,string>={PROMO_INVALID:'This code is invalid.',PROMO_INACTIVE:'This code is inactive or revoked.',PROMO_EXPIRED:'This code has expired.',PROMO_NOT_STARTED:'This code is not active yet.',PROMO_INELIGIBLE:'This code is not eligible for this course or account.',PROMO_MINIMUM:'This course does not meet the code’s minimum spend.',PROMO_EXHAUSTED:'This code has reached its limit or its remaining uses are reserved.',PROMO_ACCOUNT_LIMIT:'Your account has reached this code’s usage limit.',PROMO_VERIFY_EMAIL:'Verify your email before applying this code.'};
  const promoCode=path.startsWith('/academy/')&&typeof result?.error?.code==='string'&&Object.hasOwn(promo,result.error.code)?result.error.code:undefined;
  const cartMessages:Record<number,string>={400:'This course or code cannot be confirmed. Check your selections.',403:'Enrollment is not permitted for this course. Contact Academy.',404:'This course is unavailable.',409:'This course is already enrolled or the cart changed. Reload your cart.',503:'Course access is temporarily unavailable.'};
  if (!response.ok) throw new ApiError(response.status, (response.status===429&&path.startsWith('/academy/')?'Too many scholarship-code attempts. Please try again later.':promoCode?promo[promoCode]:path.startsWith('/academy/cart/')?cartMessages[response.status]??messages[response.status]:messages[response.status]) ?? "The request failed. Your changes have not been confirmed.",
    Array.isArray(result?.error?.fields) ? result.error.fields.filter((field: unknown) => typeof field === "string" && /^[a-zA-Z]+(?:\.(?:\d+|[a-zA-Z]+))*$/.test(field)) : [],promoCode,typeof result?.error?.courseSlug==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result.error.courseSlug)?result.error.courseSlug:undefined);
  if(signal?.aborted)throw new ApiError(0,"This admin session has ended.");
  return result as T;
}
export function errorOf(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError(0, "The server response could not be verified. Reload before retrying.");
}
export type AdminSessionPolicy={lastActivityAt:string;createdAt:string;idleExpiresAt:string};
export async function session(signal?:AbortSignal): Promise<{ user: User; permissions: string[]; adminSession?:AdminSessionPolicy;passwordChangeRequired?:boolean }> {
  const me = await api<{ data: { user: SessionUser;passwordChangeRequired?:boolean;adminSession?:AdminSessionPolicy } }>("/auth/me","GET",undefined,signal);
  const user = checkedSessionUser(me.data?.user);
  if(me.data.passwordChangeRequired&&user.role!=='MEMBER')return {user:checkedUser(user as User),permissions:[],adminSession:me.data.adminSession,passwordChangeRequired:true};
  // The existing access probe intentionally denies VIEWER. Its explicitly documented internal read grants use the verified role.
  if (user.role === "VIEWER") return { user: checkedUser(user as User), permissions: resources.map(resource => `${resource}:read`),adminSession:me.data.adminSession };
  let access: { data: { user: User; permissions: string[] } };
  try { access = await api<typeof access>("/admin/access","GET",undefined,signal); }
  catch (failure) {
    if (user.role === "MEMBER" && failure instanceof ApiError && failure.status === 403)
      throw new ApiError(403, "You are signed in with an Academy member account. Admin credentials are required to access this workspace.", [], "ADMIN_ACCOUNT_REQUIRED");
    throw failure;
  }
  const verified = checkedUser(access.data?.user);
  if (verified.id !== user.id || !Array.isArray(access.data.permissions)) throw new Error("Invalid access response");
  const permissions = access.data.permissions.filter(permission => typeof permission === "string" && (["community:conversations","community:attachments","community:actions","direct-reports:review","blog:read","blog:review","blog:publish","blog:delete","users:admin","inbox:read","inbox:manage","leads:read", "leads:manage"].includes(permission) || resources.some(resource => ["read", "edit", "publish"].some(action => permission === `${resource}:${action}`))));
  return { user: verified, permissions,adminSession:me.data.adminSession };
}
