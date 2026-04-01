import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SlackIcon } from "@/components/icons/SlackIcon";
import { useTranslation } from "react-i18next";
import { instanceSettingsApi } from "@/api/instanceSettings";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { cn } from "../lib/utils";

export function InstanceSlackSettings() {
  const { t } = useTranslation();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();

  const [slackEnabled, setSlackEnabled] = useState(false);
  const [slackBotToken, setSlackBotToken] = useState("");
  const [slackAppToken, setSlackAppToken] = useState("");
  const [slackChannelId, setSlackChannelId] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    setBreadcrumbs([
      { label: t("settings.instanceSettings") },
      { label: t("settings.slackIntegration") },
    ]);
  }, [setBreadcrumbs, t]);

  const generalQuery = useQuery({
    queryKey: queryKeys.instance.generalSettings,
    queryFn: () => instanceSettingsApi.getGeneral(),
  });

  useEffect(() => {
    if (generalQuery.data) {
      setSlackEnabled(generalQuery.data.slackEnabled ?? false);
      setSlackBotToken(generalQuery.data.slackBotToken ?? "");
      setSlackAppToken(generalQuery.data.slackAppToken ?? "");
      setSlackChannelId(generalQuery.data.slackChannelId ?? "");
      setDirty(false);
    }
  }, [generalQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (slackEnabled && (!slackBotToken || !slackAppToken || !slackChannelId)) {
        throw new Error(t("settings.slackTokensRequired"));
      }
      return instanceSettingsApi.updateGeneral({
        slackEnabled,
        slackBotToken,
        slackAppToken,
        slackChannelId,
      });
    },
    onSuccess: async () => {
      setActionError(null);
      setActionSuccess(t("settings.slackSaveSuccess"));
      setDirty(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.instance.generalSettings });
      setTimeout(() => setActionSuccess(null), 3000);
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(error instanceof Error ? error.message : t("settings.slackSaveError"));
    },
  });

  if (generalQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">{t("settings.loadingGeneralSettings")}</div>;
  }

  if (generalQuery.error) {
    return (
      <div className="text-sm text-destructive">
        {generalQuery.error instanceof Error
          ? generalQuery.error.message
          : t("settings.failedToLoadGeneralSettings")}
      </div>
    );
  }

  const markDirty = () => { setDirty(true); setActionSuccess(null); };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <SlackIcon className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">{t("settings.slackIntegration")}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("settings.slackIntegrationDescription")}
        </p>
      </div>

      {actionError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {actionSuccess && (
        <div className="rounded-md border border-green-500/40 bg-green-500/5 px-3 py-2 text-sm text-green-700 dark:text-green-400">
          {actionSuccess}
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <button
          type="button"
          className="flex w-full items-center gap-2 text-sm font-semibold text-left"
          onClick={() => setGuideOpen(!guideOpen)}
        >
          {guideOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {t("settings.slackSetupGuide")}
        </button>
        {guideOpen && (
          <div className="mt-4 space-y-4 text-sm text-muted-foreground">
            <ol className="list-decimal list-inside space-y-3">
              <li>
                <strong>{t("settings.slackGuideStep1Title")}</strong>
                <p className="ml-5 mt-1">{t("settings.slackGuideStep1Desc")}</p>
              </li>
              <li>
                <strong>{t("settings.slackGuideStep2Title")}</strong>
                <p className="ml-5 mt-1">{t("settings.slackGuideStep2Desc")}</p>
              </li>
              <li>
                <strong>{t("settings.slackGuideStep3Title")}</strong>
                <p className="ml-5 mt-1">{t("settings.slackGuideStep3Desc")}</p>
              </li>
              <li>
                <strong>{t("settings.slackGuideStep4Title")}</strong>
                <p className="ml-5 mt-1">{t("settings.slackGuideStep4Desc")}</p>
              </li>
              <li>
                <strong>{t("settings.slackGuideStep5Title")}</strong>
                <p className="ml-5 mt-1">{t("settings.slackGuideStep5Desc")}</p>
              </li>
              <li>
                <strong>{t("settings.slackGuideStep6Title")}</strong>
                <p className="ml-5 mt-1">{t("settings.slackGuideStep6Desc")}</p>
              </li>
            </ol>
            <p className="text-xs">
              {t("settings.slackGuideFullDocs")}{" "}
              <a
                href="https://github.com/LifeMap/clippaper/blob/master/docs/guides/slack-setup.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                docs/guides/slack-setup.md
              </a>
            </p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">{t("settings.slackEnable")}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("settings.slackIntegrationDescription")}
            </p>
          </div>
          <button
            type="button"
            data-slot="toggle"
            aria-label={t("settings.slackEnable")}
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
              slackEnabled ? "bg-green-600" : "bg-muted",
            )}
            onClick={() => { setSlackEnabled(!slackEnabled); markDirty(); }}
          >
            <span
              className={cn(
                "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform",
                slackEnabled ? "translate-x-4.5" : "translate-x-0.5",
              )}
            />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">{t("settings.slackBotToken")}</label>
            <input
              type="password"
              value={slackBotToken}
              onChange={(e) => { setSlackBotToken(e.target.value); markDirty(); }}
              placeholder="xoxb-..."
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("settings.slackAppToken")}</label>
            <input
              type="password"
              value={slackAppToken}
              onChange={(e) => { setSlackAppToken(e.target.value); markDirty(); }}
              placeholder="xapp-..."
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("settings.slackChannelId")}</label>
            <input
              type="text"
              value={slackChannelId}
              onChange={(e) => { setSlackChannelId(e.target.value); markDirty(); }}
              placeholder="C0XXXXXXX"
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!dirty || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveMutation.isPending ? t("common.loading") : t("actions.save")}
          </button>
          {generalQuery.data?.slackEnabled && (
            <span className="inline-flex items-center gap-1.5 text-xs text-green-600">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              {t("settings.slackStatusConnected")}
            </span>
          )}
          {!generalQuery.data?.slackEnabled && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
              {t("settings.slackStatusDisconnected")}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
