import { App as BoltApp, LogLevel } from "@slack/bolt";
import type { Db } from "@paperclipai/db";
import { companies } from "@paperclipai/db";
import { registerCommands } from "./commands.js";
import { startListeners, stopListeners } from "./listeners.js";

let boltApp: BoltApp | null = null;

export interface SlackBotOptions {
  botToken: string;
  appToken: string;
  channelId: string;
}

export async function startSlackBot(db: Db, opts: SlackBotOptions) {
  boltApp = new BoltApp({
    token: opts.botToken,
    appToken: opts.appToken,
    socketMode: true,
    logLevel: LogLevel.INFO,
  });

  // Get all company IDs to subscribe to events
  const allCompanies = await db.select({ id: companies.id }).from(companies);
  const companyIds = allCompanies.map((c) => c.id);
  const defaultCompanyId = companyIds[0];

  if (!defaultCompanyId) {
    console.warn("[slack-bot] No companies found, skipping command registration");
  } else {
    registerCommands(boltApp, db, defaultCompanyId);
  }

  // Start listening for LiveEvents from all companies
  await startListeners(boltApp, db, opts.channelId, companyIds);

  await boltApp.start();
  console.log("[slack-bot] Slack bot started (Socket Mode)");
}

export async function stopSlackBot() {
  stopListeners();
  if (boltApp) {
    await boltApp.stop();
    boltApp = null;
    console.log("[slack-bot] Slack bot stopped");
  }
}
