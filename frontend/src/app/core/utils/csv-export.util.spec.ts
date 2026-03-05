import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  exportToCsv, EXPENSE_COLUMNS, BUDGET_COLUMNS, CATEGORY_COLUMNS
} from './csv-export.util';
import type { Expense, Budget, Category } from '../models/models';

const mockClick  = vi.fn();
const mockAppend = vi.fn();
const mockRemove = vi.fn();
const mockLink   = { setAttribute: vi.fn(), click: mockClick, style: { display: '' } };

beforeEach(() => {
  vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
  vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppend);
  vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemove);
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  mockClick.mockClear();
  mockLink.setAttribute.mockClear();
  mockAppend.mockClear();
  mockRemove.mockClear();
});

const EXPENSES: Expense[] = [
  {
    id:             1,
    amount:         45.50,
    type:           'expense',
    date:           '2026-03-01',
    description:    'Mercadona',
    category_name:  'Alimentación',
    category_color: '#7c6cf8',
  },
  {
    id:             2,
    amount:         1500,
    type:           'income',
    date:           '2026-03-05',
    description:    'Nómina',
    category_name:  'Trabajo',
    category_color: '#0de7a8',
  },
];

const BUDGETS: Budget[] = [
  {
    id:            1,
    category_id:   1,
    amount:        500,
    month:         3,
    year:          2026,
    category_name: 'Alimentación',
    spent:         200,
  },
];

const CATEGORIES: Category[] = [
  {
    id:         1,
    name:       'Alimentación',
    icon:       '🛒',
    color:      '#7c6cf8',
    type:       'expense',
    is_default: true,
  },
];

describe('exportToCsv()', () => {
  it('should not trigger download when rows is empty', () => {
    exportToCsv('test', [], EXPENSE_COLUMNS);
    expect(mockClick).not.toHaveBeenCalled();
  });

  it('should trigger a download click when rows are provided', () => {
    exportToCsv('gastos', EXPENSES, EXPENSE_COLUMNS);
    expect(mockClick).toHaveBeenCalledOnce();
  });

  it('should set correct filename on the link', () => {
    exportToCsv('mis-gastos', EXPENSES, EXPENSE_COLUMNS);
    expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'mis-gastos.csv');
  });

  it('should set href to the blob URL', () => {
    exportToCsv('test', EXPENSES, EXPENSE_COLUMNS);
    expect(mockLink.setAttribute).toHaveBeenCalledWith('href', 'blob:mock-url');
  });

  it('should append and then remove link from DOM', () => {
    exportToCsv('test', EXPENSES, EXPENSE_COLUMNS);
    expect(mockAppend).toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalled();
  });

  it('should revoke the object URL after download', () => {
    exportToCsv('test', EXPENSES, EXPENSE_COLUMNS);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});

describe('EXPENSE_COLUMNS', () => {
  const expenseRow = EXPENSES[0];
  const incomeRow  = EXPENSES[1];

  it('should include all required headers', () => {
    const headers = EXPENSE_COLUMNS.map(c => c.header);
    expect(headers).toContain('ID');
    expect(headers).toContain('Fecha');
    expect(headers).toContain('Tipo');
    expect(headers).toContain('Importe');
    expect(headers).toContain('Descripción');
    expect(headers).toContain('Categoría');
  });

  it('should map expense type to Gasto', () => {
    const typeColumn = EXPENSE_COLUMNS.find(c => c.header === 'Tipo')!;
    expect(typeColumn.value(expenseRow)).toBe('Gasto');
  });

  it('should map income type to Ingreso', () => {
    const typeColumn = EXPENSE_COLUMNS.find(c => c.header === 'Tipo')!;
    expect(typeColumn.value(incomeRow)).toBe('Ingreso');
  });

  it('should return description value', () => {
    const descriptionColumn = EXPENSE_COLUMNS.find(c => c.header === 'Descripción')!;
    expect(descriptionColumn.value(expenseRow)).toBe('Mercadona');
  });

  it('should return numeric amount', () => {
    const amountColumn = EXPENSE_COLUMNS.find(c => c.header === 'Importe')!;
    expect(amountColumn.value(expenseRow)).toBe(45.50);
  });
});

describe('BUDGET_COLUMNS', () => {
  const budgetRow = BUDGETS[0];

  it('should calculate remaining correctly (500 - 200 = 300)', () => {
    const remainingColumn = BUDGET_COLUMNS.find(c => c.header === 'Restante')!;
    expect(remainingColumn.value(budgetRow)).toBe(300);
  });

  it('should calculate percentage used correctly (200/500 = 40%)', () => {
    const percentageColumn = BUDGET_COLUMNS.find(c => c.header === '% Utilizado')!;
    expect(percentageColumn.value(budgetRow)).toBe(40);
  });
});

describe('CATEGORY_COLUMNS', () => {
  it('should map is_default true to Si', () => {
    const defaultColumn = CATEGORY_COLUMNS.find(c => c.header === 'Por defecto')!;
    expect(defaultColumn.value(CATEGORIES[0])).toBe('Sí');
  });

  it('should map is_default false to No', () => {
    const defaultColumn      = CATEGORY_COLUMNS.find(c => c.header === 'Por defecto')!;
    const nonDefaultCategory = { ...CATEGORIES[0], is_default: false };
    expect(defaultColumn.value(nonDefaultCategory)).toBe('No');
  });
});