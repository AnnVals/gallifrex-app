import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { ExpensesComponent } from './expenses.component';
import type { ExpenseService, CategoryService } from '../../core/services/api.services';
import type { TranslationService }              from '../../core/services/translation.service';
import type { CurrencyService }                 from '../../core/services/currency.service';
import * as CsvExport from '../../core/utils/csv-export.util';

const EXPENSES = [
  { id: 1, amount: 50,   type: 'expense' as const, date: '2026-03-01', description: 'Mercadona', category_name: 'Alimentación', category_color: '#7c6cf8' },
  { id: 2, amount: 1500, type: 'income'  as const, date: '2026-03-05', description: 'Nómina',    category_name: 'Trabajo',      category_color: '#0de7a8' },
];

const CATS = [
  { id: 1, name: 'Alimentación', icon: '🛒', color: '#7c6cf8', type: 'expense' as const },
];

function makeComp() {
  const expenseService = {
    getAll: vi.fn().mockReturnValue(of({ data: EXPENSES, total: 2, limit: 20, offset: 0 })),
    create: vi.fn().mockReturnValue(of(EXPENSES[0])),
    update: vi.fn().mockReturnValue(of(EXPENSES[0])),
    delete: vi.fn().mockReturnValue(of({ message: 'Eliminado' })),
  } as unknown as ExpenseService;

  const categoryService = {
    getAll: vi.fn().mockReturnValue(of(CATS)),
  } as unknown as CategoryService;

  const translation = {
    t:       (key: string) => key,
    current: vi.fn().mockReturnValue('es'),
    langs:   [],
  } as unknown as TranslationService;

  const currencyService = {
    format:     (value: number) => value.toFixed(2) + ' €',
    convert:    (value: number) => value,
    current:    vi.fn().mockReturnValue({ code: 'EUR', symbol: '€', flag: '🇪🇺', label: 'EUR' }),
    currencies: [],
    loading:    vi.fn().mockReturnValue(false),
  } as unknown as CurrencyService;

  const component = new ExpensesComponent(expenseService, categoryService, translation, currencyService);
  return { component, expenseService, categoryService };
}

describe('ExpensesComponent', () => {
  let component:       ExpensesComponent;
  let expenseService:  any;
  let categoryService: any;

  beforeEach(() => {
    const mocks       = makeComp();
    component         = mocks.component;
    expenseService    = mocks.expenseService;
    categoryService   = mocks.categoryService;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('loads categories on init', () => {
      component.ngOnInit();
      expect(categoryService.getAll).toHaveBeenCalled();
    });

    it('loads expenses on init', () => {
      component.ngOnInit();
      expect(component.expenses().length).toBe(2);
    });

    it('sets loading to false after load', () => {
      component.ngOnInit();
      expect(component.loading()).toBe(false);
    });

    it('sets total correctly', () => {
      component.ngOnInit();
      expect(component.total()).toBe(2);
    });
  });

  describe('computed signals', () => {
    beforeEach(() => component.ngOnInit());

    it('totalIncome sums only income rows', () => {
      expect(component.totalIncome()).toBe(1500);
    });

    it('totalExpenseAmt sums only expense rows', () => {
      expect(component.totalExpenseAmt()).toBe(50);
    });

    it('filteredCategories filters by current form type', () => {
      component.form.type = 'expense';
      const result = component.filteredCategories();
      expect(result.every(c => c.type === 'expense')).toBe(true);
    });
  });

  describe('openModal', () => {
    it('opens in create mode when no expense is passed', () => {
      component.openModal();
      expect(component.showModal()).toBe(true);
      expect(component.editingId()).toBeNull();
    });

    it('opens in edit mode with the expense data', () => {
      component.openModal(EXPENSES[0] as any);
      expect(component.editingId()).toBe(1);
      expect(component.form.description).toBe('Mercadona');
    });
  });

  describe('closeModal', () => {
    it('sets showModal to false', () => {
      component.openModal();
      component.closeModal();
      expect(component.showModal()).toBe(false);
    });
  });

  describe('submit', () => {
    it('shows error when amount is 0', () => {
      component.form = { type: 'expense', amount: 0, date: '2026-03-01' } as any;
      component.submit();
      expect(component.formError()).toBeTruthy();
      expect(expenseService.create).not.toHaveBeenCalled();
    });

    it('shows error when date is empty', () => {
      component.form = { type: 'expense', amount: 50, date: '' } as any;
      component.submit();
      expect(component.formError()).toBeTruthy();
    });

    it('calls create when editingId is null', () => {
      component.editingId.set(null);
      component.form = { type: 'expense', amount: 50, date: '2026-03-01' } as any;
      component.submit();
      expect(expenseService.create).toHaveBeenCalled();
    });

    it('calls update when editingId is set', () => {
      component.editingId.set(1);
      component.form = { type: 'expense', amount: 50, date: '2026-03-01', description: '', category_id: null } as any;
      component.submit();
      expect(expenseService.update).toHaveBeenCalledWith(1, {
        type:        'expense',
        amount:      50,
        date:        '2026-03-01',
        description: '',
        category_id: null,
      });
    });

    it('closes modal on successful submit', () => {
      component.editingId.set(null);
      component.form = { type: 'expense', amount: 50, date: '2026-03-01' } as any;
      component.showModal.set(true);
      component.submit();
      expect(component.showModal()).toBe(false);
    });

    it('sets formError on API failure', () => {
      expenseService.create.mockReturnValueOnce(throwError(() => ({ error: { error: 'Error servidor' } })));
      component.editingId.set(null);
      component.form = { type: 'expense', amount: 50, date: '2026-03-01' } as any;
      component.submit();
      expect(component.formError()).toBe('Error servidor');
    });
  });

  describe('confirmDelete and doDelete', () => {
    it('sets deleteTarget on confirmDelete', () => {
      component.confirmDelete(EXPENSES[0] as any);
      expect(component.deleteTarget()).toEqual(EXPENSES[0]);
    });

    it('calls delete service and clears target on doDelete', () => {
      component.deleteTarget.set(EXPENSES[0] as any);
      component.doDelete();
      expect(expenseService.delete).toHaveBeenCalledWith(1);
      expect(component.deleteTarget()).toBeNull();
    });

    it('does not call delete when deleteTarget is null', () => {
      component.doDelete();
      expect(expenseService.delete).not.toHaveBeenCalled();
    });
  });

  describe('pagination', () => {
    it('prevPage decrements page by 1', () => {
      component.page.set(2);
      component.prevPage();
      expect(component.page()).toBe(1);
    });

    it('prevPage does not go below 0', () => {
      component.page.set(0);
      component.prevPage();
      expect(component.page()).toBe(0);
    });

    it('nextPage increments page when not on last page', () => {
      expenseService.getAll.mockReturnValue(of({ data: EXPENSES, total: 100, limit: 20, offset: 0 }));
      component.ngOnInit();
      component.page.set(0);
      component.nextPage();
      expect(component.page()).toBe(1);
    });
  });

  describe('clearFilters', () => {
    it('resets type and search filters and resets page to 0', () => {
      component.filters.type   = 'expense';
      component.filters.search = 'test';
      component.page.set(3);
      component.clearFilters();
      expect(component.filters.type).toBe('');
      expect(component.filters.search).toBe('');
      expect(component.page()).toBe(0);
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
      expect(component.eur(1500)).toContain('€');
    });

    it('handles 0 without throwing', () => {
      expect(() => component.eur(0)).not.toThrow();
    });
  });
});