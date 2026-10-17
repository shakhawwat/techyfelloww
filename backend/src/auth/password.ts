import { argon2id, hash, verify } from "argon2";
export function hashPassword(password: string): Promise<string> {
  return hash(password, { type: argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
}
export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return verify(hash, password);
}
export function validBootstrapPassword(password: unknown): password is string {
  return typeof password === "string" && password.length >= 12 && password.length <= 128 && Buffer.byteLength(password) <= 1024;
}

export function validMemberPassword(password:unknown):password is string {
  return typeof password==='string'&&password.length>=6&&password.length<=128&&Buffer.byteLength(password)<=1024&&/\p{L}/u.test(password)&&/\p{Nd}/u.test(password);
}
