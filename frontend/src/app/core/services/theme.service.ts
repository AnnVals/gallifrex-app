import { Injectable, signal } from '@angular/core';
import { Theme }              from '../models/models';

@Injectable({ providedIn: 'root' })
export class ThemeService {

  theme = signal<Theme>('dark');

  init(): void {
    const saved = (localStorage.getItem('theme') as Theme) || 'dark';
    this.apply(saved);
  }

  toggle(): void {
    let next: Theme;
    if (this.theme() === 'dark') {
      next = 'light';
    } else {
      next = 'dark';
    }
    this.apply(next);
  }

  private apply(theme: Theme): void {
    this.theme.set(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }
}