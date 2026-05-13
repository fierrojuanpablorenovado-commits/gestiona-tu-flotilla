'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { LangCode, T } from '@/lib/translations';

type Translations = typeof T['es'];

interface LanguageContextType {
  lang: LangCode;
  t: Translations;
  setLang: (l: LangCode) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'es',
  t: T.es,
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>('es');

  const setLang = useCallback((l: LangCode) => {
    setLangState(l);
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, t: T[lang] as Translations, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
