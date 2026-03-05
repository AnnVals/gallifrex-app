import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { CategoriesComponent } from './categories.component';
import type { CategoryService }    from '../../core/services/api.services';
import type { TranslationService } from '../../core/services/translation.service';
import type { CurrencyService }    from '../../core/services/currency.service';
import * as CsvExport from '../../core/utils/csv-export.util';

const CATS = [
  { id: 1, name: 'Alimentación', icon: '🛒', color: '#7c6cf8', type: 'expense' as const, is_default: true  },
  { id: 2, name: 'Ocio',         icon: '🎉', color: '#f857a6', type: 'expense' as const, is_default: false },
  { id: 3, name: 'Nómina',       icon: '💼', color: '#0de7a8', type: 'income'  as const, is_default: true  },
];

function makeComp() {
  const categoryService = {
    getAll: vi.fn().mockReturnValue(of(CATS)),
    create: vi.fn().mockReturnValue(of(CATS[1])),
    update: vi.fn().mockReturnValue(of(CATS[0])),
    delete: vi.fn().mockReturnValue(of({ message: 'Eliminada' })),
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

  const component = new CategoriesComponent(categoryService, translation, currencyService);
  return { component, categoryService };
}

describe('CategoriesComponent', () => {
  let component:       CategoriesComponent;
  let categoryService: any;

  beforeEach(() => {
    const mocks     = makeComp();
    component       = mocks.component;
    categoryService = mocks.categoryService;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('loads all categories', () => {
      component.ngOnInit();
      expect(component.categories().length).toBe(3);
    });

    it('shows all categories by default with no filter', () => {
      component.ngOnInit();
      expect(component.filtered().length).toBe(3);
    });
  });

  describe('setFilter', () => {
    beforeEach(() => component.ngOnInit());

    it('filters to expense type only', () => {
      component.setFilter('expense');
      expect(component.filtered().every(c => c.type === 'expense')).toBe(true);
      expect(component.filtered().length).toBe(2);
    });

    it('filters to income type only', () => {
      component.setFilter('income');
      expect(component.filtered().length).toBe(1);
    });

    it('shows all categories when filter is cleared', () => {
      component.setFilter('expense');
      component.setFilter('');
      expect(component.filtered().length).toBe(3);
    });
  });

  describe('openModal', () => {
    it('opens in create mode with default values', () => {
      component.openModal();
      expect(component.editingId()).toBeNull();
      expect(component.form.name).toBe('');
      expect(component.form.icon).toBe('📁');
      expect(component.showModal()).toBe(true);
    });

    it('opens in edit mode with the category data', () => {
      component.openModal(CATS[0] as any);
      expect(component.editingId()).toBe(1);
      expect(component.form.name).toBe('Alimentación');
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
    it('shows error when name is empty', () => {
      component.form = { name: '   ', icon: '📁', color: '#aaa', type: 'expense' };
      component.submit();
      expect(component.formError()).toBeTruthy();
      expect(categoryService.create).not.toHaveBeenCalled();
    });

    it('calls create when editingId is null', () => {
      component.editingId.set(null);
      component.form = { name: 'Nueva', icon: '🎯', color: '#aaa', type: 'expense' };
      component.submit();
      expect(categoryService.create).toHaveBeenCalled();
    });

    it('calls update when editingId is set', () => {
      component.editingId.set(1);
      component.form = { name: 'Editada', icon: '📁', color: '#aaa', type: 'expense' };
      component.submit();
      expect(categoryService.update).toHaveBeenCalledWith(1, component.form);
    });

    it('sets formError on API failure during create', () => {
      categoryService.create.mockReturnValueOnce(throwError(() => ({ error: { error: 'Nombre duplicado' } })));
      component.editingId.set(null);
      component.form = { name: 'Test', icon: '📁', color: '#aaa', type: 'expense' };
      component.submit();
      expect(component.formError()).toBe('Nombre duplicado');
    });

    it('closes modal on successful submit', () => {
      component.editingId.set(null);
      component.form = { name: 'Nueva', icon: '🎯', color: '#aaa', type: 'expense' };
      component.showModal.set(true);
      component.submit();
      expect(component.showModal()).toBe(false);
    });
  });

  describe('confirmDeleteCategory and doDelete', () => {
    it('does not set deleteTarget for default categories', () => {
      component.confirmDeleteCategory(CATS[0] as any);
      expect(component.deleteTarget()).toBeNull();
    });

    it('sets deleteTarget for non-default categories', () => {
      component.confirmDeleteCategory(CATS[1] as any);
      expect(component.deleteTarget()).toEqual(CATS[1]);
    });

    it('calls delete service and clears target on doDelete', () => {
      component.deleteTarget.set(CATS[1] as any);
      component.doDelete();
      expect(categoryService.delete).toHaveBeenCalledWith(2);
      expect(component.deleteTarget()).toBeNull();
    });

    it('does not call delete when deleteTarget is null', () => {
      component.doDelete();
      expect(categoryService.delete).not.toHaveBeenCalled();
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
});