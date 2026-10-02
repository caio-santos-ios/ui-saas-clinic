import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { Loading } from '../../components/loading/loading';
import { GlobalService } from '../../services/global.service';
import { api } from '../../services/api';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, Loading],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('revenueChart') revenueChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChartRef!: ElementRef<HTMLCanvasElement>;

  chart: Chart | null = null;
  donutChart: Chart | null = null;
  isLoading = true;

  stats = {
    totalRevenue: 0,
    monthAppointments: 0,
    activePros: 0,
    pendingVerifications: 0,
    openDisputes: 0,
    satisfactionRate: 100
  };

  recentAppointments: any[] = [];

  constructor(
    public global: GlobalService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.fetchData();
  }

  ngAfterViewInit() {
    this.initCharts();
  }

  ngOnDestroy() {
    this.destroyCharts();
  }

  destroyCharts() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    if (this.donutChart) {
      this.donutChart.destroy();
      this.donutChart = null;
    }
  }

  async fetchData() {
    this.isLoading = true;
    this.cdr.detectChanges();

    const safetyTimer = setTimeout(() => {
      if (this.isLoading) {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    }, 3500);

    try {
      const response = await api.get('/api/dashboard');
      const data = response.data?.result?.data;
      console.log(data)
      if (data) {
        this.stats.totalRevenue = data.totalRevenue || 0;
        this.stats.monthAppointments = data.monthAppointments || 0;
        this.stats.activePros = data.activePros || 0;
        this.stats.pendingVerifications = data.pendingVerifications || 0;
        this.stats.openDisputes = data.openDisputes || 0;
        this.stats.satisfactionRate = data.satisfactionRate || 100;

        this.recentAppointments = data.recentAppointments || [];

        if (this.chart && data.revenueHistory && data.revenueHistory.length > 0) {
          this.chart.data.labels = data.revenueHistory.map((h: any) => h.label);
          this.chart.data.datasets[0].data = data.revenueHistory.map((h: any) => h.revenue);
          this.chart.update();
        }

        if (this.donutChart) {
          if (data.categoryDistribution && data.categoryDistribution.length > 0) {
            this.donutChart.data.labels = data.categoryDistribution.map((c: any) => c.name);
            this.donutChart.data.datasets[0].data = data.categoryDistribution.map((c: any) => c.count);
            this.donutChart.data.datasets[0].backgroundColor = ['#fdbf0f', '#38bdf8', '#4ade80', '#a855f7', '#fb7185'];
          } else {
            this.donutChart.data.labels = ['Nenhuma categoria cadastrada'];
            this.donutChart.data.datasets[0].data = [1];
            this.donutChart.data.datasets[0].backgroundColor = ['#334155'];
          }
          this.donutChart.update();
        }
      }

      this.isLoading = false;
      this.cdr.detectChanges();

      api.get('/api/approvals')
        .then(resApprovals => {
          const apprList = resApprovals.data?.result || resApprovals.data?.data || resApprovals.data || [];
          if (Array.isArray(apprList)) {
            const pendingCount = apprList.filter((a: any) => {
              const s = (a.status || '').toString().toLowerCase().trim();
              return !a.approved && s !== 'approved' && s !== 'rejected';
            }).length;
            if (pendingCount > 0 || this.stats.pendingVerifications === 0) {
              this.stats.pendingVerifications = pendingCount;
              this.cdr.detectChanges();
            }
          }
        })
        .catch(() => {});
    } catch (e) {
      console.warn('Fallback ao carregar dashboard:', e);
    } finally {
      clearTimeout(safetyTimer);
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  initCharts() {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentMonth = new Date().getMonth();
    const last6MonthsLabels = [];
    for (let i = 5; i >= 0; i--) {
      const m = (currentMonth - i + 12) % 12;
      last6MonthsLabels.push(monthNames[m]);
    }

    if (this.revenueChartRef) {
      const ctx = this.revenueChartRef.nativeElement.getContext('2d');
      if (ctx) {
        this.chart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: last6MonthsLabels,
            datasets: [
              {
                label: 'Faturamento Pix (R$)',
                data: [0, 0, 0, 0, 0, 0],
                borderColor: '#fdbf0f',
                backgroundColor: 'rgba(253, 191, 15, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#fdbf0f',
                pointRadius: 4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', weight: 'bold' } }
              }
            },
            scales: {
              x: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#94a3b8' }
              },
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: {
                  color: '#94a3b8',
                  callback: (value) => 'R$ ' + value
                }
              }
            }
          }
        });
      }
    }

    if (this.categoryChartRef) {
      const ctxDonut = this.categoryChartRef.nativeElement.getContext('2d');
      if (ctxDonut) {
        this.donutChart = new Chart(ctxDonut, {
          type: 'doughnut',
          data: {
            labels: ['Nenhuma categoria cadastrada'],
            datasets: [
              {
                data: [1],
                backgroundColor: ['#334155'],
                borderWidth: 0
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: { color: '#94a3b8', boxWidth: 12, padding: 12, font: { family: 'Plus Jakarta Sans' } }
              }
            }
          }
        });
      }
    }
  }
}
