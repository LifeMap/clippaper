export interface InstanceGeneralSettings {
  censorUsernameInLogs: boolean;
  defaultLanguage: "en" | "ko";
  slackEnabled: boolean;
  slackBotToken: string;
  slackAppToken: string;
  slackChannelId: string;
}

export interface InstanceExperimentalSettings {
  enableIsolatedWorkspaces: boolean;
  autoRestartDevServerWhenIdle: boolean;
}

export interface InstanceSettings {
  id: string;
  general: InstanceGeneralSettings;
  experimental: InstanceExperimentalSettings;
  createdAt: Date;
  updatedAt: Date;
}
