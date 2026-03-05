import { Injectable, signal, computed } from '@angular/core';
import { HttpClient }                   from '@angular/common/http';

export interface Currency {
  code:   string;
  label:  string;
  symbol: string;
  flag:   string;
}

export const CURRENCIES: Currency[] = [
  { code: 'EUR', label: 'EUR', symbol: '€',  flag: '🇪🇺' },
  { code: 'USD', label: 'USD', symbol: '$',  flag: '🇺🇸' },
  { code: 'GBP', label: 'GBP', symbol: '£',  flag: '🇬🇧' },
  { code: 'JPY', label: 'JPY', symbol: '¥',  flag: '🇯🇵' },
  { code: 'CHF', label: 'CHF', symbol: 'Fr', flag: '🇨🇭' },
  { code: 'CAD', label: 'CAD', symbol: 'C$', flag: '🇨🇦' },
  { code: 'AUD', label: 'AUD', symbol: 'A$', flag: '🇦🇺' },
  { code: 'CNY', label: 'CNY', symbol: '¥',  flag: '🇨🇳' },
  { code: 'MXN', label: 'MXN', symbol: '$',  flag: '🇲🇽' },
  { code: 'BRL', label: 'BRL', symbol: 'R$', flag: '🇧🇷' },
];

const STORAGE_KEY_CURRENCY = 'gallifrex_currency';
const STORAGE_KEY_RATES    = 'gallifrex_rates';
const CACHE_TTL_MS         = 60 * 60 * 1000;

const FALLBACK_RATES: Record<string, number> = {
  EUR: 1,   USD: 1.08, GBP: 0.86, JPY: 163,
  CHF: 0.97, CAD: 1.47, AUD: 1.65, CNY: 7.8,
  MXN: 18.5, BRL: 5.4,
};

@Injectable({ providedIn: 'root' })
export class CurrencyService {

  currencies = CURRENCIES;
  current    = signal<Currency>(CURRENCIES[0]);
  rates      = signal<Record<string, number>>({});
  loading    = signal(false);
  error      = signal(false);

  currentCurrency = computed(() => this.current());

  constructor(private http: HttpClient) {
    const savedCode     = localStorage.getItem(STORAGE_KEY_CURRENCY);
    const savedCurrency = CURRENCIES.find(c => c.code === savedCode);

    if (savedCurrency) {
      this.current.set(savedCurrency);
    }

    this.loadRates();
  }

  setCurrency(currency: Currency): void {
    this.current.set(currency);
    localStorage.setItem(STORAGE_KEY_CURRENCY, currency.code);
  }

  convert(amountInEur: number): number {
    const rate = this.rates()[this.current().code];

    if (!rate || this.current().code === 'EUR') {
      return amountInEur;
    }

    return amountInEur * rate;
  }

  format(amountInEur: number): string {
    const currency  = this.current();
    const converted = this.convert(amountInEur);

    let decimals: number;
    if (currency.code === 'JPY') {
      decimals = 0;
    } else {
      decimals = 2;
    }

    const formatted = new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(converted);

    return formatted + ' ' + currency.symbol;
  }

  private loadRates(): void {
    const cached = this.readRatesFromCache();

    if (cached) {
      this.rates.set(cached);
      return;
    }

    this.loading.set(true);
    this.error.set(false);

    this.http.get<any>('https://api.frankfurter.app/latest?base=EUR').subscribe({
      next: (response) => {
        const data = { EUR: 1, ...response.rates };
        this.rates.set(data);
        localStorage.setItem(STORAGE_KEY_RATES, JSON.stringify({ ts: Date.now(), data }));
        this.loading.set(false);
      },
      error: () => {
        this.rates.set(FALLBACK_RATES);
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  private readRatesFromCache(): Record<string, number> | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_RATES);

      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      const ts: number   = parsed.ts;
      const data: Record<string, number> = parsed.data;

      if (Date.now() - ts < CACHE_TTL_MS) {
        return data;
      }
      return null;
    } catch {
      return null;
    }
  }
}