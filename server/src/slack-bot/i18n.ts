import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

type TranslationDict = Record<string, string | Record<string, string>>;

const translations: Record<string, TranslationDict> = {};

function loadTranslations(lang: string): TranslationDict {
  if (translations[lang]) return translations[lang];
  try {
    const filePath = resolve(__dirname, "../../../ui/src/i18n/locales", `${lang}.json`);
    const content = JSON.parse(readFileSync(filePath, "utf-8"));
    translations[lang] = content;
    return content;
  } catch {
    if (lang !== "en") return loadTranslations("en");
    return {};
  }
}

export function t(key: string, lang: string = "en"): string {
  const dict = loadTranslations(lang);
  const parts = key.split(".");
  let current: unknown = dict;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof current === "string" ? current : key;
}
