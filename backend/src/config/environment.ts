import { emailConfiguration } from "../notifications/email.config";
import { mediaConfiguration } from "../media/media.config";
import {isAbsolute} from "node:path";
import { isIP } from "node:net";
import { mongo } from "mongoose";

export function validateEnvironment(env: Record<string, unknown>) {
  const nodeEnv = env.NODE_ENV ?? "development";
  if (!["development", "test", "production"].includes(String(nodeEnv))) {
    throw new Error("NODE_ENV must be development, test or production");
  }
  const rawPort = String(env.PORT ?? "4000");
  const port = Number(rawPort);
  if (!/^\d+$/.test(rawPort) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  const uri = typeof env.MONGODB_URI === "string" ? env.MONGODB_URI.trim() : "";
  if (!uri) throw new Error("MONGODB_URI is required");
  try {
    new mongo.MongoClient(uri);
  } catch {
    throw new Error("MONGODB_URI must be a valid MongoDB connection string");
  }
  const rawOrigins = env.AUTH_ALLOWED_ORIGINS ?? (nodeEnv === "production" ? "" : "http://localhost:3000,http://localhost:8080");
  if (typeof rawOrigins !== "string" || !rawOrigins.trim()) throw new Error("AUTH_ALLOWED_ORIGINS must contain explicit frontend origins");
  const origins = rawOrigins.split(",").map(value => value.trim());
  for (const origin of origins) {
    try {
      const parsed = new URL(origin);
      const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
      if (origin !== parsed.origin || parsed.username || parsed.password ||
        (parsed.protocol !== "https:" && !(nodeEnv !== "production" && parsed.protocol === "http:" && local))) throw new Error();
    } catch { throw new Error("AUTH_ALLOWED_ORIGINS must be exact HTTPS origins (localhost HTTP allowed outside production)"); }
  }
  const ttlText = String(env.AUTH_SESSION_TTL_SECONDS ?? "28800");
  const ttl = Number(ttlText);
  if (!/^\d+$/.test(ttlText) || !Number.isInteger(ttl) || ttl < 900 || ttl > 86400) throw new Error("AUTH_SESSION_TTL_SECONDS must be 900–86400");
  const proxyText = env.AUTH_TRUSTED_PROXY_IPS ?? "";
  if (typeof proxyText !== "string") throw new Error("AUTH_TRUSTED_PROXY_IPS must contain literal proxy IPs");
  const proxies = proxyText ? proxyText.split(",").map(value => value.trim()) : [];
  if (proxies.some(ip => !isIP(ip))) throw new Error("AUTH_TRUSTED_PROXY_IPS must contain literal proxy IPs");
  if (env.ACCOUNT_VERIFICATION_KEY !== undefined && env.ACCOUNT_VERIFICATION_KEY !== "" && (typeof env.ACCOUNT_VERIFICATION_KEY !== "string" || !/^[a-f0-9]{64}$/.test(env.ACCOUNT_VERIFICATION_KEY))) throw new Error("ACCOUNT_VERIFICATION_KEY must be 64 lowercase hex characters");
  if(env.ACADEMY_MEDIA_ROOT!==undefined&&env.ACADEMY_MEDIA_ROOT!==''&&(typeof env.ACADEMY_MEDIA_ROOT!=='string'||!isAbsolute(env.ACADEMY_MEDIA_ROOT)||/(?:^|[\\/])public(?:[\\/]|$)/i.test(env.ACADEMY_MEDIA_ROOT)))throw new Error('ACADEMY_MEDIA_ROOT must be an absolute private storage directory outside public assets');
  emailConfiguration(env);
  return { ...env, ...mediaConfiguration(env), NODE_ENV: nodeEnv, PORT: port, MONGODB_URI: uri,
    AUTH_ALLOWED_ORIGINS: [...new Set(origins)], AUTH_SESSION_TTL_SECONDS: ttl, AUTH_TRUSTED_PROXY_IPS: proxies };

}

export const databaseOptions = {
  serverSelectionTimeoutMS: 1500,
  connectTimeoutMS: 1500,
  socketTimeoutMS: 1500,
  heartbeatFrequencyMS: 1000,
  bufferCommands: false,
  autoCreate: false,
  autoIndex: false,
};
