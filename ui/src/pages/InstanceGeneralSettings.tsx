import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "@paperclipai/shared";
import { instanceSettingsApi } from "@/api/instanceSettings";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { cn } from "../lib/utils";

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  ko: "한국어",
};

export function InstanceGeneralSettings() {
  const { t, i18n } = useTranslation();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setBreadcrumbs([
      { label: t("settings.instanceSettings") },
      { label: t("settings.general") },
    ]);
  }, [setBreadcrumbs, t]);

  const generalQuery = useQuery({
    queryKey: queryKeys.instance.generalSettings,
    queryFn: () => instanceSettingsApi.getGeneral(),
  });

  useEffect(() => {
    if (generalQuery.data?.defaultLanguage) {
      i18n.changeLanguage(generalQuery.data.defaultLanguage);
    }
  }, [generalQuery.data?.defaultLanguage, i18n]);

  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) =>
      instanceSettingsApi.updateGeneral({ censorUsernameInLogs: enabled }),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.instance.generalSettings });
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : t("settings.failedToUpdateGeneralSettings"));
    },
  });

  const languageMutation = useMutation({
    mutationFn: async (lang: string) =>
      instanceSettingsApi.updateGeneral({ defaultLanguage: lang as "en" | "ko" }),
    onSuccess: async (_data, lang) => {
      setActionError(null);
      await i18n.changeLanguage(lang);
      await queryClient.invalidateQueries({ queryKey: queryKeys.instance.generalSettings });
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : t("settings.failedToUpdateGeneralSettings"));
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

  const censorUsernameInLogs = generalQuery.data?.censorUsernameInLogs === true;
  const currentLanguage = generalQuery.data?.defaultLanguage ?? "en";

  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">{t("settings.general")}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("settings.censorUsernameDescription")}
        </p>
      </div>

      {actionError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {actionError}
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">{t("settings.defaultLanguage")}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("settings.defaultLanguageDescription")}
            </p>
          </div>
          <select
            value={currentLanguage}
            disabled={languageMutation.isPending}
            onChange={(e) => languageMutation.mutate(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {LANGUAGE_LABELS[lang] ?? lang}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">{t("settings.censorUsername")}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("settings.censorUsernameDescription")}
            </p>
          </div>
          <button
            type="button"
            data-slot="toggle"
            aria-label={t("settings.censorUsername")}
            disabled={toggleMutation.isPending}
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              censorUsernameInLogs ? "bg-green-600" : "bg-muted",
            )}
            onClick={() => toggleMutation.mutate(!censorUsernameInLogs)}
          >
            <span
              className={cn(
                "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform",
                censorUsernameInLogs ? "translate-x-4.5" : "translate-x-0.5",
              )}
            />
          </button>
        </div>
      </section>
    </div>
  );
}
