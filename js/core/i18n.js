/* Page language. English pages live under /en/ and declare <html lang="en">; everything else is Russian.
   Scripts keep both wordings side by side and take the right one with pick({ ru, en }). */
export const LANG = document.documentElement.lang === 'en' ? 'en' : 'ru';
export const pick = byLang => byLang[LANG];
