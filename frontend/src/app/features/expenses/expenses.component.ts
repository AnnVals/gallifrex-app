import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule }                        from '@angular/common';
import { FormsModule }                         from '@angular/forms';
import { TranslatePipe }                       from '../../core/pipes/translate.pipe';
import { ExpenseService, CategoryService }     from '../../core/services/api.services';
import { TranslationService }                  from '../../core/services/translation.service';
import { CurrencyService }                     from '../../core/services/currency.service';
import { Expense, Category, ExpenseFilters }   from '../../core/models/models';
import { exportToCsv, EXPENSE_COLUMNS }        from '../../core/utils/csv-export.util';

@Component({
  selector:    'app-expenses',
  standalone:  true,
  imports:     [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './expenses.component.html',
  styleUrl:    './expenses.component.scss',
})
export class ExpensesComponent implements OnInit {

  expenses     = signal<Expense[]>([]);
  categories   = signal<Category[]>([]);
  loading      = signal(true);
  total        = signal(0);
  page         = signal(0);
  pageSize     = 20;

  showModal    = signal(false);
  editingId    = signal<number | null>(null);
  saving       = signal(false);
  formError    = signal('');
  formType     = signal<string>('expense');
  deleteTarget = signal<Expense | null>(null);

  form: any = {
    type:        'expense',
    amount:      null,
    date:        new Date().toISOString().split('T')[0],
    category_id: null,
    description: '',
  };

  filters: ExpenseFilters = {
    month:  new Date().getMonth() + 1,
    year:   new Date().getFullYear(),
    type:   '',
    search: '',
  };

  monthNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  years        = [2023, 2024, 2025, 2026, 2027];

  private searchDebounce: any;

  filteredCategories = computed(() =>
    this.categories().filter(cat => !this.formType() || cat.type === this.formType())
  );

  totalIncome = computed(() =>
    this.expenses()
      .filter(e => e.type === 'income')
      .reduce((sum, e) => sum + +e.amount, 0)
  );

  totalExpenseAmt = computed(() =>
    this.expenses()
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => sum + +e.amount, 0)
  );

  totalPages = computed(() => Math.ceil(this.total() / this.pageSize));

  constructor(
    private expenseService:  ExpenseService,
    private categoryService: CategoryService,
    private translation:     TranslationService,
    private currencyService: CurrencyService,
  ) {}

  ngOnInit(): void {
    this.categoryService.getAll().subscribe(cats => this.categories.set(cats));
    this.load();
  }

  load(): void {
    this.loading.set(true);

    const params: ExpenseFilters = {
      ...this.filters,
      limit:  this.pageSize,
      offset: this.page() * this.pageSize,
    };

    this.expenseService.getAll(params).subscribe({
      next: (response) => {
        this.expenses.set(response.data);
        this.total.set(response.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  debouncedLoad(): void {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.page.set(0);
      this.load();
    }, 400);
  }

  clearFilters(): void {
    this.filters = { type: '', search: '' };
    this.page.set(0);
    this.load();
  }

  prevPage(): void {
    if (this.page() > 0) {
      this.page.update(p => p - 1);
      this.load();
    }
  }

  nextPage(): void {
    if (this.page() < this.totalPages() - 1) {
      this.page.update(p => p + 1);
      this.load();
    }
  }

  openModal(expense?: Expense): void {
    this.formError.set('');

    if (expense) {
      let formattedDate = new Date().toISOString().split('T')[0];
      if (expense.date) {
        formattedDate = expense.date.toString().split('T')[0];
      }

      this.editingId.set(expense.id!);
      this.form = {
        type:        expense.type,
        amount:      expense.amount,
        date:        formattedDate,
        description: expense.description || '',
        category_id: expense.category_id || null,
      };
    } else {
      this.editingId.set(null);
      this.form = {
        type:        'expense',
        amount:      null,
        date:        new Date().toISOString().split('T')[0],
        category_id: null,
        description: '',
      };
    }

    this.formType.set(this.form.type);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  setType(type: string): void {
    this.form.type        = type;
    this.form.category_id = null;
    this.formType.set(type);
  }

  submit(): void {
    if (!this.form.amount || +this.form.amount <= 0) {
      this.formError.set(this.translation.t('MOVEMENTS.ERR_AMOUNT'));
      return;
    }
    if (!this.form.date) {
      this.formError.set(this.translation.t('MOVEMENTS.ERR_DATE'));
      return;
    }

    this.saving.set(true);
    this.formError.set('');

    const payload = {
      type:        this.form.type,
      amount:      parseFloat(this.form.amount),
      date:        this.form.date,
      description: this.form.description || '',
      category_id: this.form.category_id || null,
    };

    if (this.editingId()) {
      this.expenseService.update(this.editingId()!, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.load();
        },
        error: (err) => {
          const message = err.error?.error
            || err.error?.errors?.[0]?.msg
            || this.translation.t('COMMON.ERROR_SAVE');
          this.formError.set(message);
          this.saving.set(false);
        },
      });
    } else {
      this.expenseService.create(payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.load();
        },
        error: (err) => {
          const message = err.error?.error
            || err.error?.errors?.[0]?.msg
            || this.translation.t('COMMON.ERROR_SAVE');
          this.formError.set(message);
          this.saving.set(false);
        },
      });
    }
  }

  confirmDelete(expense: Expense): void {
    this.deleteTarget.set(expense);
  }

  doDelete(): void {
    const target = this.deleteTarget();
    if (!target || !target.id) return;

    this.expenseService.delete(target.id).subscribe({
      next:  () => { this.deleteTarget.set(null); this.load(); },
      error: () =>    this.deleteTarget.set(null),
    });
  }

  eur(value: number): string {
    return this.currencyService.format(value || 0);
  }

  exportCsv(): void {
    this.loading.set(true);

    const params: ExpenseFilters = { ...this.filters, limit: 10000, offset: 0 };

    this.expenseService.getAll(params).subscribe({
      next: (response) => {
        let filename = 'movimientos';
        if (this.filters.year)  filename = filename + '-' + this.filters.year;
        if (this.filters.month) filename = filename + '-' + this.filters.month;
        exportToCsv(filename, response.data, EXPENSE_COLUMNS);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  getTypeLabel(type: string): string {
    if (type === 'income') return this.translation.t('MOVEMENTS.INCOME');
    return this.translation.t('MOVEMENTS.EXPENSE');
  }

  getAmountSign(type: string): string {
    if (type === 'income') return '+';
    return '-';
  }

  getCategoryIcon(icon: string | undefined): string {
    if (icon) return icon;
    return '?';
  }

  getModalTitle(): string {
    if (this.editingId()) return this.translation.t('MOVEMENTS.EDIT_TITLE');
    return this.translation.t('MOVEMENTS.NEW_TITLE');
  }

  getSaveLabel(): string {
    if (this.saving())     return this.translation.t('COMMON.SAVING');
    if (this.editingId())  return this.translation.t('COMMON.UPDATE');
    return this.translation.t('COMMON.SAVE');
  }

  getDeleteDescription(): string {
    const target = this.deleteTarget();
    if (!target) return '';
    if (target.description)   return target.description;
    if (target.category_name) return target.category_name;
    return this.translation.t('MOVEMENTS.NO_DESCRIPTION');
  }

  getDeleteAmount(): string {
    const target = this.deleteTarget();
    if (!target) return this.eur(0);
    return this.eur(+(target.amount || 0));
  }
}