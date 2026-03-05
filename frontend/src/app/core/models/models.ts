export type Theme = 'dark' | 'light';

export interface User {
  id:          number;
  name:        string;
  email:       string;
  currency:    string;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user:  User;
}

export interface Category {
  id?:        number;
  user_id?:   number;
  name:       string;
  icon:       string;
  color:      string;
  type:       'expense' | 'income';
  is_default?: boolean;
}

export interface Expense {
  id?:             number;
  user_id?:        number;
  category_id?:    number | null;
  amount:          number;
  description?:    string;
  type:            'expense' | 'income';
  date:            string;
  created_at?:     string;
  updated_at?:     string;
  category_name?:  string;
  category_icon?:  string;
  category_color?: string;
}

export interface ExpensePage {
  data:   Expense[];
  total:  number;
  limit:  number;
  offset: number;
}

export interface ExpenseFilters {
  month?:       number;
  year?:        number;
  type?:        string;
  category_id?: number;
  search?:      string;
  limit?:       number;
  offset?:      number;
}

export interface Budget {
  id?:            number;
  user_id?:       number;
  category_id:    number;
  amount:         number;
  month?:         number;
  year?:          number;
  category_name?: string;
  icon?:          string;
  color?:         string;
  spent?:         number;
}

export interface DashboardSummary {
  kpi: {
    total_income:    string;
    total_expenses:  string;
    balance:         string;
    total_balance:   string;
  };
  byCategory:         { name: string; icon: string; color: string; total: string }[];
  monthly:            { period: string; income: string; expenses: string }[];
  daily30:            { day: string; income: string; expenses: string }[];
  recentTransactions: Expense[];
}