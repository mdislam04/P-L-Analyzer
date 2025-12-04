import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, OnChanges, SimpleChanges, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';
import { GoogleDriveService } from './google-drive.service';

interface Contract {
  monthYear: string;
  name: string;
  type: 'regular' | 'nifty';
  pnl: number;
}

interface MonthOption {
  value: string; // YYYY-MM
  label: string; // "December 2024"
  fileId: string;
}

interface V2DashboardData {
  version: string;
  month: string; // YYYY-MM
  lastModified: string;
  contracts: Contract[];
}

@Component({
  selector: 'app-dashboard-v2',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="v2-container" *ngIf="contracts" id="v2-dashboard-content">
      <div class="v2-header">
        <div class="v2-title">V2 PERFORMANCE SNAPSHOT</div>
        <div class="v2-period" *ngIf="latestMonth">{{ latestMonth }}</div>
        <div class="v2-net" [class.profit]="netPnL >= 0" [class.loss]="netPnL < 0">
          P & L {{ netPnL >= 0 ? '+' : '-' }}₹{{ formatNumber(absNet) }}
        </div>
        <div class="v2-win-rate">WIN RATE: {{ winRate.toFixed(1) }}%</div>
        
        <!-- Drive Controls -->
        <div class="drive-controls" *ngIf="driveService.isConnected()">
          <select [(ngModel)]="selectedMonth" (change)="onMonthSelected()" class="month-dropdown">
            <option value="">Select month to load...</option>
            <option *ngFor="let month of availableMonths" [value]="month.value">
              {{ month.label }}
            </option>
          </select>
          <button 
            class="sync-btn" 
            (click)="syncV2Dashboard()" 
            [disabled]="isSyncing || !contracts.length">
            {{ isSyncing ? '⏳ Syncing...' : '🔄 Sync Drive' }}
          </button>
        </div>
        
        <button class="export-btn" (click)="exportV2AsImage()">📸 Export as Image</button>
      </div>
      
      <!-- Status Messages -->
      <div *ngIf="statusMessage" class="status-message" [class.success]="statusType === 'success'" [class.error]="statusType === 'error'">
        {{ statusMessage }}
      </div>

      <div class="v2-grid">
        <div class="metric-card">
          <div class="label">TOTAL TRADES</div>
          <div class="value">{{ totalTrades }}</div>
        </div>
        <div class="metric-card">
          <div class="label">WINNERS</div>
          <div class="value green">{{ winners }}</div>
        </div>
        <div class="metric-card">
          <div class="label">LOSERS</div>
          <div class="value red">{{ losers }}</div>
        </div>
        <div class="metric-card">
          <div class="label">AVG WIN</div>
          <div class="value" [class.muted]="avgWin === 0">₹{{ formatNumber(avgWin) }}</div>
        </div>
        <div class="metric-card">
          <div class="label">AVG LOSS</div>
          <div class="value" [class.muted]="avgLoss === 0">₹{{ formatNumber(avgLoss) }}</div>
        </div>
        <div class="metric-card">
          <div class="label">PROFIT FACTOR</div>
          <div class="value" [class.muted]="profitFactorDisplay === '—'">{{ profitFactorDisplay }}</div>
        </div>
        <div class="metric-card">
          <div class="label">MAX DRAWDOWN</div>
          <div class="value red">₹{{ formatNumber(maxDrawdown) }}</div>
        </div>
        <div class="metric-card">
          <div class="label">LONGEST WIN STREAK</div>
          <div class="value green">{{ longestWinStreak }}</div>
        </div>
        <div class="metric-card">
          <div class="label">LONGEST LOSS STREAK</div>
          <div class="value red">{{ longestLossStreak }}</div>
        </div>
      </div>

      <div class="v2-charts">
        <div class="chart-card">
          <div class="chart-title">Regular vs NIFTY (Abs P&L)</div>
          <canvas #chartRegularNifty></canvas>
        </div>
        <div class="chart-card">
          <div class="chart-title">NIFTY Futures vs Options (Abs P&L)</div>
          <canvas #chartNiftySplit></canvas>
        </div>
        <div class="chart-card">
          <div class="chart-title">NIFTY Options – Profit vs Loss</div>
          <canvas #chartOptionsProfitLoss></canvas>
        </div>
        <div class="chart-card">
          <div class="chart-title">Profit vs Loss (Abs)</div>
          <canvas #chartProfitLoss></canvas>
        </div>
      </div>

      <div class="v2-compact">
        <div class="compact-col">
          <div class="compact-title">Regular – Profits ↑</div>
          <div *ngFor="let c of regularProfitsAsc" class="compact-row">
            <span class="name">{{ c.name }}</span>
            <span class="value" [class.green]="c.pnl > 0" [class.red]="c.pnl < 0">
              {{ c.pnl > 0 ? '+' : '-' }}₹{{ formatNumber(abs(c.pnl)) }}
            </span>
          </div>
          <div class="compact-title">Regular – Losses ↓</div>
          <div *ngFor="let c of regularLossesDesc" class="compact-row">
            <span class="name">{{ c.name }}</span>
            <span class="value" [class.green]="c.pnl > 0" [class.red]="c.pnl < 0">
              {{ c.pnl > 0 ? '+' : '-' }}₹{{ formatNumber(abs(c.pnl)) }}
            </span>
          </div>
        </div>
        <div class="compact-col">
          <div class="compact-title">NIFTY – Profits ↑</div>
          <div *ngFor="let c of niftyProfitsAsc" class="compact-row">
            <span class="name">{{ c.name }}</span>
            <span class="value" [class.green]="c.pnl > 0" [class.red]="c.pnl < 0">
              {{ c.pnl > 0 ? '+' : '-' }}₹{{ formatNumber(abs(c.pnl)) }}
            </span>
          </div>
          <div class="compact-title">NIFTY – Losses ↓</div>
          <div *ngFor="let c of niftyLossesDesc" class="compact-row">
            <span class="name">{{ c.name }}</span>
            <span class="value" [class.green]="c.pnl > 0" [class.red]="c.pnl < 0">
              {{ c.pnl > 0 ? '+' : '-' }}₹{{ formatNumber(abs(c.pnl)) }}
            </span>
          </div>
        </div>
      </div>

      <div class="v2-footer">
        <div>Experimental V2 – core metrics only. See <code>docs/dashboardv2.md</code> for roadmap.</div>
      </div>
    </div>
  `,
  styles: [`
    .v2-container {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 18px;
      padding: 24px 28px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      animation: fadeIn 0.4s;
    }
    @keyframes fadeIn { from { opacity:0; transform: translateY(12px);} to { opacity:1; transform: translateY(0);} }
    .v2-header {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
      padding-bottom: 12px;
      margin-bottom: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .v2-title { font-size: 0.85em; letter-spacing: 2px; font-weight: 600; color: #ffc107; }
    .v2-period { font-size: 0.8em; color: #bbb; }
    .v2-net { font-size: 1.4em; font-weight: 700; }
    .v2-net.profit { color: #4caf50; }
    .v2-net.loss { color: #f44336; }
    .v2-win-rate { font-size: 0.8em; background: rgba(255,193,7,0.15); padding: 6px 10px; border-radius: 12px; letter-spacing: 1px; }
    .export-btn { padding: 8px 14px; background: #2196f3; color: #fff; font-size: 12px; border: none; border-radius: 8px; cursor: pointer; transition: all 0.3s; white-space: nowrap; margin-left: auto; }
    .export-btn:hover { background: #1976d2; transform: translateY(-2px); }
    .v2-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(140px,1fr)); gap: 16px; }
    .metric-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; }
    .metric-card .label { font-size: 0.65em; letter-spacing: 1px; color: #aaa; font-weight: 600; }
    .metric-card .value { font-size: 1.05em; font-weight: 600; }
    .metric-card .value.green { color: #4caf50; }
    .metric-card .value.red { color: #f44336; }
    .metric-card .value.muted { opacity: 0.6; }
    .v2-footer { font-size: 0.6em; color: #888; text-align: center; margin-top: 4px; }
    code { background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 6px; font-size: 0.9em; }
    @media (max-width: 900px) { .v2-grid { grid-template-columns: repeat(auto-fit,minmax(120px,1fr)); } }

    .v2-charts { display: grid; grid-template-columns: repeat(auto-fit,minmax(240px,1fr)); gap: 16px; }
    .chart-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 14px 16px; }
    .chart-title { font-size: 0.75em; color: #bbb; margin-bottom: 8px; }
    canvas { width: 100%; height: 200px; }

    .v2-compact { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px; }
    .compact-col { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 12px 14px; }
    .compact-title { font-size: 0.75em; color: #bbb; margin: 8px 0; letter-spacing: 1px; }
    .compact-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .compact-row:last-child { border-bottom: none; }
    .compact-row .name { font-size: 0.8em; color: #ddd; }
    .compact-row .value { font-size: 0.9em; font-weight: 600; }
    .compact-row .value.green { color: #4caf50; }
    .compact-row .value.red { color: #f44336; }
    
    .drive-controls { display: flex; gap: 10px; align-items: center; }
    .month-dropdown {
      padding: 8px 12px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 6px;
      color: #fff;
      font-size: 0.85em;
      cursor: pointer;
      min-width: 200px;
    }
    .month-dropdown option { background: #1a2332; color: #fff; }
    .sync-btn {
      padding: 8px 16px;
      background: #4285f4;
      border: none;
      border-radius: 6px;
      color: #fff;
      font-size: 0.85em;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      white-space: nowrap;
    }
    .sync-btn:hover:not(:disabled) { background: #3367d6; }
    .sync-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    
    .status-message {
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 0.85em;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .status-message.success {
      background: rgba(76, 175, 80, 0.2);
      border: 1px solid rgba(76, 175, 80, 0.4);
      color: #4caf50;
    }
    .status-message.error {
      background: rgba(244, 67, 54, 0.2);
      border: 1px solid rgba(244, 67, 54, 0.4);
      color: #f44336;
    }
  `]
})
export class DashboardV2Component implements AfterViewInit, OnChanges, OnDestroy, OnInit {
  @Input() contracts: Contract[] = [];
  @Output() contractsChange = new EventEmitter<Contract[]>();
  @ViewChild('chartRegularNifty') chartRegularNiftyRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartNiftySplit') chartNiftySplitRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartOptionsProfitLoss') chartOptionsProfitLossRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartProfitLoss') chartProfitLossRef!: ElementRef<HTMLCanvasElement>;

  private chartRegularNifty?: any;
  private chartNiftySplit?: any;
  private chartOptionsProfitLoss?: any;
  private chartProfitLoss?: any;

  // Google Drive state
  availableMonths: MonthOption[] = [];
  selectedMonth: string = '';
  isSyncing: boolean = false;
  statusMessage: string = '';
  statusType: 'success' | 'error' = 'success';

  constructor(
    public driveService: GoogleDriveService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAvailableMonths();
  }

  get latestMonth(): string | null {
    if (!this.contracts.length) return null;
    const latest = this.contracts
      .map(c => c.monthYear)
      .filter(Boolean)
      .reduce((max, curr) => {
        const mDate = new Date(max + '-01').getTime();
        const cDate = new Date(curr + '-01').getTime();
        return cDate > mDate ? curr : max;
      });
    const date = new Date(latest + '-01');
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
  }

  get netPnL(): number { return this.contracts.reduce((s,c) => s + c.pnl, 0); }
  get absNet(): number { return Math.abs(this.netPnL); }
  get totalTrades(): number { return this.contracts.length; }
  get winners(): number { return this.contracts.filter(c => c.pnl > 0).length; }
  get losers(): number { return this.contracts.filter(c => c.pnl < 0).length; }
  get winRate(): number { return this.totalTrades === 0 ? 0 : (this.winners / this.totalTrades) * 100; }
  get avgWin(): number {
    const wins = this.contracts.filter(c => c.pnl > 0);
    if (!wins.length) return 0;
    return wins.reduce((s,c) => s + c.pnl, 0) / wins.length;
  }
  get avgLoss(): number {
    const losses = this.contracts.filter(c => c.pnl < 0);
    if (!losses.length) return 0;
    return Math.abs(losses.reduce((s,c) => s + c.pnl, 0)) / losses.length;
  }
  get profitFactorDisplay(): string {
    const wins = this.contracts.filter(c => c.pnl > 0).reduce((s,c) => s + c.pnl, 0);
    const losses = Math.abs(this.contracts.filter(c => c.pnl < 0).reduce((s,c) => s + c.pnl, 0));
    if (losses === 0) return '—';
    const pf = wins / losses;
    return pf.toFixed(2);
  }

  formatNumber(num: number): string {
    return Math.abs(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  abs(num: number): number { return Math.abs(num); }

  get maxDrawdown(): number {
    const equity: number[] = [];
    let sum = 0;
    for (const c of this.contracts) { sum += c.pnl; equity.push(sum); }
    let peak = 0;
    let maxDD = 0;
    for (const v of equity) {
      if (v > peak) peak = v;
      const dd = peak - v;
      if (dd > maxDD) maxDD = dd;
    }
    return maxDD;
  }

  get longestWinStreak(): number {
    let longest = 0, current = 0;
    for (const c of this.contracts) {
      if (c.pnl > 0) { current++; longest = Math.max(longest, current); } else { current = 0; }
    }
    return longest;
  }

  get longestLossStreak(): number {
    let longest = 0, current = 0;
    for (const c of this.contracts) {
      if (c.pnl < 0) { current++; longest = Math.max(longest, current); } else { current = 0; }
    }
    return longest;
  }

  // Charts and compact lists helpers
  private absSum(items: Contract[]): number {
    return Math.abs(items.reduce((s,c) => s + c.pnl, 0));
  }

  private isNiftyOption(c: Contract): boolean {
    const name = c.name?.toUpperCase() || '';
    return name.includes('NIFTY') && (name.includes('CE') || name.includes('PE'));
  }

  get regularAbsTotal(): number {
    return this.absSum(this.contracts.filter(c => c.type === 'regular'));
  }
  get niftyAbsTotal(): number {
    return this.absSum(this.contracts.filter(c => c.type === 'nifty'));
  }
  get niftyFuturesAbsTotal(): number {
    return this.absSum(this.contracts.filter(c => c.type === 'nifty' && !this.isNiftyOption(c)));
  }
  get niftyOptionsAbsTotal(): number {
    return this.absSum(this.contracts.filter(c => c.type === 'nifty' && this.isNiftyOption(c)));
  }
  get profitAbsTotal(): number {
    return this.contracts.filter(c => c.pnl > 0).reduce((s,c)=> s + c.pnl, 0);
  }
  get lossAbsTotal(): number {
    return Math.abs(this.contracts.filter(c => c.pnl < 0).reduce((s,c)=> s + c.pnl, 0));
  }

  // Signed totals for color and label sign
  get regularSignedTotal(): number {
    return this.contracts.filter(c => c.type === 'regular').reduce((s,c)=> s + c.pnl, 0);
  }
  get niftySignedTotal(): number {
    return this.contracts.filter(c => c.type === 'nifty').reduce((s,c)=> s + c.pnl, 0);
  }
  get niftyFuturesSignedTotal(): number {
    return this.contracts.filter(c => c.type === 'nifty' && !this.isNiftyOption(c)).reduce((s,c)=> s + c.pnl, 0);
  }
  get niftyOptionsSignedTotal(): number {
    return this.contracts.filter(c => c.type === 'nifty' && this.isNiftyOption(c)).reduce((s,c)=> s + c.pnl, 0);
  }

  get regularProfitsAsc(): Contract[] {
    return this.contracts.filter(c => c.type === 'regular' && c.pnl > 0).sort((a,b)=> a.pnl - b.pnl);
  }
  get regularLossesDesc(): Contract[] {
    return this.contracts.filter(c => c.type === 'regular' && c.pnl < 0).sort((a,b)=> Math.abs(b.pnl) - Math.abs(a.pnl));
  }
  get niftyProfitsAsc(): Contract[] {
    return this.contracts.filter(c => c.type === 'nifty' && c.pnl > 0).sort((a,b)=> a.pnl - b.pnl);
  }
  get niftyLossesDesc(): Contract[] {
    return this.contracts.filter(c => c.type === 'nifty' && c.pnl < 0).sort((a,b)=> Math.abs(b.pnl) - Math.abs(a.pnl));
  }

  ngAfterViewInit(): void { this.renderCharts(); }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['contracts']) { 
      this.renderCharts();
      // Reload available months when navigating to V2 tab
      this.loadAvailableMonths();
    }
  }
  ngOnDestroy(): void { this.destroyCharts(); }

  private destroyCharts(): void {
    this.chartRegularNifty?.destroy(); this.chartRegularNifty = undefined;
    this.chartNiftySplit?.destroy(); this.chartNiftySplit = undefined;
    this.chartOptionsProfitLoss?.destroy(); this.chartOptionsProfitLoss = undefined;
    this.chartProfitLoss?.destroy(); this.chartProfitLoss = undefined;
  }

  private renderCharts(): void {
    // Ensure canvases exist
    const ctxA = this.chartRegularNiftyRef?.nativeElement.getContext('2d');
    const ctxB = this.chartNiftySplitRef?.nativeElement.getContext('2d');
    const ctxD = this.chartOptionsProfitLossRef?.nativeElement.getContext('2d');
    const ctxC = this.chartProfitLossRef?.nativeElement.getContext('2d');
    if (!ctxA || !ctxB || !ctxC || !ctxD) return;

    const drawLabelsPlugin = {
      id: 'drawLabelsPlugin',
      afterDatasetsDraw: (chart: any) => {
        const { ctx } = chart;
        ctx.save();
        chart.data.datasets.forEach((dataset: any, i: number) => {
          const meta = chart.getDatasetMeta(i);
          meta.data.forEach((arc: any, index: number) => {
            const val = dataset.data[index];
            const label = chart.data.labels[index];
            const text = dataset._formattedLabels ? dataset._formattedLabels[index] : `${label}: ₹${this.formatNumber(val)}`;
            const pos = arc.tooltipPosition();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Segoe UI';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, pos.x, pos.y);
          });
        });
        ctx.restore();
      }
    };

    const commonOptions = {
      plugins: {
        legend: { labels: { color: '#ddd' } },
        title: { display: false }
      }
    } as any;

    // Regular vs NIFTY
    const regularColor = this.regularSignedTotal >= 0 ? '#4caf50' : '#ff6e6e';
    const niftyColor = this.niftySignedTotal >= 0 ? '#4caf50' : '#ff6e6e';
    const dataA = {
      labels: ['Regular', 'NIFTY'],
      datasets: [{ 
        data: [Math.abs(this.regularSignedTotal), Math.abs(this.niftySignedTotal)],
        backgroundColor: [regularColor, niftyColor],
        borderColor: '#ffffff', borderWidth: 2,
        _formattedLabels: [
          `${this.regularSignedTotal >= 0 ? '+' : '-'}₹${this.formatNumber(Math.abs(this.regularSignedTotal))}`,
          `${this.niftySignedTotal >= 0 ? '+' : '-'}₹${this.formatNumber(Math.abs(this.niftySignedTotal))}`
        ]
      }]
    } as any;
    this.chartRegularNifty?.destroy();
    this.chartRegularNifty = new Chart(ctxA, { type: 'pie', data: dataA, options: commonOptions, plugins: [drawLabelsPlugin] });

    // NIFTY Futures vs Options
    const futuresColor = this.niftyFuturesSignedTotal >= 0 ? '#4caf50' : '#ff6e6e';
    const optionsColor = this.niftyOptionsSignedTotal >= 0 ? '#4caf50' : '#ff6e6e';
    const dataB = {
      labels: ['Futures', 'Options'],
      datasets: [{ 
        data: [Math.abs(this.niftyFuturesSignedTotal), Math.abs(this.niftyOptionsSignedTotal)],
        backgroundColor: [futuresColor, optionsColor],
        borderColor: '#ffffff', borderWidth: 2,
        _formattedLabels: [
          `${this.niftyFuturesSignedTotal >= 0 ? '+' : '-'}₹${this.formatNumber(Math.abs(this.niftyFuturesSignedTotal))}`,
          `${this.niftyOptionsSignedTotal >= 0 ? '+' : '-'}₹${this.formatNumber(Math.abs(this.niftyOptionsSignedTotal))}`
        ]
      }]
    } as any;
    this.chartNiftySplit?.destroy();
    this.chartNiftySplit = new Chart(ctxB, { type: 'pie', data: dataB, options: commonOptions, plugins: [drawLabelsPlugin] });

    // NIFTY Options Profit vs Loss
    const optionsProfit = this.contracts.filter(c => this.isNiftyOption(c) && c.pnl > 0).reduce((s,c)=> s + c.pnl, 0);
    const optionsLossAbs = Math.abs(this.contracts.filter(c => this.isNiftyOption(c) && c.pnl < 0).reduce((s,c)=> s + c.pnl, 0));
    const optionsProfitColor = '#4caf50';
    const optionsLossColor = '#ff6e6e';
    const dataD = {
      labels: ['Options Profit', 'Options Loss'],
      datasets: [{
        data: [Math.abs(optionsProfit), Math.abs(optionsLossAbs)],
        backgroundColor: [optionsProfitColor, optionsLossColor],
        borderColor: '#ffffff', borderWidth: 2,
        _formattedLabels: [
          `+₹${this.formatNumber(Math.abs(optionsProfit))}`,
          `-₹${this.formatNumber(Math.abs(optionsLossAbs))}`
        ]
      }]
    } as any;
    this.chartOptionsProfitLoss?.destroy();
    this.chartOptionsProfitLoss = new Chart(ctxD, { type: 'pie', data: dataD, options: commonOptions, plugins: [drawLabelsPlugin] });

    // Profit vs Loss
    const dataC = {
      labels: ['Profit', 'Loss'],
      datasets: [{ 
        data: [this.profitAbsTotal, this.lossAbsTotal],
        backgroundColor: ['#4caf50', '#ff6e6e'],
        borderColor: '#ffffff', borderWidth: 2,
        _formattedLabels: [
          `+₹${this.formatNumber(this.profitAbsTotal)}`,
          `-₹${this.formatNumber(this.lossAbsTotal)}`
        ]
      }]
    } as any;
    this.chartProfitLoss?.destroy();
    this.chartProfitLoss = new Chart(ctxC, { type: 'pie', data: dataC, options: commonOptions, plugins: [drawLabelsPlugin] });
  }

  async exportV2AsImage() {
    const el = document.getElementById('v2-dashboard-content');
    if (!el) return;
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = '#1a2332';
    overlay.style.zIndex = '-1';
    el.style.position = 'relative';
    el.prepend(overlay);
    await new Promise(r => setTimeout(r, 50));
    try {
      const dataUrl = await toPng(el as HTMLElement, { backgroundColor: '#1a2332', pixelRatio: 3, cacheBust: true });
      overlay.remove();
      (el as HTMLElement).style.position = '';
      const link = document.createElement('a');
      link.download = `trading-dashboard-v2-${(this.latestMonth||'').replace(/\s/g,'-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (primaryError) {
      try {
        const canvas = await html2canvas(el as HTMLElement, { backgroundColor: '#1a2332', scale: 3, logging: false, useCORS: true, allowTaint: false, width: (el as HTMLElement).offsetWidth, height: (el as HTMLElement).offsetHeight });
        overlay.remove();
        (el as HTMLElement).style.position = '';
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `trading-dashboard-v2-${(this.latestMonth||'').replace(/\s/g,'-')}.png`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
          }
        }, 'image/png');
      } catch (fallbackError) {
        overlay.remove();
        (el as HTMLElement).style.position = '';
        console.error('Error exporting V2 dashboard:', fallbackError);
      }
    }
  }

  // ============= GOOGLE DRIVE INTEGRATION =============

  async loadAvailableMonths() {
    if (!this.driveService.isConnected()) {
      this.availableMonths = [];
      return;
    }

    try {
      // Search for all v2-dashboard-*.json files
      const files = await this.searchAllV2DashboardFiles();
      this.availableMonths = files
        .map(file => this.parseMonthFromFileName(file.name, file.id))
        .filter(m => m !== null) as MonthOption[];
      
      // Sort by date descending (newest first)
      this.availableMonths.sort((a, b) => b.value.localeCompare(a.value));
      
      // Trigger change detection
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Failed to load available months:', error);
    }
  }

  private async searchAllV2DashboardFiles(): Promise<{id: string, name: string}[]> {
    const token = this.driveService.getAccessToken();
    if (!token) return [];

    const query = encodeURIComponent("name contains 'v2-dashboard-' and name contains '.json' and trashed=false");
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Failed to search files');
    }

    const data = await response.json();
    return data.files || [];
  }

  private parseMonthFromFileName(fileName: string, fileId: string): MonthOption | null {
    // Extract YYYY-MM from v2-dashboard-YYYY-MM.json
    const match = fileName.match(/v2-dashboard-(\d{4})-(\d{2})\.json/);
    if (!match) return null;

    const year = match[1];
    const month = match[2];
    const value = `${year}-${month}`;
    
    // Convert to label: "December 2024"
    const date = new Date(`${year}-${month}-01`);
    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return { value, label, fileId };
  }

  async onMonthSelected() {
    if (!this.selectedMonth) return;

    const monthOption = this.availableMonths.find(m => m.value === this.selectedMonth);
    if (!monthOption) return;

    this.isSyncing = true;
    this.cdr.detectChanges();

    try {
      // Download file
      const data: V2DashboardData = await this.driveService.downloadFile(monthOption.fileId);
      
      // Update contracts (this will emit to parent via contractsChange)
      this.contractsChange.emit(data.contracts);
      
      this.showSuccessMessage(`✅ Loaded ${monthOption.label} data from Drive`);
    } catch (error) {
      console.error('Failed to load month data:', error);
      this.showErrorMessage('❌ Failed to load data: ' + (error as Error).message);
    } finally {
      this.isSyncing = false;
      this.cdr.detectChanges();
    }
  }

  async syncV2Dashboard() {
    if (!this.driveService.isConnected()) {
      this.showErrorMessage('Please connect Google Drive first');
      return;
    }

    if (!this.contracts.length) {
      this.showErrorMessage('No data to sync');
      return;
    }

    // Check if all contracts are from the same month
    const months = new Set(this.contracts.map(c => c.monthYear).filter(Boolean));
    if (months.size > 1) {
      this.showErrorMessage('❌ Error: Contracts have mixed months. Please filter to a single month before syncing.');
      return;
    }

    if (months.size === 0) {
      this.showErrorMessage('❌ Error: Contracts missing month information');
      return;
    }

    const month = Array.from(months)[0];
    this.isSyncing = true;
    this.cdr.detectChanges();

    try {
      await this.saveV2Dashboard(month);
      this.showSuccessMessage(`✅ Synced ${this.formatMonth(month)} data to Drive`);
      
      // Refresh available months
      await this.loadAvailableMonths();
    } catch (error) {
      console.error('Sync failed:', error);
      this.showErrorMessage('❌ Sync failed: ' + (error as Error).message);
    } finally {
      this.isSyncing = false;
      this.cdr.detectChanges();
    }
  }

  private async saveV2Dashboard(month: string) {
    const fileName = `v2-dashboard-${month}.json`;
    const data: V2DashboardData = {
      version: '1.0',
      month: month,
      lastModified: new Date().toISOString(),
      contracts: this.contracts
    };

    // Check if file already exists
    const existingFile = await this.driveService.searchFile(fileName);

    if (existingFile) {
      // Update existing file
      await this.driveService.updateFile(existingFile.id, data);
    } else {
      // Create new file
      await this.driveService.createFile(fileName, data);
    }
  }

  private formatMonth(monthYear: string): string {
    if (!monthYear) return '';
    const date = new Date(monthYear + '-01');
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  private showSuccessMessage(message: string): void {
    this.statusMessage = message;
    this.statusType = 'success';
    setTimeout(() => this.statusMessage = '', 4000);
  }

  private showErrorMessage(message: string): void {
    this.statusMessage = message;
    this.statusType = 'error';
    setTimeout(() => this.statusMessage = '', 6000);
  }
}
