export interface SlackBotConfig {
  botToken: string;
  appToken: string;
  channelId: string;
}

export interface InboxNotification {
  kind: "issue" | "approval" | "failed_run" | "join_request";
  companyId: string;
  payload: Record<string, unknown>;
}
