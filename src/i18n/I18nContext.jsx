import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import en from "./locales/en.json";
import he from "./locales/he.json";
import ar from "./locales/ar.json";
import ru from "./locales/ru.json";
import { DEFAULT_LANG, LANGUAGES, STORAGE_KEY } from "./config";

const messages = { en, he, ar, ru };

const I18nContext = createContext(null);

function getNested(obj, path) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

function detectInitialLang() {
  if (typeof window === "undefined") return DEFAULT_LANG;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && LANGUAGES[stored]) return stored;
  const browser = navigator.language?.slice(0, 2);
  if (browser && LANGUAGES[browser]) return browser;
  return DEFAULT_LANG;
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detectInitialLang);

  const setLang = useCallback((code) => {
    if (!LANGUAGES[code]) return;
    setLangState(code);
    localStorage.setItem(STORAGE_KEY, code);
  }, []);

  const { dir, htmlLang } = LANGUAGES[lang];

  useEffect(() => {
    document.documentElement.lang = htmlLang;
    document.documentElement.dir = dir;
  }, [htmlLang, dir]);

  const tm = useCallback(
    (key) => {
      const value = getNested(messages[lang], key);
      if (value !== undefined && value !== null) return value;
      return getNested(messages.en, key);
    },
    [lang]
  );

  const t = useCallback(
    (key, vars) => {
      let value = tm(key);
      if (value == null) return key;
      if (typeof value !== "string") return value;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        });
      }
      return value;
    },
    [tm]
  );

  const value = useMemo(
    () => ({ lang, setLang, t, tm, dir, isRtl: dir === "rtl" }),
    [lang, setLang, t, tm, dir]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
