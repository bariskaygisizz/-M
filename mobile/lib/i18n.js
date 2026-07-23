import AsyncStorage from "@react-native-async-storage/async-storage";
import { translations, t as translate, LOCALES, DEFAULT_LOCALE } from "../../shared/i18n.js";

export { LOCALES, DEFAULT_LOCALE, translations };

const KEY = "davetly_locale";

export function t(locale, path, vars) {
  return translate(locale, path, vars);
}

export async function loadLocale() {
  return (await AsyncStorage.getItem(KEY)) || DEFAULT_LOCALE;
}

export async function saveLocale(code) {
  await AsyncStorage.setItem(KEY, code);
}
