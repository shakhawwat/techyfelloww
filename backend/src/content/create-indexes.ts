import {storeDefinitions} from '../store/store.schemas';
import {moderationDefinitions} from '../messaging/moderation.schema';
import {directDefinitions} from '../messaging/direct.schema';
import {communityDefinitions} from '../community/community.schemas';
import {chatMediaDefinition} from '../messaging/chat-media.schema';
import {messagingDefinition} from '../messaging/messaging.schema';
import { academyDefinitions } from "../academy/academy.schemas";
import { accountDefinitions } from "../account/account.schemas";
import { notificationDefinition } from "../notifications/notification.schema";
import { leadDefinitions } from "../leads/lead.schema";
import { mediaDefinition, mediaAuditDefinition } from "../media/media.schema";
import { contentAuditDefinition } from "../admin-content/content-audit.schema";
import { authDefinitions } from "../auth/auth.schemas";
import { createConnection, type Connection } from "mongoose";
import { databaseOptions, validateEnvironment } from "../config/environment";
import { contentDefinitions } from "./content.schemas";

async function main(): Promise<void> {
  let connection: Connection | undefined;
  try {
    const config = validateEnvironment(process.env);
    connection = createConnection(config.MONGODB_URI, databaseOptions);
    connection.on("error", () => undefined);
    await connection.asPromise();
    for (const definition of [...Object.values(contentDefinitions), ...storeDefinitions, ...academyDefinitions, ...communityDefinitions, ...directDefinitions, ...moderationDefinitions, messagingDefinition, chatMediaDefinition, ...Object.values(authDefinitions), ...Object.values(accountDefinitions), ...Object.values(leadDefinitions), contentAuditDefinition, mediaDefinition, mediaAuditDefinition, notificationDefinition]) {
      const model = connection.model(definition.name, definition.schema, definition.collection);
      await model.createIndexes();
      console.log(`Indexes created: ${definition.collection}`);
    }
  } catch {
    console.error("Index creation failed; verify database access and existing unique-field values.");
    process.exitCode = 1;
  } finally {
    try { await connection?.close(); } catch {
      console.error("Database cleanup failed.");
      process.exitCode = 1;
    }
  }
}
void main();
