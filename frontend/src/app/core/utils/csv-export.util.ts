import { Expense, Budget, Category } from '../models/models';

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number;
}

export function exportToCsv<T>(
  filename: string,
  rows: T[],
  columns: CsvColumn<T>[]
): void {
  if (!rows.length) {
    return;
  }

  const escape = (val: string | number): string => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const headerRow = columns.map(c => escape(c.header)).join(',');

  const dataRows: string[] = [];
  for (const row of rows) {
    const cells = columns.map(c => escape(c.value(row)));
    dataRows.push(cells.join(','));
  }

  const csvContent = [headerRow, ...dataRows].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename + '.csv');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const EXPENSE_COLUMNS: CsvColumn<Expense>[] = [
  {
    header: 'ID',
    value: function(e: Expense): string | number {
      if (e.id !== undefined && e.id !== null) {
        return e.id;
      }
      return '';
    },
  },
  {
    header: 'Fecha',
    value: function(e: Expense): string {
      return e.date;
    },
  },
  {
    header: 'Tipo',
    value: function(e: Expense): string {
      if (e.type === 'income') {
        return 'Ingreso';
      }
      return 'Gasto';
    },
  },
  {
    header: 'Importe',
    value: function(e: Expense): number {
      return +e.amount;
    },
  },
  {
    header: 'Descripción',
    value: function(e: Expense): string {
      if (e.description !== undefined && e.description !== null) {
        return e.description;
      }
      return '';
    },
  },
  {
    header: 'Categoría',
    value: function(e: Expense): string {
      if (e.category_name !== undefined && e.category_name !== null) {
        return e.category_name;
      }
      return '';
    },
  },
  {
    header: 'Color',
    value: function(e: Expense): string {
      if (e.category_color !== undefined && e.category_color !== null) {
        return e.category_color;
      }
      return '';
    },
  },
];

export const BUDGET_COLUMNS: CsvColumn<Budget>[] = [
  {
    header: 'ID',
    value: function(b: Budget): string | number {
      if (b.id !== undefined && b.id !== null) {
        return b.id;
      }
      return '';
    },
  },
  {
    header: 'Categoría',
    value: function(b: Budget): string {
      if (b.category_name !== undefined && b.category_name !== null) {
        return b.category_name;
      }
      return '';
    },
  },
  {
    header: 'Presupuesto',
    value: function(b: Budget): number {
      return +b.amount;
    },
  },
  {
    header: 'Gastado',
    value: function(b: Budget): number {
      return +(b.spent ?? 0);
    },
  },
  {
    header: 'Restante',
    value: function(b: Budget): number {
      return +b.amount - +(b.spent ?? 0);
    },
  },
  {
    header: '% Utilizado',
    value: function(b: Budget): number {
      if (b.amount > 0) {
        return Math.round((+(b.spent ?? 0) / +b.amount) * 100);
      }
      return 0;
    },
  },
  {
    header: 'Mes',
    value: function(b: Budget): string | number {
      if (b.month !== undefined && b.month !== null) {
        return b.month;
      }
      return '';
    },
  },
  {
    header: 'Año',
    value: function(b: Budget): string | number {
      if (b.year !== undefined && b.year !== null) {
        return b.year;
      }
      return '';
    },
  },
];

export const CATEGORY_COLUMNS: CsvColumn<Category>[] = [
  {
    header: 'ID',
    value: function(c: Category): string | number {
      if (c.id !== undefined && c.id !== null) {
        return c.id;
      }
      return '';
    },
  },
  {
    header: 'Nombre',
    value: function(c: Category): string {
      return c.name;
    },
  },
  {
    header: 'Tipo',
    value: function(c: Category): string {
      if (c.type === 'income') {
        return 'Ingreso';
      }
      return 'Gasto';
    },
  },
  {
    header: 'Icono',
    value: function(c: Category): string {
      return c.icon;
    },
  },
  {
    header: 'Color',
    value: function(c: Category): string {
      return c.color;
    },
  },
  {
    header: 'Por defecto',
    value: function(c: Category): string {
      if (c.is_default) {
        return 'Sí';
      }
      return 'No';
    },
  },
];