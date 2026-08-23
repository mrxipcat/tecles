import i18next from "i18next";
import { initReactI18next } from "react-i18next";

// Cada pàgina/component gran té el seu propi "namespace": un fitxer JSON per
// idioma a locales/<idioma>/<namespace>.json. S'agafen tots automàticament
// (sense llista fixa) perquè es puguin afegir/editar en paral·lel sense
// tocar aquest fitxer.
const modules = import.meta.glob("./locales/*/*.json", { eager: true });

const resources = {};
for (const path in modules) {
  const match = path.match(/\.\/locales\/([a-z]{2})\/([\w-]+)\.json$/);
  if (!match) continue;
  const [, lang, ns] = match;
  const mod = modules[path];
  resources[lang] = resources[lang] || {};
  resources[lang][ns] = mod.default ?? mod;
}

export const SUPPORTED_LANGUAGES = ["ca", "es", "en"];

i18next.use(initReactI18next).init({
  resources,
  ns: Object.keys(resources.ca || {}),
  fallbackLng: "ca",
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: { escapeValue: false },
});

export default i18next;
