import { useEffect, useState } from "react";
import { getLang, setLang, subscribeLang, t, type Lang } from "./index";

/** Подписка на смену языка: компонент перерисуется, а t() возьмёт новый словарь. */
export function useI18n(): { lang: Lang; setLang: (l: Lang) => void; t: typeof t } {
  const [lang, setLocal] = useState<Lang>(getLang());

  useEffect(() => subscribeLang(() => setLocal(getLang())), []);

  return { lang, setLang, t };
}
