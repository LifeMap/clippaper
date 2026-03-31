import type { App as BoltApp } from "@slack/bolt";
import type { Db } from "@paperclipai/db";
import { agentService } from "../services/agents.js";
import { issueService } from "../services/issues.js";
import { approvalService } from "../services/approvals.js";
import { accessService } from "../services/access.js";
import { instanceSettingsService } from "../services/instance-settings.js";
import { t } from "./i18n.js";

export function registerCommands(bolt: BoltApp, db: Db, defaultCompanyId: string) {
  async function getLang(): Promise<string> {
    const settings = await instanceSettingsService(db).getGeneral();
    return settings.defaultLanguage ?? "en";
  }

  // /clip agents - Show agent list
  bolt.command("/clip", async ({ command, ack, respond }) => {
    await ack();
    const lang = await getLang();
    const args = command.text.trim().split(/\s+/);
    const subcommand = args[0] ?? "";

    if (subcommand === "agents") {
      const agents = await agentService(db).list(defaultCompanyId);
      if (agents.length === 0) {
        await respond(t("slack.noAgentsFound", lang));
        return;
      }
      const blocks = [
        {
          type: "header" as const,
          text: { type: "plain_text" as const, text: `🤖 ${t("slack.agentList", lang)}` },
        },
        ...agents.map((agent) => ({
          type: "section" as const,
          fields: [
            { type: "mrkdwn" as const, text: `*${t("slack.agentName", lang)}:*\n${agent.name}` },
            { type: "mrkdwn" as const, text: `*${t("slack.agentRole", lang)}:*\n${agent.role ?? "-"}` },
            { type: "mrkdwn" as const, text: `*${t("slack.agentStatus", lang)}:*\n${agent.status}` },
          ],
        })),
      ];
      await respond({ blocks });
      return;
    }

    if (subcommand === "ask") {
      // Open modal with agent selector
      const agents = await agentService(db).list(defaultCompanyId);
      await bolt.client.views.open({
        trigger_id: command.trigger_id,
        view: {
          type: "modal",
          callback_id: "ask_agent_modal",
          title: { type: "plain_text", text: t("slack.selectAgent", lang) },
          submit: { type: "plain_text", text: t("actions.create", lang) },
          blocks: [
            {
              type: "input",
              block_id: "agent_block",
              label: { type: "plain_text", text: t("slack.selectAgent", lang) },
              element: {
                type: "static_select",
                action_id: "agent_select",
                options: agents.map((agent) => ({
                  text: { type: "plain_text" as const, text: `${agent.name} (${agent.role ?? "-"})` },
                  value: agent.id,
                })),
              },
            },
            {
              type: "input",
              block_id: "message_block",
              label: { type: "plain_text", text: t("slack.enterMessage", lang) },
              element: {
                type: "plain_text_input",
                action_id: "message_input",
                multiline: true,
              },
            },
          ],
        },
      });
      return;
    }

    // Default: show help
    await respond({
      text: [
        "`/clip agents` — " + t("slack.agentList", lang),
        "`/clip ask` — " + t("slack.selectAgent", lang),
      ].join("\n"),
    });
  });

  // Handle modal submission: create issue assigned to selected agent
  bolt.view("ask_agent_modal", async ({ ack, view }) => {
    await ack();
    const agentId = view.state.values.agent_block.agent_select.selected_option?.value;
    const message = view.state.values.message_block.message_input.value;
    if (!agentId || !message) return;

    await issueService(db).create(defaultCompanyId, {
      title: message.slice(0, 200),
      description: message,
      assigneeAgentId: agentId,
      status: "todo",
      priority: "medium",
    });
  });

  // Handle approval approve button
  bolt.action("approval_approve", async ({ ack, action, respond }) => {
    await ack();
    const lang = await getLang();
    const approvalId = (action as { value?: string }).value;
    if (!approvalId) return;
    await approvalService(db).approve(approvalId, "board", null);
    await respond(`✅ ${t("slack.approvalApproved", lang)}`);
  });

  // Handle approval reject button
  bolt.action("approval_reject", async ({ ack, action, respond }) => {
    await ack();
    const lang = await getLang();
    const approvalId = (action as { value?: string }).value;
    if (!approvalId) return;
    await approvalService(db).reject(approvalId, "board", null);
    await respond(`❌ ${t("slack.approvalRejected", lang)}`);
  });

  // Handle join request approve button
  bolt.action("join_approve", async ({ ack, action, respond }) => {
    await ack();
    const lang = await getLang();
    const requestId = (action as { value?: string }).value;
    if (!requestId) return;
    await accessService(db).approveJoinRequest(requestId);
    await respond(`✅ ${t("slack.approveJoin", lang)}`);
  });

  // Handle join request reject button
  bolt.action("join_reject", async ({ ack, action, respond }) => {
    await ack();
    const lang = await getLang();
    const requestId = (action as { value?: string }).value;
    if (!requestId) return;
    await accessService(db).rejectJoinRequest(requestId);
    await respond(`❌ ${t("slack.rejectJoin", lang)}`);
  });
}
