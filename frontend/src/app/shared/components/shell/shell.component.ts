import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule }     from '@angular/common';
import { Subscription }     from 'rxjs';
import { filter }           from 'rxjs/operators';
import { AuthService }        from '../../../core/services/auth.service';
import { ThemeService }       from '../../../core/services/theme.service';
import { LucideService }      from '../../../core/services/lucide.service';
import { TranslationService, Lang } from '../../../core/services/translation.service';
import { CurrencyService, Currency } from '../../../core/services/currency.service';
import { TranslatePipe }      from '../../../core/pipes/translate.pipe';

interface NavItem {
  key:  string;
  icon: string;
  path: string;
}

@Component({
  selector:    'app-shell',
  standalone:  true,
  imports:     [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, TranslatePipe],
  templateUrl: './shell.component.html',
  styleUrl:    './shell.component.scss',
})
export class ShellComponent implements OnInit, OnDestroy {

  sidebarOpen      = signal(false);
  langMenuOpen     = signal(false);
  currencyMenuOpen = signal(false);

  navItems: NavItem[] = [
    { key: 'DASHBOARD',  icon: 'layout-dashboard', path: '/dashboard'  },
    { key: 'MOVEMENTS',  icon: 'arrow-left-right', path: '/expenses'   },
    { key: 'BUDGETS',    icon: 'target',            path: '/budgets'    },
    { key: 'CATEGORIES', icon: 'tag',               path: '/categories' },
  ];

  private subscription  = new Subscription();
  private domObserver?: MutationObserver;

  private readonly closeLangMenuFn     = () => this.langMenuOpen.set(false);
  private readonly closeCurrencyMenuFn = () => this.currencyMenuOpen.set(false);

  constructor(
    public  auth:        AuthService,
    public  theme:       ThemeService,
    public  lucideService: LucideService,
    public  translation: TranslationService,
    public  currency:    CurrencyService,
    private router:      Router,
  ) {
    this.subscription.add(
      this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        .subscribe(() => {
          setTimeout(() => this.lucideService.refresh(), 100);
          this.langMenuOpen.set(false);
          this.currencyMenuOpen.set(false);
        })
    );
  }

  ngOnInit(): void {
    this.domObserver = new MutationObserver(() => {
      const unprocessed = document.querySelectorAll('i[data-lucide]:not([data-processed])');
      if (unprocessed.length > 0) this.lucideService.refresh();
    });

    this.domObserver.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => this.lucideService.refresh(), 200);

    document.addEventListener('click', this.closeLangMenuFn);
    document.addEventListener('click', this.closeCurrencyMenuFn);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.domObserver?.disconnect();
    document.removeEventListener('click', this.closeLangMenuFn);
    document.removeEventListener('click', this.closeCurrencyMenuFn);
  }

  toggleLangMenu(): void {
    this.langMenuOpen.update(open => !open);
  }

  toggleCurrencyMenu(): void {
    this.currencyMenuOpen.update(open => !open);
  }

  changeLang(lang: Lang): void {
    this.translation.setLang(lang);
    this.langMenuOpen.set(false);
    setTimeout(() => this.lucideService.refresh(), 50);
  }

  selectCurrency(currency: Currency): void {
    this.currency.setCurrency(currency);
    this.currencyMenuOpen.set(false);
  }

  toggleTheme(): void {
    this.theme.toggle();
    setTimeout(() => this.lucideService.refresh(), 0);
  }

  userInitial(): string {
    return this.auth.user()?.name?.charAt(0).toUpperCase() || '?';
  }
}