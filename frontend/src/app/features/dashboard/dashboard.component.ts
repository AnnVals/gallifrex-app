import { Component, OnInit, ViewChild, ElementRef, signal, computed, effect } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { RouterLink }    from '@angular/router';
import { FormsModule }   from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { DashboardService, ExpenseService, CategoryService } from '../../core/services/api.services';
import { AuthService }        from '../../core/services/auth.service';
import { ThemeService }       from '../../core/services/theme.service';
import { TranslationService } from '../../core/services/translation.service';
import { CurrencyService }    from '../../core/services/currency.service';
import { DashboardSummary, Category } from '../../core/models/models';

Chart.register(...registerables);

@Component({
  selector:    'app-dashboard',
  standalone:  true,
  imports:     [CommonModule, RouterLink, FormsModule, TranslatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl:    './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {

  @ViewChild('lineCanvas')  lineCanvas!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('donutCanvas') donutCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barCanvas')   barCanvas!:   ElementRef<HTMLCanvasElement>;

  data          = signal<DashboardSummary | null>(null);
  loading       = signal(true);
  categories    = signal<Category[]>([]);
  chartType     = signal<'donut' | 'bar'>('donut');
  showAddModal  = signal(false);
  savingTx      = signal(false);
  txError       = signal('');
  txFormType    = signal<string>('expense');

  selectedMonth = new Date().getMonth() + 1;
  selectedYear  = new Date().getFullYear();

  txForm: any = {
    type:        'expense',
    amount:      null,
    date:        new Date().toISOString().split('T')[0],
    category_id: null,
    description: '',
  };

  private lineChart?:  Chart;
  private donutChart?: Chart;
  private barChart?:   Chart;

  get currencySymbol(): string {
    return this.currencyService.current().symbol;
  }

  kpis = computed(() => {
    const d    = this.data();
    const lang = this.translation.current();
    if (!d || !lang) return [];

    const income   = +d.kpi.total_income;
    const expenses = +d.kpi.total_expenses;
    const balance  = +d.kpi.total_balance;
    const savings  = income - expenses;

    let balanceBadgeKey = 'DASHBOARD.NEGATIVE';
    if (balance >= 0) balanceBadgeKey = 'DASHBOARD.POSITIVE';

    let savingsBadgeKey = 'DASHBOARD.DEFICIT';
    if (savings >= 0) savingsBadgeKey = 'DASHBOARD.SAVINGS';

    return [
      {
        lucide: 'wallet',
        label:  this.translation.t('DASHBOARD.BALANCE'),
        value:  this.eur(balance),
        badge:  this.translation.t(balanceBadgeKey),
        up:     balance >= 0,
      },
      {
        lucide: 'arrow-down-circle',
        label:  this.translation.t('DASHBOARD.INCOME_MONTH'),
        value:  this.eur(income),
        badge:  this.translation.t('DASHBOARD.INCOME'),
        up:     true,
      },
      {
        lucide: 'arrow-up-circle',
        label:  this.translation.t('DASHBOARD.EXPENSES_MONTH'),
        value:  this.eur(expenses),
        badge:  this.translation.t('DASHBOARD.EXPENSES'),
        up:     false,
      },
      {
        lucide: 'piggy-bank',
        label:  this.translation.t('DASHBOARD.NET_SAVINGS'),
        value:  this.eur(savings),
        badge:  this.translation.t(savingsBadgeKey),
        up:     savings >= 0,
      },
    ];
  });

  totalCatExpenses = computed(() =>
    this.data()?.byCategory.reduce((sum, cat) => sum + +cat.total, 0) ?? 0
  );

  filteredCats = computed(() =>
    this.categories().filter(cat => cat.type === this.txFormType())
  );

  constructor(
    public  auth:             AuthService,
    public  themeSvc:         ThemeService,
    private translation:      TranslationService,
    private dashboardService: DashboardService,
    private expenseService:   ExpenseService,
    private categoryService:  CategoryService,
    public  currencyService:  CurrencyService,
  ) {
    effect(() => {
      this.themeSvc.theme();
      setTimeout(() => {
        this.buildLineChart();
        if (this.chartType() === 'donut') { this.buildDonutChart(); } else { this.buildBarChart(); }
      }, 50);
    });

    effect(() => {
      this.translation.current();
      setTimeout(() => {
        this.buildLineChart();
        if (this.chartType() === 'donut') { this.buildDonutChart(); } else { this.buildBarChart(); }
      }, 50);
    });

    effect(() => {
      this.currencyService.current();
      setTimeout(() => {
        this.buildLineChart();
        if (this.chartType() === 'donut') { this.buildDonutChart(); } else { this.buildBarChart(); }
      }, 50);
    });
  }

  ngOnInit(): void {
    this.load();
    this.categoryService.getAll().subscribe(cats => this.categories.set(cats));
  }

  get currentMonth(): string {
    const lang = this.translation.current();

    const localeMap: Record<string, string> = {
      en: 'en-GB',
      de: 'de-DE',
      fr: 'fr-FR',
    };

    let locale = 'es-ES';
    if (localeMap[lang]) locale = localeMap[lang];

    return new Date(this.selectedYear, this.selectedMonth - 1)
      .toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }

  load(): void {
    this.loading.set(true);
    this.dashboardService.getSummary(this.selectedMonth, this.selectedYear).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
        setTimeout(() => { this.buildLineChart(); this.buildDonutChart(); }, 60);
      },
      error: () => this.loading.set(false),
    });
  }

  prevMonth(): void {
    this.selectedMonth--;
    if (this.selectedMonth < 1) {
      this.selectedMonth = 12;
      this.selectedYear--;
    }
    this.load();
  }

  nextMonth(): void {
    this.selectedMonth++;
    if (this.selectedMonth > 12) {
      this.selectedMonth = 1;
      this.selectedYear++;
    }
    this.load();
  }

  openAddModal(): void {
    this.txForm = {
      type:        'expense',
      amount:      null,
      date:        new Date().toISOString().split('T')[0],
      category_id: null,
      description: '',
    };
    this.txFormType.set('expense');
    this.txError.set('');
    this.showAddModal.set(true);
  }

  setTxType(type: string): void {
    this.txForm.type        = type;
    this.txForm.category_id = null;
    this.txFormType.set(type);
  }

  saveTx(): void {
    if (!this.txForm.amount || this.txForm.amount <= 0) {
      this.txError.set(this.translation.t('MOVEMENTS.ERR_AMOUNT'));
      return;
    }
    if (!this.txForm.date) {
      this.txError.set(this.translation.t('MOVEMENTS.ERR_DATE'));
      return;
    }

    this.savingTx.set(true);

    const payload = {
      ...this.txForm,
      // ✅ Convierte el importe introducido a EUR antes de guardar en la DB
      amount: this.currencyService.convertToEur(parseFloat(this.txForm.amount)),
    };

    this.expenseService.create(payload).subscribe({
      next: () => {
        this.showAddModal.set(false);
        this.savingTx.set(false);
        this.load();
      },
      error: (err) => {
        this.txError.set(err.error?.error || this.translation.t('COMMON.ERROR_SAVE'));
        this.savingTx.set(false);
      },
    });
  }

  toggleChart(): void {
    if (this.chartType() === 'donut') {
      this.chartType.set('bar');
    } else {
      this.chartType.set('donut');
    }

    setTimeout(() => {
      if (this.chartType() === 'donut') {
        this.buildDonutChart();
      } else {
        this.buildBarChart();
      }
    }, 50);
  }

  eur(value: number): string {
    return this.currencyService.format(value || 0);
  }

  private getChartColors() {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

    if (isDark) {
      return {
        grid:    'rgba(237,224,204,0.10)',
        ticks:   '#ede0cc',
        tooltip: 'rgba(7,26,33,0.95)',
        text:    '#ede0cc',
        legend:  '#ede0cc',
      };
    } else {
      return {
        grid:    'rgba(26,46,53,0.15)',
        ticks:   '#1a2e35',
        tooltip: 'rgba(26,46,53,0.92)',
        text:    '#f5ede0',
        legend:  '#1a2e35',
      };
    }
  }

  private buildLineChart(): void {
    this.lineChart?.destroy();

    const ctx = this.lineCanvas?.nativeElement.getContext('2d');
    if (!ctx || !this.data()) return;

    const colors = this.getChartColors();
    const days   = this.data()!.daily30;

    const labels = days.map(d => {
      const date = new Date(d.day + 'T00:00:00');
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    });

    this.lineChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label:           this.translation.t('DASHBOARD.INCOME'),
            data:            days.map(d => +d.income),
            backgroundColor: 'rgba(184,151,106,0.75)',
            borderColor:     '#b8976a',
            borderWidth:     0,
            borderRadius:    3,
          },
          {
            label:           this.translation.t('DASHBOARD.EXPENSES'),
            data:            days.map(d => +d.expenses),
            backgroundColor: 'rgba(42,140,122,0.75)',
            borderColor:     '#2a8c7a',
            borderWidth:     0,
            borderRadius:    3,
          },
        ],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: { color: colors.legend, usePointStyle: true, font: { size: 11 } },
          },
          tooltip: {
            backgroundColor: colors.tooltip,
            titleColor:      colors.text,
            bodyColor:       colors.text,
            borderColor:     'rgba(184,151,106,0.3)',
            borderWidth:     1,
            padding:         12,
            cornerRadius:    10,
            callbacks: {
              label: (item: any) => {
                if (item.parsed.y > 0) {
                  return item.dataset.label + ': ' + this.currencyService.format(item.parsed.y);
                }
                return '';
              },
            },
          },
        },
        scales: {
          x: {
            grid:  { display: false },
            ticks: {
              color:       colors.ticks,
              font:        { size: 10 },
              maxRotation: 45,
              callback: (_val: any, index: number) => {
                if (index % 5 === 0) return labels[index];
                return '';
              },
            },
          },
          y: {
            grid:  { color: colors.grid },
            ticks: {
              color: colors.ticks,
              font:  { size: 11 },
              callback: (value: any) => {
                const n = Number(value);
                if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
                if (n >= 1000)    return (n / 1000).toFixed(0) + 'k';
                if (n > 0)        return n.toLocaleString('es-ES');
                return '';
              },
            },
          },
        },
      },
    });
  }

  private buildDonutChart(): void {
    this.donutChart?.destroy();

    const ctx        = this.donutCanvas?.nativeElement.getContext('2d');
    const categories = this.data()?.byCategory;
    if (!ctx || !categories || !categories.length) return;

    const colors = this.getChartColors();

    this.donutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels:   categories.map(cat => cat.icon + ' ' + cat.name),
        datasets: [{
          data:            categories.map(cat => +cat.total),
          backgroundColor: categories.map(cat => cat.color + 'cc'),
          borderWidth:     0,
          hoverOffset:     8,
        }],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        cutout:              '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: colors.tooltip,
            titleColor:      colors.text,
            bodyColor:       colors.text,
            borderWidth:     1,
            padding:         12,
            cornerRadius:    10,
            callbacks: {
              label: (ctx: any) => this.currencyService.format(+ctx.parsed),
            },
          },
        },
      },
    });
  }

  private buildBarChart(): void {
    this.barChart?.destroy();

    const ctx        = this.barCanvas?.nativeElement?.getContext('2d');
    const categories = this.data()?.byCategory || [];
    if (!ctx) return;

    const accent = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent').trim() || '#b8976a';

    const colors = this.getChartColors();

    this.barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels:   categories.map(cat => cat.name),
        datasets: [{
          label:           this.translation.t('DASHBOARD.EXPENSES'),
          data:            categories.map(cat => +cat.total),
          backgroundColor: categories.map(cat => (cat.color || accent) + 'cc'),
          borderColor:     categories.map(cat =>  cat.color || accent),
          borderWidth:     1,
          borderRadius:    6,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx: any) => this.currencyService.format(+ctx.parsed.y),
            },
          },
        },
        scales: {
          x: {
            ticks: { color: colors.ticks, font: { size: 11 } },
            grid:  { display: false },
          },
          y: {
            ticks: { color: colors.ticks, font: { size: 11 } },
            grid:  { color: colors.grid },
          },
        },
      },
    });
  }

  getToggleIcon(): string {
    if (this.chartType() === 'donut') return 'bar-chart-2';
    return 'pie-chart';
  }

  getToggleLabel(): string {
    if (this.chartType() === 'donut') return this.translation.t('DASHBOARD.VIEW_BARS');
    return this.translation.t('DASHBOARD.VIEW_DONUT');
  }

  getTxSign(type: string): string {
    if (type === 'income') return '+';
    return '-';
  }

  getTxIcon(icon: string | undefined): string {
    if (icon) return icon;
    return '?';
  }

  getSaveTxLabel(): string {
    if (this.savingTx()) return this.translation.t('COMMON.SAVING');
    return this.translation.t('COMMON.SAVE');
  }
}