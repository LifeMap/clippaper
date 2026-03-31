import { App as BoltApp, LogLevel } from "@slack/bolt";
import type { Db } from "@paperclipai/db";
import { companies } from "@paperclipai/db";
import { registerCommands } from "./commands.js";
import { startListeners, stopListeners } from "./listeners.js";
import { t } from "./i18n.js";
import { instanceSettingsService } from "../services/instance-settings.js";

let boltApp: BoltApp | null = null;

export interface SlackBotOptions {
  botToken: string;
  appToken: string;
  channelId: string;
}

async function getLanguage(db: Db): Promise<string> {
  const settings = await instanceSettingsService(db).getGeneral();
  return settings.defaultLanguage ?? "en";
}

export async function startSlackBot(db: Db, opts: SlackBotOptions) {
  boltApp = new BoltApp({
    token: opts.botToken,
    appToken: opts.appToken,
    socketMode: true,
    logLevel: LogLevel.INFO,
  });

  const allCompanies = await db.select({ id: companies.id }).from(companies);
  const companyIds = allCompanies.map((c) => c.id);
  const defaultCompanyId = companyIds[0];

  if (!defaultCompanyId) {
    console.warn("[slack-bot] No companies found, skipping command registration");
  } else {
    registerCommands(boltApp, db, defaultCompanyId);
  }

  await startListeners(boltApp, db, opts.channelId, companyIds);
  await boltApp.start();
  console.log("[slack-bot] Slack bot started (Socket Mode)");

  // Send welcome message
  const lang = await getLanguage(db);
  try {
    await boltApp.client.chat.postMessage({
      channel: opts.channelId,
      text: t("slack.welcomeMessage", lang),
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `🤖 *ClippaperAI* ${t("slack.welcomeConnected", lang)}`,
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: t("slack.welcomeHelp", lang),
            },
          ],
        },
      ],
    });
  } catch (err) {
    console.error("[slack-bot] Failed to send welcome message:", err);
  }
}

export async function stopSlackBot() {
  stopListeners();
  if (boltApp) {
    await boltApp.stop();
    boltApp = null;
    console.log("[slack-bot] Slack bot stopped");
  }
}

export async function restartSlackBot(db: Db, opts: SlackBotOptions) {
  await stopSlackBot();
  await startSlackBot(db, opts);
}

export function isSlackBotRunning(): boolean {
  return boltApp !== null;
}
