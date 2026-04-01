import { t } from "./i18n.js";

interface IssueData {
  id: string;
  identifier: string | null;
  title: string;
  status: string;
  priority: string;
  assigneeAgentName: string | null;
  projectName: string | null;
}

interface ApprovalData {
  id: string;
  type: string;
  status: string;
  requestedByAgentName: string | null;
  requestedByUserName: string | null;
}

interface FailedRunData {
  agentName: string;
  status: string;
  createdAt: string;
}

interface JoinRequestData {
  id: string;
  requestType: "human" | "agent";
  email: string | null;
  agentName: string | null;
}

function approvalTypeLabel(type: string, lang: string): string {
  const map: Record<string, string> = {
    hire_agent: t("slack.hireAgent", lang),
    approve_ceo_strategy: t("slack.ceoStrategy", lang),
    budget_override_required: t("slack.budgetOverride", lang),
  };
  return map[type] ?? type;
}

export function formatIssue(issue: IssueData, lang: string) {
  const label = issue.identifier ?? issue.id.slice(0, 8);
  return {
    text: `${t("slack.newIssue", lang)}: ${issue.title}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `📋 ${t("slack.newIssue", lang)}` },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*${t("slack.issueTitle", lang)}:*\n${label}: ${issue.title}` },
          { type: "mrkdwn", text: `*${t("slack.issueStatus", lang)}:*\n${issue.status}` },
          { type: "mrkdwn", text: `*${t("slack.issueAssignee", lang)}:*\n${issue.assigneeAgentName ?? t("slack.unassigned", lang)}` },
          { type: "mrkdwn", text: `*${t("slack.issuePriority", lang)}:*\n${issue.priority ?? t("slack.noPriority", lang)}` },
        ],
      },
    ],
  };
}

export function formatApproval(approval: ApprovalData, lang: string) {
  const requester = approval.requestedByAgentName ?? approval.requestedByUserName ?? "unknown";
  return {
    text: `${t("slack.approvalRequested", lang)}: ${approvalTypeLabel(approval.type, lang)}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `🔔 ${t("slack.approvalRequested", lang)}` },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*${t("slack.approvalType", lang)}:*\n${approvalTypeLabel(approval.type, lang)}` },
          { type: "mrkdwn", text: `*${t("slack.approvalRequestedBy", lang)}:*\n${requester}` },
          { type: "mrkdwn", text: `*${t("slack.approvalStatus", lang)}:*\n${approval.status}` },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: `✅ ${t("slack.approve", lang)}` },
            style: "primary",
            action_id: "approval_approve",
            value: approval.id,
          },
          {
            type: "button",
            text: { type: "plain_text", text: `❌ ${t("slack.reject", lang)}` },
            style: "danger",
            action_id: "approval_reject",
            value: approval.id,
          },
        ],
      },
    ],
  };
}

export function formatFailedRun(run: FailedRunData, lang: string) {
  return {
    text: `${t("slack.failedRun", lang)}: ${run.agentName}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `🚨 ${t("slack.failedRun", lang)}` },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*${t("slack.failedRunAgent", lang)}:*\n${run.agentName}` },
          { type: "mrkdwn", text: `*${t("slack.failedRunStatus", lang)}:*\n${run.status}` },
          { type: "mrkdwn", text: `*${t("slack.failedRunTime", lang)}:*\n${run.createdAt}` },
        ],
      },
    ],
  };
}

export function formatIssueStatusChanged(
  issue: { id: string; identifier: string | null; title: string; status: string; assigneeAgentName: string | null; latestComment: string | null },
  lang: string,
) {
  const label = issue.identifier ?? "";
  const emoji = issue.status === "done" ? "✅" : issue.status === "cancelled" ? "🚫" : "🔄";
  const headerKey =
    issue.status === "done"
      ? "slack.issueCompleted"
      : issue.status === "cancelled"
        ? "slack.issueCancelled"
        : "slack.issueStatusChanged";
  const blocks: Array<Record<string, unknown>> = [
    {
      type: "header",
      text: { type: "plain_text", text: `${emoji} ${t(headerKey, lang)}` },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*${t("slack.issueTitle", lang)}:*\n${label}: ${issue.title}` },
        { type: "mrkdwn", text: `*${t("slack.issueStatus", lang)}:*\n${issue.status}` },
        { type: "mrkdwn", text: `*${t("slack.issueAssignee", lang)}:*\n${issue.assigneeAgentName ?? t("slack.unassigned", lang)}` },
      ],
    },
  ];
  if (issue.latestComment) {
    const truncated = issue.latestComment.length > 2000
      ? issue.latestComment.slice(0, 2000) + "..."
      : issue.latestComment;
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*${t("slack.issueResult", lang)}:*\n${truncated}` },
    });
  }
  return {
    text: `${t(headerKey, lang)}: ${label} ${issue.title}`,
    blocks,
  };
}

export function formatJoinRequest(req: JoinRequestData, lang: string) {
  const typeLabel = req.requestType === "human" ? t("slack.human", lang) : t("slack.agent", lang);
  const identity = req.requestType === "human"
    ? req.email ?? "unknown"
    : req.agentName ?? "unknown";
  return {
    text: `${t("slack.joinRequest", lang)}: ${identity}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `👋 ${t("slack.joinRequest", lang)}` },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*${t("slack.joinRequestType", lang)}:*\n${typeLabel}` },
          { type: "mrkdwn", text: `*${req.requestType === "human" ? t("slack.joinRequestEmail", lang) : t("slack.joinRequestAgent", lang)}:*\n${identity}` },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: `✅ ${t("slack.approveJoin", lang)}` },
            style: "primary",
            action_id: "join_approve",
            value: req.id,
          },
          {
            type: "button",
            text: { type: "plain_text", text: `❌ ${t("slack.rejectJoin", lang)}` },
            style: "danger",
            action_id: "join_reject",
            value: req.id,
          },
        ],
      },
    ],
  };
}
