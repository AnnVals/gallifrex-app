import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule }                        from '@angular/common';
import { FormsModule }                         from '@angular/forms';
import { TranslatePipe }                       from '../../core/pipes/translate.pipe';
import { BudgetService, CategoryService }      from '../../core/services/api.services';
import { TranslationService }                  from '../../core/services/translation.service';
import { CurrencyService }                     from '../../core/services/currency.service';
import { Budget, Category }                    from '../../core/models/models';
import { exportToCsv, BUDGET_COLUMNS }         from '../../core/utils/csv-export.util';

@Component({
  selector:    'app-budgets',
  standalone:  true,
  imports:     [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './budgets.component.html',
  styleUrl:    './budgets.component.scss',
})
export class BudgetsComponent implements OnInit {

  budgets      = signal<Budget[]>([]);
  categories   = signal<Category[]>([]);
  loading      = signal(true);
  showModal    = signal(false);
  editingId    = signal<number | null>(null);
  saving       = signal(false);
  formError    = signal('');
  deleteTarget = signal<Budget | null>(null);

  form: Partial<Budget> = { amount: 0, category_id: undefined };

  selectedMonth = new Date().getMonth() + 1;
  selectedYear  = new Date().getFullYear();

  monthNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  years        = [2023, 2024, 2025, 2026, 2027];

  Math = Math;

  expenseCats = computed(() =>
    this.categories().filter(cat => cat.type === 'expense')
  );

  totalBudget = computed(() =>
    this.budgets().reduce((sum, b) => sum + +b.amount, 0)
  );

  totalSpent = computed(() =>
    this.budgets().reduce((sum, b) => sum + +(b.spent || 0), 0)
  );

  remaining = computed(() => this.totalBudget() - this.totalSpent());

  pctUsed = computed(() => {
    if (this.totalBudget() <= 0) return 0;
    return (this.totalSpent() / this.totalBudget()) * 100;
  });

  get currencySymbol(): string {
    return this.currencyService.symbol;
  }

  constructor(
    private budgetService:   BudgetService,
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
    this.budgetService.getAll(this.selectedMonth, this.selectedYear).subscribe({
      next:  (budgets) => { this.budgets.set(budgets); this.loading.set(false); },
      error: ()        =>   this.loading.set(false),
    });
  }

  openModal(budget?: Budget): void {
    this.formError.set('');
    if (budget) {
      this.editingId.set(budget.id!);
      this.form = {
        ...budget,
        // Mostrar el importe convertido a la moneda actual para editar
        amount: this.currencyService.convert(+budget.amount),
      };
    } else {
      this.editingId.set(null);
      this.form = { amount: 0, category_id: undefined };
    }
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  submit(): void {
    if (!this.form.category_id) {
      this.formError.set(this.translation.t('BUDGETS.ERR_CATEGORY'));
      return;
    }
    if (!this.form.amount || +this.form.amount <= 0) {
      this.formError.set(this.translation.t('BUDGETS.ERR_AMOUNT'));
      return;
    }

    this.saving.set(true);
    this.formError.set('');

    const payload = {
      ...this.form,
      // Convertir de vuelta a EUR antes de guardar en la BD
      amount: this.currencyService.convertToEur(parseFloat(String(this.form.amount))),
      month: this.selectedMonth,
      year:  this.selectedYear,
    };

    this.budgetService.upsert(payload).subscribe({
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

  confirmDelete(budget: Budget): void {
    this.deleteTarget.set(budget);
  }

  doDelete(): void {
    const target = this.deleteTarget();
    if (!target || !target.id) return;

    this.budgetService.delete(target.id).subscribe({
      next:  () => { this.deleteTarget.set(null); this.load(); },
      error: () =>    this.deleteTarget.set(null),
    });
  }

  pct(budget: Budget): number {
    return Math.min((+(budget.spent || 0) / +budget.amount) * 100, 100);
  }

  barColor(budget: Budget): string {
    const ratio = +(budget.spent || 0) / +budget.amount;

    if (ratio > 1)   return 'var(--red)';
    if (ratio > 0.8) return '#ffd166';

    if (budget.color) return budget.color;
    return 'var(--accent)';
  }

  eur(value: number): string {
    return this.currencyService.format(value || 0);
  }

  exportCsv(): void {
    const filename = 'presupuestos-' + this.selectedYear + '-' + this.selectedMonth;
    exportToCsv(filename, this.budgets(), BUDGET_COLUMNS);
  }

  getProgressBarColor(): string {
    if (this.pctUsed() > 100) return 'var(--red)';
    if (this.pctUsed() > 80)  return '#ffd166';
    return 'var(--green)';
  }

  getModalTitle(): string {
    if (this.editingId()) return this.translation.t('BUDGETS.EDIT_TITLE');
    return this.translation.t('BUDGETS.NEW_TITLE');
  }

  getSaveLabel(): string {
    if (this.saving()) return this.translation.t('COMMON.SAVING');
    return this.translation.t('COMMON.SAVE');
  }

  getDeleteIcon(): string {
    const target = this.deleteTarget();
    if (target && target.icon) return target.icon;
    return '';
  }

  getDeleteCategoryName(): string {
    const target = this.deleteTarget();
    if (target && target.category_name) return target.category_name;
    return '';
  }

  getDeleteAmount(): string {
    const target = this.deleteTarget();
    if (!target) return this.eur(0);
    return this.eur(+(target.amount || 0));
  }
}