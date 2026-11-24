import type { Lang, LandingBundle } from "./types";
import { en } from "./pages/en";
import { ru } from "./pages/ru";
import { fr } from "./pages/fr";
import { de } from "./pages/de";
import { es } from "./pages/es";

/** Адрес сайта без завершающего слэша: из него строятся canonical и sitemap. */
export const SITE = "https://qr-ix.com";

/** Порядок языков в переключателе и в sitemap. */
export const LANGS: Lang[] = ["en", "ru", "fr", "de", "es"];

export const BUNDLES: Record<Lang, LandingBundle> = { en, ru, fr, de, es };

/** Сколько страниц в наборе — проверяем, что языки не разъехались. */
export const PAGE_COUNT = en.pages.length;
