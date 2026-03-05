import { Injectable } from '@angular/core';

declare const lucide: any;

@Injectable({ providedIn: 'root' })
export class LucideService {

  private debounceTimer: any;

  refresh(): void {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.run(), 30);
  }

  private run(): void {
    if (typeof lucide === 'undefined') {
      return;
    }

    document.querySelectorAll('i[data-lucide]').forEach(el => {
      el.removeAttribute('data-processed');
      el.innerHTML = '';
    });

    lucide.createIcons();

    document.querySelectorAll('i[data-lucide]').forEach(el => {
      el.setAttribute('data-processed', '1');
    });
  }
}