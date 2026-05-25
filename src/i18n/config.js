export const LANGUAGES = {
  en: { label: "EN", dir: "ltr", htmlLang: "en" },
  he: { label: "HE", dir: "rtl", htmlLang: "he" },
  ar: { label: "AR", dir: "rtl", htmlLang: "ar" },
  ru: { label: "RU", dir: "ltr", htmlLang: "ru" },
};

export const LANG_CODES = Object.keys(LANGUAGES);
export const DEFAULT_LANG = "en";
export const STORAGE_KEY = "yosite-lang";

export function isRtl(lang) {
  return LANGUAGES[lang]?.dir === "rtl";
}
