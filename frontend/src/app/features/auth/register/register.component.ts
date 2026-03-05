import { Component, signal }         from '@angular/core';
import { CommonModule }              from '@angular/common';
import { FormsModule }               from '@angular/forms';
import { RouterLink }                from '@angular/router';
import { AuthService }               from '../../../core/services/auth.service';
import { TranslationService, Lang }  from '../../../core/services/translation.service';
import { TranslatePipe }             from '../../../core/pipes/translate.pipe';

@Component({
  selector:    'app-register',
  standalone:  true,
  imports:     [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './register.component.html',
  styleUrl:    './register.component.scss',
})
export class RegisterComponent {

  form    = { name: '', email: '', password: '' };
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

  register(): void {
    if (!this.form.name || !this.form.email || !this.form.password) {
      this.error = this.translation.t('AUTH.ERR_FILL_ALL');
      return;
    }
    if (this.form.password.length < 6) {
      this.error = this.translation.t('AUTH.ERR_PWD_LENGTH');
      return;
    }

    this.loading = true;
    this.error   = '';

    this.auth.register(this.form).subscribe({
      next:  () => { this.loading = false; },
      error: (e) => {
        this.error   = e.error?.error || this.translation.t('AUTH.ERR_REGISTER');
        this.loading = false;
      },
    });
  }
}