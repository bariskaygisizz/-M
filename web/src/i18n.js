import { translations, t as translate, LOCALES, DEFAULT_LOCALE } from "../../shared/i18n.js";

export { LOCALES, DEFAULT_LOCALE, translations };

export function t(locale, path, vars) {
  return translate(locale, path, vars);
}

export function loadLocale() {
  return localStorage.getItem("davetly_locale") || DEFAULT_LOCALE;
}

export function saveLocale(code) {
  localStorage.setItem("davetly_locale", code);
}
