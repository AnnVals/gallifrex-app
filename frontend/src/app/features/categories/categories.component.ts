import { Component, OnInit, signal }       from '@angular/core';
import { CommonModule }                    from '@angular/common';
import { FormsModule }                     from '@angular/forms';
import { TranslatePipe }                   from '../../core/pipes/translate.pipe';
import { CategoryService }                 from '../../core/services/api.services';
import { TranslationService }              from '../../core/services/translation.service';
import { CurrencyService }                 from '../../core/services/currency.service';
import { Category }                        from '../../core/models/models';
import { exportToCsv, CATEGORY_COLUMNS }   from '../../core/utils/csv-export.util';

export const EMOJIS = [
  '🛒', '🚗', '🏠', '🎉', '💊', '👗', '📱', '🍽️', '✈️', '📚',
  '🎮', '💪', '🐾', '🎨', '☕', '🛠️', '💄', '🎓', '🏋️', '🎵',
  '🍕', '🚿', '💡', '🌿', '🎁', '🤝', '🏥', '🔧', '💰', '📈',
  '💼', '🏦', '📁',
];

export const COLORS = [
  '#7c6cf8', '#f857a6', '#12c2e9', '#0de7a8', '#ffd166', '#ef476f',
  '#06d6a0', '#118ab2', '#e76f51', '#8ecae6', '#a8dadc', '#457b9d',
];

@Component({
  selector:    'app-categories',
  standalone:  true,
  imports:     [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './categories.component.html',
  styleUrl:    './categories.component.scss',
})
export class CategoriesComponent implements OnInit {

  categories   = signal<Category[]>([]);
  filtered     = signal<Category[]>([]);
  loading      = signal(true);
  showModal    = signal(false);
  editingId    = signal<number | null>(null);
  saving       = signal(false);
  formError    = signal('');
  deleteTarget = signal<Category | null>(null);

  filterType = '';

  form: Partial<Category> = { name: '', icon: '📁', color: '#7c6cf8', type: 'expense' };

  emojis = EMOJIS;
  colors = COLORS;

  constructor(
    private categoryService: CategoryService,
    private translation:     TranslationService,
    private currencyService: CurrencyService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.categoryService.getAll().subscribe({
      next: (cats) => {
        this.categories.set(cats);
        this.applyFilter();
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setFilter(type: string): void {
    this.filterType = type;
    this.applyFilter();
  }

  private applyFilter(): void {
    const all = this.categories();

    if (this.filterType) {
      this.filtered.set(all.filter(c => c.type === this.filterType));
    } else {
      this.filtered.set(all);
    }
  }

  openModal(category?: Category): void {
    this.formError.set('');
    if (category) {
      this.editingId.set(category.id!);
      this.form = { ...category };
    } else {
      this.editingId.set(null);
      this.form = { name: '', icon: '📁', color: '#7c6cf8', type: 'expense' };
    }
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  submit(): void {
    if (!this.form.name || !this.form.name.trim()) {
      this.formError.set(this.translation.t('CATEGORIES.ERR_NAME'));
      return;
    }

    this.saving.set(true);
    this.formError.set('');

    if (this.editingId()) {
      this.categoryService.update(this.editingId()!, this.form).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.load();
        },
        error: (err) => {
          this.formError.set(err.error?.error || this.translation.t('COMMON.ERROR_SAVE'));
          this.saving.set(false);
        },
      });
    } else {
      this.categoryService.create(this.form as Category).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.load();
        },
        error: (err) => {
          this.formError.set(err.error?.error || this.translation.t('COMMON.ERROR_SAVE'));
          this.saving.set(false);
        },
      });
    }
  }

  confirmDeleteCategory(category: Category): void {
    if (category.is_default) return;
    this.deleteTarget.set(category);
  }

  doDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;

    this.categoryService.delete(target.id!).subscribe({
      next: () => {
        this.deleteTarget.set(null);
        this.load();
      },
      error: (err) => {
        alert(err.error?.error || this.translation.t('COMMON.ERROR_DELETE'));
        this.deleteTarget.set(null);
      },
    });
  }

  exportCsv(): void {
    exportToCsv('categorias', this.filtered(), CATEGORY_COLUMNS);
  }

  getTypeLabel(type: string): string {
    if (type === 'income') return this.translation.t('CATEGORIES.TYPE_INCOME');
    return this.translation.t('CATEGORIES.TYPE_EXPENSE');
  }

  getDeleteTitle(category: Category): string {
    if (category.is_default) return this.translation.t('CATEGORIES.NOT_DELETABLE');
    return this.translation.t('COMMON.DELETE');
  }

  getModalTitle(): string {
    if (this.editingId()) return this.translation.t('CATEGORIES.EDIT_TITLE');
    return this.translation.t('CATEGORIES.NEW_TITLE');
  }

  getSaveLabel(): string {
    if (this.saving()) return this.translation.t('COMMON.SAVING');
    return this.translation.t('COMMON.SAVE');
  }
}