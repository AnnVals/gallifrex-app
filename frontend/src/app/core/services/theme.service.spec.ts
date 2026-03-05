import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let svc: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    svc = new ThemeService();
  });

  afterEach(() => localStorage.clear());

  it('should be created', () => {
    expect(svc).toBeTruthy();
  });

  describe('init()', () => {
    it('defaults to dark when localStorage is empty', () => {
      svc.init();
      expect(svc.theme()).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('restores theme from localStorage', () => {
      localStorage.setItem('theme', 'light');
      svc.init();
      expect(svc.theme()).toBe('light');
    });
  });

  describe('toggle()', () => {
    it('switches from dark to light', () => {
      svc.init();
      svc.toggle();
      expect(svc.theme()).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(localStorage.getItem('theme')).toBe('light');
    });

    it('switches from light to dark', () => {
      localStorage.setItem('theme', 'light');
      svc.init();
      svc.toggle();
      expect(svc.theme()).toBe('dark');
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('toggles back and forth correctly', () => {
      svc.init();
      svc.toggle();
      svc.toggle();
      expect(svc.theme()).toBe('dark');
    });
  });
});