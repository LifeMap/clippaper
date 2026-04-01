import type { App as BoltApp } from "@slack/bolt";
import type { Db } from "@paperclipai/db";
import type { LiveEvent } from "@paperclipai/shared";
import { subscribeCompanyLiveEvents } from "../services/live-events.js";
import { instanceSettingsService } from "../services/instance-settings.js";
import { agentService } from "../services/agents.js";
import { issueService } from "../services/issues.js";
import { approvalService } from "../services/approvals.js";
import { formatIssue, formatIssueStatusChanged, formatApproval, formatFailedRun, formatJoinRequest } from "./formatters.js";

const activeSubscriptions: Array<() => void> = [];

// Map Slack message ts → issue ID for thread replies
const slackMessageToIssue = new Map<string, string>();

export function getIssueIdByMessageTs(ts: string): string | undefined {
  return slackMessageToIssue.get(ts);
}

export async function startListeners(
  bolt: BoltApp,
  db: Db,
  channelId: string,
  companyIds: string[],
) {
  for (const companyId of companyIds) {
    const unsub = subscribeCompanyLiveEvents(companyId, async (event: LiveEvent) => {
      await handleEvent(bolt, db, channelId, companyId, event);
    });
    activeSubscriptions.push(unsub);
  }
}

export function stopListeners() {
  for (const unsub of activeSubscriptions) {
    unsub();
  }
  activeSubscriptions.length = 0;
}

async function getLanguage(db: Db): Promise<string> {
  const settings = await instanceSettingsService(db).getGeneral();
  return settings.defaultLanguage ?? "en";
}

async function handleEvent(
  bolt: BoltApp,
  db: Db,
  channelId: string,
  companyId: string,
  event: LiveEvent,
) {
  const lang = await getLanguage(db);

  try {
    switch (event.type) {
      case "activity.logged": {
        const action = (event.payload as { action?: string }).action;

        if (action === "issue.created") {
          const issueId = (event.payload as { entityId?: string }).entityId;
          if (!issueId) break;
          const issue = await issueService(db).getById(issueId);
          if (!issue) break;
          const agentName = issue.assigneeAgentId
            ? (await agentService(db).getById(issue.assigneeAgentId))?.name ?? null
            : null;
          const msg = formatIssue(
            {
              id: issue.id,
              identifier: issue.identifier,
              title: issue.title,
              status: issue.status,
              priority: issue.priority,
              assigneeAgentName: agentName,
              projectName: null,
            },
            lang,
          );
          const result = await bolt.client.chat.postMessage({ channel: channelId, ...msg });
          if (result.ts) slackMessageToIssue.set(result.ts, issue.id);
        }

        if (action === "issue.updated") {
          const details = (event.payload as { details?: { status?: string } }).details;
          const entityId = (event.payload as { entityId?: string }).entityId;
          if (!entityId || !details?.status) break;
          // Only notify on terminal statuses (done, cancelled)
          if (details.status !== "done" && details.status !== "cancelled") break;
          const issue = await issueService(db).getById(entityId);
          if (!issue) break;
          const agentName = issue.assigneeAgentId
            ? (await agentService(db).getById(issue.assigneeAgentId))?.name ?? null
            : null;
          // Get the latest comment as the result summary
          const comments = await issueService(db).listComments(entityId, { order: "desc", limit: 1 });
          const latestComment = comments[0]?.body ?? null;
          const msg = formatIssueStatusChanged(
            {
              id: entityId,
              identifier: issue.identifier,
              title: issue.title,
              status: details.status,
              assigneeAgentName: agentName,
              latestComment,
            },
            lang,
          );
          const result2 = await bolt.client.chat.postMessage({ channel: channelId, ...msg });
          if (result2.ts) slackMessageToIssue.set(result2.ts, entityId);
        }

        if (action === "approval.created") {
          const approvalId = (event.payload as { entityId?: string }).entityId;
          if (!approvalId) break;
          const approval = await approvalService(db).getById(approvalId);
          if (!approval) break;
          const agentName = approval.requestedByAgentId
            ? (await agentService(db).getById(approval.requestedByAgentId))?.name ?? null
            : null;
          const msg = formatApproval(
            {
              id: approval.id,
              type: approval.type,
              status: approval.status,
              requestedByAgentName: agentName,
              requestedByUserName: null,
            },
            lang,
          );
          await bolt.client.chat.postMessage({ channel: channelId, ...msg });
        }

        break;
      }

      case "heartbeat.run.status": {
        const status = (event.payload as { status?: string }).status;
        const agentId = (event.payload as { agentId?: string }).agentId;
        if (status !== "failed" && status !== "timed_out") break;
        if (!agentId) break;
        const agent = await agentService(db).getById(agentId);
        const msg = formatFailedRun(
          {
            agentName: agent?.name ?? agentId,
            status: status,
            createdAt: event.createdAt,
          },
          lang,
        );
        await bolt.client.chat.postMessage({ channel: channelId, ...msg });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[slack-bot] Error handling event:", err);
  }
}
