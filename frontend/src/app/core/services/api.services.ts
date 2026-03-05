import { Injectable }                   from '@angular/core';
import { HttpClient, HttpParams }       from '@angular/common/http';
import { Observable }                   from 'rxjs';
import { environment }                  from '../../../environments/environment';
import {
  Expense, ExpensePage, ExpenseFilters,
  Category,
  Budget,
  DashboardSummary,
} from '../models/models';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class ExpenseService {

  constructor(private http: HttpClient) {}

  getAll(filters?: ExpenseFilters): Observable<ExpensePage> {
    let params = new HttpParams();

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, String(value));
        }
      }
    }

    return this.http.get<ExpensePage>(API + '/expenses', { params });
  }

  getById(id: number): Observable<Expense> {
    return this.http.get<Expense>(API + '/expenses/' + id);
  }

  create(expense: Partial<Expense>): Observable<Expense> {
    return this.http.post<Expense>(API + '/expenses', expense);
  }

  update(id: number, expense: Partial<Expense>): Observable<Expense> {
    return this.http.put<Expense>(API + '/expenses/' + id, expense);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(API + '/expenses/' + id);
  }
}

@Injectable({ providedIn: 'root' })
export class CategoryService {

  constructor(private http: HttpClient) {}

  getAll(type?: string): Observable<Category[]> {
    let params = new HttpParams();

    if (type) {
      params = params.set('type', type);
    }

    return this.http.get<Category[]>(API + '/categories', { params });
  }

  create(category: Partial<Category>): Observable<Category> {
    return this.http.post<Category>(API + '/categories', category);
  }

  update(id: number, category: Partial<Category>): Observable<Category> {
    return this.http.put<Category>(API + '/categories/' + id, category);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(API + '/categories/' + id);
  }
}

@Injectable({ providedIn: 'root' })
export class BudgetService {

  constructor(private http: HttpClient) {}

  getAll(month?: number, year?: number): Observable<Budget[]> {
    let params = new HttpParams();

    if (month) {
      params = params.set('month', month);
    }
    if (year) {
      params = params.set('year', year);
    }

    return this.http.get<Budget[]>(API + '/budgets', { params });
  }

  upsert(budget: Partial<Budget>): Observable<Budget> {
    return this.http.post<Budget>(API + '/budgets', budget);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(API + '/budgets/' + id);
  }
}

@Injectable({ providedIn: 'root' })
export class DashboardService {

  constructor(private http: HttpClient) {}

  getSummary(month?: number, year?: number): Observable<DashboardSummary> {
    let params = new HttpParams();

    if (month) {
      params = params.set('month', month);
    }
    if (year) {
      params = params.set('year', year);
    }

    return this.http.get<DashboardSummary>(API + '/dashboard/summary', { params });
  }
}