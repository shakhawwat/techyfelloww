import { SetMetadata } from "@nestjs/common";

export const roles = ["SUPER_ADMIN", "CONTENT_EDITOR", "RESEARCH_EDITOR", "ACADEMY_MANAGER", "VIEWER", "SALES_MANAGER", "MEMBER"] as const;
export type BuiltInRole=typeof roles[number];
export type Role=BuiltInRole|`CUSTOM_${string}`;
export function isBuiltinRole(value:unknown):value is BuiltInRole{return typeof value==='string'&&(roles as readonly string[]).includes(value);}
export function isRoleKey(value:unknown):value is Role{return isBuiltinRole(value)||typeof value==='string'&&/^CUSTOM_[a-f0-9]{24}$/.test(value);}

export const resources = ["projects", "research", "publications", "team", "courses", "pages", "products"] as const;
export const permissions = ["admin:access", "users:admin", "inbox:read", "inbox:manage", "direct-reports:review", "community:conversations", "community:attachments", "community:actions", "blog:read", "blog:review", "blog:publish", "blog:delete", "leads:read", "leads:manage", ...resources.flatMap(resource =>
  ["read", "edit", "publish"].map(action => `${resource}:${action}`))] as const;
export type Permission = typeof permissions[number];
const contentPermissions = (items: readonly string[], actions: readonly string[]) =>
  items.flatMap(resource => actions.map(action => `${resource}:${action}`));
const grants: Record<BuiltInRole, readonly string[]> = {
  MEMBER: [],
  SUPER_ADMIN: permissions,
  SALES_MANAGER: ["admin:access", "leads:read", "leads:manage"],
  CONTENT_EDITOR: ["admin:access", ...contentPermissions(["projects", "team", "pages", "products"], ["read", "edit"])],
  RESEARCH_EDITOR: ["admin:access", ...contentPermissions(["research", "publications"], ["read", "edit"])],
  ACADEMY_MANAGER: ["admin:access", ...contentPermissions(["courses"], ["read", "edit"])],
  VIEWER: contentPermissions(resources, ["read"]),
};
export function grantedPermissions(role: string): readonly string[] {
  return Object.hasOwn(grants, role) ? grants[role as BuiltInRole] : [];
}
export function hasPermission(role: string, permission: string): boolean {
  return permissions.includes(permission) && grantedPermissions(role).includes(permission);
}
export const ACCESS_POLICY = "techyfellow:access-policy";
export type AccessPolicy = { mode: "public" | "authenticated" | "permissions" | "anyPermissions"; permissions?: readonly string[] };
export const PublicEndpoint = () => SetMetadata(ACCESS_POLICY, { mode: "public" } satisfies AccessPolicy);
export const Authenticated = () => SetMetadata(ACCESS_POLICY, { mode: "authenticated" } satisfies AccessPolicy);
export const RequirePermissions = (...required: Permission[]) =>
  SetMetadata(ACCESS_POLICY, { mode: "permissions", permissions: required } satisfies AccessPolicy);

export const VALIDATED_QUERY = "techyfellow:validated-query";
export const ValidatedQuery = () => SetMetadata(VALIDATED_QUERY, true);

export const RequireAnyPermissions = (...required: Permission[]) => SetMetadata(ACCESS_POLICY, { mode: "anyPermissions", permissions: required } satisfies AccessPolicy);
export const MULTIPART_MUTATION = "techyfellow:multipart-mutation";
export const MultipartMutation = () => SetMetadata(MULTIPART_MUTATION, true);

export function hasIdentityPermission(actor:{role:string;permissions?:readonly string[]},permission:string){return permissions.includes(permission)&&(isBuiltinRole(actor.role)?hasPermission(actor.role,permission):/^CUSTOM_[a-f0-9]{24}$/.test(actor.role)&&permission!=='users:admin'&&(actor.permissions??[]).includes(permission));}
