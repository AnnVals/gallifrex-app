import { Component, signal }         from '@angular/core';
import { CommonModule }              from '@angular/common';
import { FormsModule }               from '@angular/forms';
import { RouterLink }                from '@angular/router';
import { AuthService }               from '../../../core/services/auth.service';
import { TranslationService, Lang }  from '../../../core/services/translation.service';
import { TranslatePipe }             from '../../../core/pipes/translate.pipe';

@Component({
  selector:    'app-login',
  standalone:  true,
  imports:     [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './login.component.html',
  styleUrl:    './login.component.scss',
})
export class LoginComponent {

  form    = { email: '', password: '' };
  error   = '';
  loading = false;

  langMenuOpen = signal(false);

  private readonly closeLangMenuFn = () => this.langMenuOpen.set(false);

  constructor(
    private auth:        AuthService,
    public  translation: TranslationService,
  ) {
    document.addEventListener('click', this.closeLangMenuFn);
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.closeLangMenuFn);
  }

  toggleLangMenu(): void {
    this.langMenuOpen.update(open => !open);
  }

  changeLang(lang: Lang): void {
    this.translation.setLang(lang);
    this.langMenuOpen.set(false);
  }

  login(): void {
    if (!this.form.email || !this.form.password) {
      this.error = this.translation.t('AUTH.ERR_FILL_ALL');
      return;
    }
    this.loading = true;
    this.error   = '';

    this.auth.login(this.form).subscribe({
      next:  () => { this.loading = false; },
      error: (e) => {
        this.error   = e.error?.error || this.translation.t('AUTH.ERR_LOGIN');
        this.loading = false;
      },
    });
  }
}