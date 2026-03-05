import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import {
  ExpenseService,
  CategoryService,
  BudgetService,
  DashboardService,
} from './api.services';

const API = 'http://localhost:3000/api';

function makeHttp() {
  return {
    get:    vi.fn().mockReturnValue(of({})),
    post:   vi.fn().mockReturnValue(of({})),
    put:    vi.fn().mockReturnValue(of({})),
    delete: vi.fn().mockReturnValue(of({})),
  } as unknown as HttpClient;
}

const MOCK_PAGE = {
  data:   [{ id: 1, amount: 50, type: 'expense', date: '2026-03-01' }],
  total:  1,
  limit:  20,
  offset: 0,
};

const MOCK_EXPENSE = { id: 1, amount: 50, type: 'expense', date: '2026-03-01' };

const MOCK_CAT = {
  id:    1,
  name:  'Alimentación',
  icon:  '🛒',
  color: '#7c6cf8',
  type:  'expense',
};

const MOCK_BUDGET = {
  id:          1,
  category_id: 1,
  amount:      500,
  month:       3,
  year:        2026,
  spent:       200,
};

describe('ExpenseService', () => {
  let svc:  ExpenseService;
  let http: ReturnType<typeof makeHttp>;

  beforeEach(() => {
    http = makeHttp();
    (http.get    as any).mockReturnValue(of(MOCK_PAGE));
    (http.post   as any).mockReturnValue(of(MOCK_EXPENSE));
    (http.put    as any).mockReturnValue(of(MOCK_EXPENSE));
    (http.delete as any).mockReturnValue(of({ message: 'Eliminado' }));
    svc = new ExpenseService(http);
  });

  it('should be created', () => expect(svc).toBeTruthy());

  it('getAll() calls GET /expenses', () => {
    svc.getAll({ month: 3, year: 2026 }).subscribe(res => {
      expect(res.total).toBe(1);
    });
    expect(http.get).toHaveBeenCalledWith(API + '/expenses', expect.any(Object));
  });

  it('getAll() omits empty filters from params', () => {
    svc.getAll({ type: '', search: '' }).subscribe();
    const callArgs = (http.get as any).mock.calls[0];
    const options  = callArgs[1];
    expect(options.params.has('type')).toBe(false);
    expect(options.params.has('search')).toBe(false);
  });

  it('getById() calls GET /expenses/:id', () => {
    (http.get as any).mockReturnValueOnce(of(MOCK_EXPENSE));
    svc.getById(1).subscribe(e => {
      expect(e.id).toBe(1);
    });
    expect(http.get).toHaveBeenCalledWith(API + '/expenses/1');
  });

  it('create() calls POST /expenses', () => {
    svc.create({ amount: 50, type: 'expense', date: '2026-03-01' }).subscribe();
    expect(http.post).toHaveBeenCalledWith(
      API + '/expenses',
      expect.objectContaining({ amount: 50 }),
    );
  });

  it('update() calls PUT /expenses/:id', () => {
    svc.update(1, { description: 'Editado' }).subscribe();
    expect(http.put).toHaveBeenCalledWith(API + '/expenses/1', { description: 'Editado' });
  });

  it('delete() calls DELETE /expenses/:id', () => {
    svc.delete(1).subscribe();
    expect(http.delete).toHaveBeenCalledWith(API + '/expenses/1');
  });
});

describe('CategoryService', () => {
  let svc:  CategoryService;
  let http: ReturnType<typeof makeHttp>;

  beforeEach(() => {
    http = makeHttp();
    (http.get    as any).mockReturnValue(of([MOCK_CAT]));
    (http.post   as any).mockReturnValue(of(MOCK_CAT));
    (http.put    as any).mockReturnValue(of(MOCK_CAT));
    (http.delete as any).mockReturnValue(of({ message: 'Eliminada' }));
    svc = new CategoryService(http);
  });

  it('should be created', () => expect(svc).toBeTruthy());

  it('getAll() calls GET /categories', () => {
    svc.getAll().subscribe(cats => {
      expect(cats[0].name).toBe('Alimentación');
    });
    expect(http.get).toHaveBeenCalledWith(API + '/categories', expect.any(Object));
  });

  it('getAll(type) passes type as param', () => {
    svc.getAll('expense').subscribe();
    const callArgs = (http.get as any).mock.calls[0];
    const options  = callArgs[1];
    expect(options.params.get('type')).toBe('expense');
  });

  it('create() calls POST /categories', () => {
    svc.create({ name: 'Test', icon: '🎯', color: '#f00', type: 'expense' }).subscribe();
    expect(http.post).toHaveBeenCalledWith(
      API + '/categories',
      expect.objectContaining({ name: 'Test' }),
    );
  });

  it('update() calls PUT /categories/:id', () => {
    svc.update(1, { name: 'Nuevo' }).subscribe();
    expect(http.put).toHaveBeenCalledWith(API + '/categories/1', { name: 'Nuevo' });
  });

  it('delete() calls DELETE /categories/:id', () => {
    svc.delete(5).subscribe();
    expect(http.delete).toHaveBeenCalledWith(API + '/categories/5');
  });
});

describe('BudgetService', () => {
  let svc:  BudgetService;
  let http: ReturnType<typeof makeHttp>;

  beforeEach(() => {
    http = makeHttp();
    (http.get    as any).mockReturnValue(of([MOCK_BUDGET]));
    (http.post   as any).mockReturnValue(of(MOCK_BUDGET));
    (http.delete as any).mockReturnValue(of({ message: 'Eliminado' }));
    svc = new BudgetService(http);
  });

  it('should be created', () => expect(svc).toBeTruthy());

  it('getAll() passes month and year', () => {
    svc.getAll(3, 2026).subscribe(b => {
      expect(b[0].id).toBe(1);
    });
    const callArgs = (http.get as any).mock.calls[0];
    const options  = callArgs[1];
    expect(options.params.get('month')).toBe('3');
    expect(options.params.get('year')).toBe('2026');
  });

  it('upsert() calls POST /budgets', () => {
    svc.upsert({ category_id: 1, amount: 500, month: 3, year: 2026 }).subscribe();
    expect(http.post).toHaveBeenCalledWith(
      API + '/budgets',
      expect.objectContaining({ amount: 500 }),
    );
  });

  it('delete() calls DELETE /budgets/:id', () => {
    svc.delete(1).subscribe();
    expect(http.delete).toHaveBeenCalledWith(API + '/budgets/1');
  });
});

describe('DashboardService', () => {
  let svc:  DashboardService;
  let http: ReturnType<typeof makeHttp>;

  beforeEach(() => {
    http = makeHttp();
    (http.get as any).mockReturnValue(of({
      kpi:                {},
      byCategory:         [],
      monthly:            [],
      daily30:            [],
      recentTransactions: [],
    }));
    svc = new DashboardService(http);
  });

  it('should be created', () => expect(svc).toBeTruthy());

  it('getSummary() calls GET /dashboard/summary with params', () => {
    svc.getSummary(3, 2026).subscribe();
    const callArgs = (http.get as any).mock.calls[0];
    const options  = callArgs[1];
    expect(options.params.get('month')).toBe('3');
    expect(options.params.get('year')).toBe('2026');
  });
});