const http = require('http');
const { createConnection } = require('mongoose');
const { validateEnvironment, databaseOptions } = require('./dist/config/environment');
const { contentDefinitions } = require('./dist/content/content.schemas');
const { storeDefinitions } = require('./dist/store/store.schemas');
const { academyDefinitions } = require('./dist/academy/academy.schemas');
const { communityDefinitions } = require('./dist/community/community.schemas');
const { directDefinitions } = require('./dist/messaging/direct.schema');
const { moderationDefinitions } = require('./dist/messaging/moderation.schema');
const { messagingDefinition } = require('./dist/messaging/messaging.schema');
const { chatMediaDefinition } = require('./dist/messaging/chat-media.schema');
const { authDefinitions, normalizeEmail, validEmail } = require('./dist/auth/auth.schemas');
const { accountDefinitions } = require('./dist/account/account.schemas');
const { leadDefinitions } = require('./dist/leads/lead.schema');
const { contentAuditDefinition } = require('./dist/admin-content/content-audit.schema');
const { mediaDefinition, mediaAuditDefinition } = require('./dist/media/media.schema');
const { notificationDefinition } = require('./dist/notifications/notification.schema');
const { hashPassword, validBootstrapPassword } = require('./dist/auth/password');

let statusHtml = '<h3>⏳ Initializing database, please wait a few seconds and refresh...</h3>';
let isRunning = false;

async function runInit() {
  if (isRunning) return;
  isRunning = true;
  const logs = [];
  const log = (msg) => { console.log(msg); logs.push(msg); };

  let connection;
  try {
    log('1. Validating environment variables...');
    const config = validateEnvironment(process.env);

    log('2. Connecting to MongoDB Atlas...');
    connection = createConnection(config.MONGODB_URI, databaseOptions);
    await connection.asPromise();
    log(' Connected to MongoDB Atlas successfully.');

    log('3. Creating database indexes for all schemas...');
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
      log(`   Created index: ${def.collection}`);
    }

    log('4. Bootstrapping Super Administrator account...');
    const email = typeof process.env.BOOTSTRAP_ADMIN_EMAIL === 'string' ? normalizeEmail(process.env.BOOTSTRAP_ADMIN_EMAIL) : '';
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

    if (!validEmail(email) || !validBootstrapPassword(password)) {
      log('   Skipping or invalid admin credentials.');
    } else {
      const users = connection.model(authDefinitions.user.name, authDefinitions.user.schema, authDefinitions.user.collection);
      await users.createIndexes();
      const existing = await users.findOne({ email: { $eq: email } }).select('role').lean();
      if (existing) {
        log(`   Admin account (${email}) already exists. No account changed.`);
      } else {
        await users.create({
          email,
          passwordHash: await hashPassword(password),
          role: 'SUPER_ADMIN',
          enabled: true,
          mustChangePassword: true,
        });
        log(`   Super Admin created successfully: ${email}`);
      }
    }

    log(' Done! Database initialized successfully.');

    statusHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Setup Complete - Techy Fellow</title></head>
      <body style="margin: 0; background: #020617; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 680px; margin: 50px auto; padding: 35px; background: #0f172a; color: #f8fafc; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #1e293b;">
          <h1 style="color: #38bdf8; margin-top: 0;">🚀 Database Setup Complete!</h1>
          <p style="color: #94a3b8; font-size: 16px;">All database collections, indexes, and your Super Admin account have been created in MongoDB Atlas.</p>
          <div style="background: #1e293b; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 25px 0;">
            <h3 style="color: #34d399; margin-top: 0;">Final Step in cPanel:</h3>
            <ol style="line-height: 1.8; padding-left: 20px; color: #e2e8f0; margin-bottom: 0;">
              <li>Go back to your cPanel tab (<strong>Setup Node.js App</strong>).</li>
              <li>Change <strong>Application startup file</strong> from <code>init.js</code> back to <code>app.js</code>.</li>
              <li>Click <strong>Save</strong>, then click <strong>Restart</strong>.</li>
            </ol>
          </div>
          <details style="margin-top: 20px;">
            <summary style="cursor: pointer; color: #64748b; font-size: 14px;">View Initialization Logs</summary>
            <pre style="background: #020617; padding: 15px; border-radius: 6px; font-size: 12px; color: #a5f3fc; overflow-x: auto; margin-top: 10px;">${logs.join('\n')}</pre>
          </details>
        </div>
      </body>
      </html>
    `;
  } catch (err) {
    console.error('Initialization error:', err);
    log(' Error: ' + err.message);
    statusHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Setup Failed</title></head>
      <body style="margin: 0; background: #020617; font-family: sans-serif;">
        <div style="max-width: 680px; margin: 50px auto; padding: 35px; background: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid #ef4444;">
          <h1 style="color: #f87171; margin-top: 0;">⚠️ Database Initialization Failed</h1>
          <p style="color: #e2e8f0;">${err.message}</p>
          <pre style="background: #1e293b; padding: 15px; border-radius: 6px; font-size: 12px; color: #fca5a5; overflow-x: auto;">${logs.join('\n')}</pre>
        </div>
      </body>
      </html>
    `;
  } finally {
    if (connection) {
      try { await connection.close(); } catch {}
    }
  }
}

const port = process.env.PORT || 4000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(statusHtml);
});

server.listen(port, () => {
  console.log(`Init server listening on port ${port}`);
  runInit();
});

