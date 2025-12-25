import type { Locale } from "../i18n";

export type AppSettings = {
  version: 1;
  locale: Locale;
};

const storageKey = "pinforge_settings_v1";

export const defaultSettings: AppSettings = {
  version: 1,
  locale: "zh",
};

const isLocale = (value: unknown): value is Locale => value === "zh" || value === "en";

export const loadSettings = (): AppSettings => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const locale = isLocale(parsed.locale) ? parsed.locale : defaultSettings.locale;
    return { version: 1, locale };
  } catch {
    return defaultSettings;
  }
};

export const saveSettings = (settings: AppSettings) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(settings));
  } catch {
    // ignore storage failures
  }
};

export const resetSettings = () => {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // ignore storage failures
  }
};
