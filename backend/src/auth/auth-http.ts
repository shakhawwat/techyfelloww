import { createHash } from "node:crypto";
import type { Request, Response, CookieOptions } from "express";
import type { Role } from "./permissions";

export interface AuthIdentity { id: string; email: string; role: Role;roleName?:string;permissions?:readonly string[] }
export interface AuthRequest extends Request {
  auth?: { user: AuthIdentity; sessionId: string; passwordChangeRequired?:boolean; adminSession?:{lastActivityAt:string;createdAt:string;idleExpiresAt:string} };
}
export const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");
export function cookieName(production: boolean, member=false): string {
  return member?(production?"__Host-techyfellow_member_session":"techyfellow_member_session"):(production ? "__Host-techyfellow_session" : "techyfellow_session");
}
export function cookieOptions(production: boolean): CookieOptions {
  return { httpOnly: true, secure: production, sameSite: "lax", path: "/" };
}
export function readSessionToken(request: Request, production: boolean): string | undefined {
  const entries = (request.headers.cookie ?? "").split(";").map(entry => entry.trim());
  const admin=(request.path??'').startsWith('/api/v1/admin/')||(request.path??'').startsWith('/api/v1/auth/')||(request.path??'').startsWith('/api/v1/academy/admin/')||((request.path??'').startsWith('/api/v1/support/media/')&&request.get?.('X-Techyfellow-Session')==='admin');
  const memberPrefix=`${cookieName(production,true)}=`;
  const prefix = !admin&&(/^\/api\/v1\/account\/(?:store|moderation|friends|direct|profile|blog|me|login|logout|register|verify-email)(?:\/|$)/.test(request.path??'')||entries.some(entry=>entry.startsWith(memberPrefix)))?memberPrefix:`${cookieName(production)}=`;
  const values = entries.filter(entry => entry.startsWith(prefix)).map(entry => entry.slice(prefix.length));
  return values.length === 1 && /^[A-Za-z0-9_-]{43}$/.test(values[0]) ? values[0] : undefined;
}
export function clearSessionCookie(response: Response, production: boolean, member=false): void {
  response.clearCookie(cookieName(production,member), cookieOptions(production));
}
