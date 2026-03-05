import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

declare const lucide: any;

function initializeLucideIcons(): void {
  if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
}

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    initializeLucideIcons();
  })
  .catch((error) => {
    console.error(error);
  });