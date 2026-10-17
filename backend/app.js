// Phusion Passenger / cPanel startup entry point with automatic database setup
const { createConnection } = require("mongoose");
const { validateEnvironment, databaseOptions } = require("./dist/config/environment");
const { authDefinitions, normalizeEmail, validEmail } = require("./dist/auth/auth.schemas");
const { hashPassword, validBootstrapPassword } = require("./dist/auth/password");
const { contentDefinitions } = require("./dist/content/content.schemas");
const { storeDefinitions } = require("./dist/store/store.schemas");
const { academyDefinitions } = require("./dist/academy/academy.schemas");
const { communityDefinitions } = require("./dist/community/community.schemas");
const { directDefinitions } = require("./dist/messaging/direct.schema");
const { moderationDefinitions } = require("./dist/messaging/moderation.schema");
const { messagingDefinition } = require("./dist/messaging/messaging.schema");
const { chatMediaDefinition } = require("./dist/messaging/chat-media.schema");
const { accountDefinitions } = require("./dist/account/account.schemas");
const { leadDefinitions } = require("./dist/leads/lead.schema");
const { contentAuditDefinition } = require("./dist/admin-content/content-audit.schema");
const { mediaDefinition, mediaAuditDefinition } = require("./dist/media/media.schema");
const { notificationDefinition } = require("./dist/notifications/notification.schema");

async function initAndStart() {
  if (process.env.MONGODB_URI && process.env.BOOTSTRAP_ADMIN_EMAIL && process.env.BOOTSTRAP_ADMIN_PASSWORD) {
    let connection;
    try {
      console.log("[Auto-Init] Checking database initialization...");
      const config = validateEnvironment(process.env);
      connection = createConnection(config.MONGODB_URI, databaseOptions);
      await connection.asPromise();

      // 1. Create/verify indexes
      const definitions = [
        ...Object.values(contentDefinitions),
        ...storeDefinitions,
        ...academyDefinitions,
        ...communityDefinitions,
        ...directDefinitions,
        ...moderationDefinitions,
        messagingDefinition,
        chatMediaDefinition,
        ...Object.values(authDefinitions),
        ...Object.values(accountDefinitions),
        ...Object.values(leadDefinitions),
        contentAuditDefinition,
        mediaDefinition,
        mediaAuditDefinition,
        notificationDefinition
      ];
      for (const def of definitions) {
        const model = connection.model(def.name, def.schema, def.collection);
        await model.createIndexes();
      }
      console.log("[Auto-Init] Database indexes verified.");

      // 2. Create initial Super Admin if not already present
      const email = normalizeEmail(process.env.BOOTSTRAP_ADMIN_EMAIL);
      const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
      if (validEmail(email) && validBootstrapPassword(password)) {
        const users = connection.model(authDefinitions.user.name, authDefinitions.user.schema, authDefinitions.user.collection);
        const existing = await users.findOne({ email: { $eq: email } }).select("role").lean();
        if (!existing) {
          await users.create({
            email,
            passwordHash: await hashPassword(password),
            role: "SUPER_ADMIN",
            enabled: true,
            mustChangePassword: true,
          });
          console.log(`[Auto-Init] Super Admin account created: ${email}`);
        } else {
          console.log(`[Auto-Init] Super Admin account already exists (${email}).`);
        }
      }
    } catch (err) {
      console.error("[Auto-Init] Setup check completed or skipped:", err.message);
    } finally {
      if (connection) {
        try { await connection.close(); } catch {}
      }
    }
  }

  // Launch NestJS backend server
  require("./dist/main.js");
}

initAndStart();
