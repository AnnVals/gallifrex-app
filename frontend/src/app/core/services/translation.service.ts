import { Injectable, signal } from '@angular/core';
import { HttpClient }         from '@angular/common/http';

export type Lang = 'es' | 'en' | 'de' | 'fr' | 'ca' | 'gl' | 'eu';

export interface LangOption {
  code:  Lang;
  label: string;
  flag:  string;
}

export const LANGUAGES: LangOption[] = [
  { code: 'es', label: 'ES', flag: '🇪🇸' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'de', label: 'DE', flag: '🇩🇪' },
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'ca', label: 'CA', flag: '🏴' },
  { code: 'gl', label: 'GL', flag: '🏴' },
  { code: 'eu', label: 'EU', flag: '🏴' },
];

@Injectable({ providedIn: 'root' })
export class TranslationService {

  current = signal<Lang>('es');
  langs   = LANGUAGES;

  private translations: Record<string, any> = {};
  private cache:        Record<string, any> = {};

  constructor(private http: HttpClient) {}

  init(): Promise<void> {
    const saved = (localStorage.getItem('lang') as Lang) || 'es';
    return this.setLang(saved);
  }

  setLang(lang: Lang): Promise<void> {
    if (this.cache[lang]) {
      this.translations = this.cache[lang];
      this.current.set(lang);
      localStorage.setItem('lang', lang);
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.http.get<any>('/assets/i18n/' + lang + '.json').subscribe({
        next: (data) => {
          this.cache[lang]  = data;
          this.translations = data;
          this.current.set(lang);
          localStorage.setItem('lang', lang);
          resolve();
        },
        error: reject,
      });
    });
  }

  t(key: string): string {
    const parts = key.split('.');
    let value: any = this.translations;

    for (const part of parts) {
      if (value == null) {
        return key;
      }
      value = value[part];
    }

    if (value !== undefined && value !== null) {
      return value;
    }
    return key;
  }

  currentLang(): LangOption {
    const found = LANGUAGES.find(l => l.code === this.current());
    if (found) {
      return found;
    }
    return LANGUAGES[0];
  }
}