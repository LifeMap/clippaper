import { z } from "zod";

export const SUPPORTED_LANGUAGES = ["en", "ko"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const instanceGeneralSettingsSchema = z.object({
  censorUsernameInLogs: z.boolean().default(false),
  defaultLanguage: z.enum(SUPPORTED_LANGUAGES).default("en"),
}).strict();

export const patchInstanceGeneralSettingsSchema = instanceGeneralSettingsSchema.partial();

export const instanceExperimentalSettingsSchema = z.object({
  enableIsolatedWorkspaces: z.boolean().default(false),
  autoRestartDevServerWhenIdle: z.boolean().default(false),
}).strict();

export const patchInstanceExperimentalSettingsSchema = instanceExperimentalSettingsSchema.partial();

export type InstanceGeneralSettings = z.infer<typeof instanceGeneralSettingsSchema>;
export type PatchInstanceGeneralSettings = z.infer<typeof patchInstanceGeneralSettingsSchema>;
export type InstanceExperimentalSettings = z.infer<typeof instanceExperimentalSettingsSchema>;
export type PatchInstanceExperimentalSettings = z.infer<typeof patchInstanceExperimentalSettingsSchema>;
