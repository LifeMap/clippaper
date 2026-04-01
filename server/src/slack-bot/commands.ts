import type { App as BoltApp } from "@slack/bolt";
import type { Db } from "@paperclipai/db";
import { eq } from "drizzle-orm";
import { joinRequests } from "@paperclipai/db";
import { agentService } from "../services/agents.js";
import { issueService } from "../services/issues.js";
import { approvalService } from "../services/approvals.js";
import { instanceSettingsService } from "../services/instance-settings.js";
import { heartbeatService } from "../services/heartbeat.js";
import { queueIssueAssignmentWakeup } from "../services/issue-assignment-wakeup.js";
import { t } from "./i18n.js";
import { getIssueIdByMessageTs } from "./listeners.js";

export function registerCommands(bolt: BoltApp, db: Db, defaultCompanyId: string, channelId?: string) {
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
    const lang = await getLang();
    const agentId = view.state.values.agent_block.agent_select.selected_option?.value;
    const message = view.state.values.message_block.message_input.value;
    if (!agentId || !message) return;

    try {
      const created = await issueService(db).create(defaultCompanyId, {
        title: message.slice(0, 200),
        description: message,
        assigneeAgentId: agentId,
        status: "todo",
        priority: "medium",
      });
      const agent = await agentService(db).getById(agentId);
      const agentName = agent?.name ?? agentId;
      const identifier = created.identifier ?? created.id;
      console.log(`[slack-bot] Issue created: ${identifier} for agent ${agentName}`);

      // Wake up the agent to process the new issue (same as web UI)
      queueIssueAssignmentWakeup({
        heartbeat: heartbeatService(db),
        issue: { id: created.id, assigneeAgentId: agentId, status: created.status },
        reason: "issue_assigned",
        mutation: "create",
        contextSource: "slack-bot",
        requestedByActorType: "system",
        requestedByActorId: "slack-bot",
      });

      // Send confirmation to Slack channel
      if (channelId) {
        await bolt.client.chat.postMessage({
          channel: channelId,
          text: `${t("slack.issueCreated", lang)}: ${identifier}`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `✅ *${t("slack.issueCreated", lang)}*: \`${identifier}\`\n📋 ${message.slice(0, 200)}\n🤖 ${t("slack.issueAssignee", lang)}: *${agentName}*`,
              },
            },
          ],
        });
      }
    } catch (err) {
      console.error("[slack-bot] Failed to create issue from modal:", err);
    }
  });

  // Handle message events — DM messages and channel thread replies
  bolt.event("message", async ({ event, client }) => {
    const e = event as any;
    if (e.bot_id || e.subtype) return;
    if (!e.text) return;

    // Channel thread reply → add comment to linked issue
    if (e.channel_type === "channel" && e.thread_ts && e.thread_ts !== e.ts) {
      const issueId = getIssueIdByMessageTs(e.thread_ts);
      if (!issueId) return;
      const lang = await getLang();
      try {
        await issueService(db).addComment(issueId, e.text, { userId: null as any });
        const issue = await issueService(db).getById(issueId);
        const identifier = issue?.identifier ?? issueId.slice(0, 8);
        const isDone = issue?.status === "done" || issue?.status === "cancelled";
        await client.chat.postMessage({
          channel: e.channel,
          thread_ts: e.thread_ts,
          text: `💬 ${t("slack.commentAdded", lang)}: ${identifier}`,
          blocks: [
            {
              type: "section",
              text: { type: "mrkdwn", text: `💬 ${t("slack.commentAdded", lang)}: \`${identifier}\`` },
            },
            ...(isDone
              ? [
                  {
                    type: "actions",
                    elements: [
                      {
                        type: "button",
                        text: { type: "plain_text", text: `🔄 ${t("slack.reopenIssue", lang)}` },
                        action_id: "issue_reopen",
                        value: issueId,
                      },
                    ],
                  },
                ]
              : []),
          ],
        });
      } catch (err) {
        console.error("[slack-bot] Failed to add comment from thread:", err);
        await client.reactions.add({ channel: e.channel, timestamp: e.ts, name: "x" });
      }
      return;
    }

    // DM messages — show agent selection buttons
    if (e.channel_type !== "im") return;

    const lang = await getLang();
    const agents = await agentService(db).list(defaultCompanyId);
    if (agents.length === 0) {
      await client.chat.postMessage({ channel: e.channel, text: t("slack.noAgentsFound", lang) });
      return;
    }

    const userMessage = e.text as string;
    await client.chat.postMessage({
      channel: e.channel,
      text: t("slack.selectAgent", lang),
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `📋 *${userMessage.slice(0, 200)}*\n\n${t("slack.selectAgent", lang)}:`,
          },
        },
        {
          type: "actions",
          elements: agents.slice(0, 25).map((agent) => ({
            type: "button" as const,
            text: { type: "plain_text" as const, text: `${agent.name}` },
            action_id: `dm_assign_${agent.id}`,
            value: JSON.stringify({ agentId: agent.id, message: userMessage }),
          })),
        },
      ],
    });
  });

  // Handle DM agent selection button click
  bolt.action(/^dm_assign_/, async ({ ack, action, say }) => {
    await ack();
    const lang = await getLang();
    const payload = JSON.parse((action as { value: string }).value);
    const { agentId, message } = payload as { agentId: string; message: string };

    try {
      const created = await issueService(db).create(defaultCompanyId, {
        title: message.slice(0, 200),
        description: message,
        assigneeAgentId: agentId,
        status: "todo",
        priority: "medium",
      });
      const agent = await agentService(db).getById(agentId);
      const agentName = agent?.name ?? agentId;
      const identifier = created.identifier ?? created.id;
      console.log(`[slack-bot] Issue created via DM: ${identifier} for agent ${agentName}`);

      queueIssueAssignmentWakeup({
        heartbeat: heartbeatService(db),
        issue: { id: created.id, assigneeAgentId: agentId, status: created.status },
        reason: "issue_assigned",
        mutation: "create",
        contextSource: "slack-bot-dm",
        requestedByActorType: "system",
        requestedByActorId: "slack-bot",
      });

      await say(`✅ *${t("slack.issueCreated", lang)}*: \`${identifier}\`\n🤖 ${t("slack.issueAssignee", lang)}: *${agentName}*`);
    } catch (err) {
      console.error("[slack-bot] Failed to create issue from DM:", err);
      await say(`❌ ${t("settings.slackSaveError", lang)}`);
    }
  });

  // Handle issue reopen button
  bolt.action("issue_reopen", async ({ ack, action, respond }) => {
    await ack();
    const lang = await getLang();
    const issueId = (action as { value?: string }).value;
    if (!issueId) return;
    try {
      await issueService(db).update(issueId, { status: "todo" });
      const issue = await issueService(db).getById(issueId);
      const identifier = issue?.identifier ?? issueId.slice(0, 8);

      // Wake up the assigned agent
      if (issue?.assigneeAgentId) {
        queueIssueAssignmentWakeup({
          heartbeat: heartbeatService(db),
          issue: { id: issueId, assigneeAgentId: issue.assigneeAgentId, status: "todo" },
          reason: "issue_assigned",
          mutation: "update",
          contextSource: "slack-bot",
          requestedByActorType: "system",
          requestedByActorId: "slack-bot",
        });
      }

      await respond(`🔄 ${t("slack.issueReopened", lang)}: \`${identifier}\``);
    } catch (err) {
      console.error("[slack-bot] Failed to reopen issue:", err);
      await respond(`❌ ${t("settings.slackSaveError", lang)}`);
    }
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
    await db
      .update(joinRequests)
      .set({ status: "approved", approvedByUserId: "local-board", approvedAt: new Date(), updatedAt: new Date() })
      .where(eq(joinRequests.id, requestId));
    await respond(`✅ ${t("slack.approveJoin", lang)}`);
  });

  // Handle join request reject button
  bolt.action("join_reject", async ({ ack, action, respond }) => {
    await ack();
    const lang = await getLang();
    const requestId = (action as { value?: string }).value;
    if (!requestId) return;
    await db
      .update(joinRequests)
      .set({ status: "rejected", rejectedByUserId: "local-board", rejectedAt: new Date(), updatedAt: new Date() })
      .where(eq(joinRequests.id, requestId));
    await respond(`❌ ${t("slack.rejectJoin", lang)}`);
  });
}
