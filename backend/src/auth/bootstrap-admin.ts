import { createConnection, type Connection } from "mongoose";
import { databaseOptions, validateEnvironment } from "../config/environment";
import { authDefinitions, normalizeEmail, validEmail } from "./auth.schemas";
import { hashPassword, validBootstrapPassword } from "./password";

async function main(): Promise<void> {
  let connection: Connection | undefined;
  try {
    const config = validateEnvironment(process.env);
    const email = typeof process.env.BOOTSTRAP_ADMIN_EMAIL === "string" ? normalizeEmail(process.env.BOOTSTRAP_ADMIN_EMAIL) : "";
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
    if (!validEmail(email) || !validBootstrapPassword(password)) throw new Error("Invalid bootstrap input");
    // Explicit operator command only; neither imported nor invoked by startup.
    connection = createConnection(config.MONGODB_URI, databaseOptions);
    connection.on("error", () => undefined);
    await connection.asPromise();
    const users = connection.model(authDefinitions.user.name, authDefinitions.user.schema, authDefinitions.user.collection);
    await users.createIndexes();
    const existing=await users.findOne({email:{$eq:email}}).select('role').lean();
    if(existing){console.error(existing.role==='MEMBER'?'Bootstrap conflict: this email already belongs to a MEMBER. No account was changed.':'Bootstrap conflict: this email already exists. No account was changed.');process.exitCode=1;return;}
    // Unique index also protects concurrent bootstrap commands. No upsert/update/elevation.
    await users.create({ email, passwordHash: await hashPassword(password), role: "SUPER_ADMIN", enabled: true,mustChangePassword:true });
    console.log("Bootstrap administrator created.");
  } catch {
    console.error("Bootstrap refused or failed; verify environment, database access and that the normalized user does not already exist.");
    process.exitCode = 1;
  } finally {
    try { await connection?.close(); } catch {
      console.error("Database cleanup failed."); process.exitCode = 1;
    }
  }
}
void main();
