import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import hi from './hi.json';
import te from './te.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      te: { translation: te },
    },
    lng: 'en', // Default language, updated dynamically on app load
    fallbackLng: 'en',
    compatibilityJSON: 'v3', // Required for React Native compat
    interpolation: {
      escapeValue: false,
    },
  } as any);

export default i18n;
