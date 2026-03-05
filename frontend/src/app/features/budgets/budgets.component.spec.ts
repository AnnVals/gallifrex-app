import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { BudgetsComponent } from './budgets.component';
import type { BudgetService, CategoryService } from '../../core/services/api.services';
import type { TranslationService }             from '../../core/services/translation.service';
import type { CurrencyService }                from '../../core/services/currency.service';
import * as CsvExport from '../../core/utils/csv-export.util';

const BUDGETS = [
  { id: 1, category_id: 1, amount: 500, month: 3, year: 2026, category_name: 'Alimentación', icon: '🛒', color: '#7c6cf8', spent: 200 },
  { id: 2, category_id: 2, amount: 200, month: 3, year: 2026, category_name: 'Ocio',          icon: '🎉', color: '#f857a6', spent: 250 },
];

const CATS = [
  { id: 1, name: 'Alimentación', icon: '🛒', color: '#7c6cf8', type: 'expense' as const },
  { id: 3, name: 'Nómina',       icon: '💼', color: '#0de7a8', type: 'income'  as const },
];

function makeComp() {
  const budgetService = {
    getAll: vi.fn().mockReturnValue(of(BUDGETS)),
    upsert: vi.fn().mockReturnValue(of(BUDGETS[0])),
    delete: vi.fn().mockReturnValue(of({})),
  } as unknown as BudgetService;

  const categoryService = {
    getAll: vi.fn().mockReturnValue(of(CATS)),
  } as unknown as CategoryService;

  const translation = {
    t:       (key: string) => key,
    current: vi.fn().mockReturnValue('es'),
    langs:   [],
  } as unknown as TranslationService;

  const currencyService = {
    format:  (value: number) => value.toFixed(2) + ' €',
    current: vi.fn().mockReturnValue({ code: 'EUR', symbol: '€' }),
  } as unknown as CurrencyService;

  const component = new BudgetsComponent(budgetService, categoryService, translation, currencyService);
  return { component, budgetService, categoryService };
}

describe('BudgetsComponent', () => {
  let component:     BudgetsComponent;
  let budgetService: any;

  beforeEach(() => {
    const mocks    = makeComp();
    component      = mocks.component;
    budgetService  = mocks.budgetService;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('loads budgets on init', () => {
      component.ngOnInit();
      expect(component.budgets().length).toBe(2);
    });

    it('sets loading to false after load', () => {
      component.ngOnInit();
      expect(component.loading()).toBe(false);
    });
  });

  describe('computed signals', () => {
    beforeEach(() => component.ngOnInit());

    it('totalBudget sums all budget amounts (500 + 200 = 700)', () => {
      expect(component.totalBudget()).toBe(700);
    });

    it('totalSpent sums all spent amounts (200 + 250 = 450)', () => {
      expect(component.totalSpent()).toBe(450);
    });

    it('remaining equals totalBudget minus totalSpent (700 - 450 = 250)', () => {
      expect(component.remaining()).toBe(250);
    });

    it('pctUsed equals totalSpent divided by totalBudget times 100', () => {
      expect(component.pctUsed()).toBeCloseTo(64.28, 1);
    });

    it('expenseCats excludes income type categories', () => {
      expect(component.expenseCats().every(c => c.type === 'expense')).toBe(true);
      expect(component.expenseCats().length).toBe(1);
    });
  });

  describe('pct()', () => {
    it('returns 40 percent for 200 spent of 500 budget', () => {
      expect(component.pct(BUDGETS[0] as any)).toBeCloseTo(40, 1);
    });

    it('caps at 100 when spent exceeds budget', () => {
      expect(component.pct(BUDGETS[1] as any)).toBe(100);
    });
  });

  describe('barColor()', () => {
    it('returns red when spent is greater than budget', () => {
      expect(component.barColor(BUDGETS[1] as any)).toBe('var(--red)');
    });

    it('returns yellow when spent is above 80 percent', () => {
      const nearLimitBudget = { ...BUDGETS[0], spent: 420 };
      expect(component.barColor(nearLimitBudget as any)).toBe('#ffd166');
    });

    it('returns the category color when within budget', () => {
      expect(component.barColor(BUDGETS[0] as any)).toBe('#7c6cf8');
    });
  });

  describe('openModal', () => {
    it('opens in create mode with null editingId', () => {
      component.openModal();
      expect(component.editingId()).toBeNull();
      expect(component.showModal()).toBe(true);
    });

    it('opens in edit mode with budget data', () => {
      component.openModal(BUDGETS[0] as any);
      expect(component.editingId()).toBe(1);
      expect(component.form.amount).toBe(500);
    });
  });

  describe('submit', () => {
    it('shows error when no category is selected', () => {
      component.form = { amount: 500, category_id: undefined };
      component.submit();
      expect(component.formError()).toBeTruthy();
      expect(budgetService.upsert).not.toHaveBeenCalled();
    });

    it('shows error when amount is 0', () => {
      component.form = { amount: 0, category_id: 1 };
      component.submit();
      expect(component.formError()).toBeTruthy();
    });

    it('calls upsert with selectedMonth and selectedYear', () => {
      component.form = { amount: 300, category_id: 1 };
      component.submit();
      expect(budgetService.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ month: component.selectedMonth, year: component.selectedYear })
      );
    });

    it('sets formError on API failure', () => {
      budgetService.upsert.mockReturnValueOnce(throwError(() => ({ error: { error: 'Error BD' } })));
      component.form = { amount: 300, category_id: 1 };
      component.submit();
      expect(component.formError()).toBe('Error BD');
    });

    it('closes modal on successful submit', () => {
      component.form = { amount: 300, category_id: 1 };
      component.showModal.set(true);
      component.submit();
      expect(component.showModal()).toBe(false);
    });
  });

  describe('confirmDelete and doDelete', () => {
    it('sets deleteTarget on confirmDelete', () => {
      component.confirmDelete(BUDGETS[0] as any);
      expect(component.deleteTarget()).toEqual(BUDGETS[0]);
    });

    it('calls delete service and clears target on doDelete', () => {
      component.deleteTarget.set(BUDGETS[0] as any);
      component.doDelete();
      expect(budgetService.delete).toHaveBeenCalledWith(1);
      expect(component.deleteTarget()).toBeNull();
    });

    it('does not call delete when deleteTarget is null', () => {
      component.doDelete();
      expect(budgetService.delete).not.toHaveBeenCalled();
    });
  });

  describe('exportCsv', () => {
    it('calls exportToCsv utility function', () => {
      component.ngOnInit();
      const exportSpy = vi.spyOn(CsvExport, 'exportToCsv').mockImplementation(() => {});
      component.exportCsv();
      expect(exportSpy).toHaveBeenCalled();
    });
  });

  describe('eur', () => {
    it('formats number with euro symbol', () => {
      expect(component.eur(500)).toContain('€');
    });
  });
});