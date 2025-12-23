import { Component, signal, ChangeDetectorRef, NgZone, OnDestroy, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';
import { DashboardV2Component } from './dashboard-v2/dashboard-v2.component';
import { HelpComponent } from './help/help.component';
import { ChangeTrackComponent } from './change-track/change-track.component';
import { StockRadarComponent } from './stock-radar/stock-radar.component';
import { GoogleDriveService } from './google-drive.service';
import NoSleep from 'nosleep.js';
import { LucideAngularModule, Menu, X, Clipboard, BarChart3, TrendingUp, ArrowLeftRight, Radar, HelpCircle, BarChart2, TrendingDown, PieChart, Sun, Moon, Cloud, CloudCheck, Info, ExternalLink } from 'lucide-angular';
import { environment } from '../environments/environment';






interface Contract {
  monthYear: string;
  name: string;
  type: 'regular' | 'nifty';
  pnl: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    DashboardV2Component, 
    HelpComponent, 
    ChangeTrackComponent, 
    StockRadarComponent,
    LucideAngularModule
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})

export class App implements OnDestroy {
  protected readonly title = signal('trading-dashboard');
  Math = Math;
  
  // Sidebar state
  sidebarCollapsed = false;
  isMobileView = false;
  
  // Build info from environment
  buildInfo = environment.build;
  
  activeTab: 'input' | 'dashboard' | 'v2' | 'change-track' | 'stock-radar' | 'help' = 'input';
  contracts: Contract[] = [];
  uploadedFileName: string = '';
  uploadInProgress = false;
  uploadProgress = 0;
  uploadPhase = '';
  uploadStatusMessage = '';
  uploadSuccess = false;
  uploadError = false;

  formData = {
    monthYear: this.getCurrentMonth(),
    contractName: '',
    contractType: 'regular' as 'regular' | 'nifty',
    contractPnL: null as number | null
  };

  isConnectingDrive = false;
  
  // Screen Wake Lock
  private noSleep: NoSleep;
  isWakeLockActive = false;

  // Clock state
  currentTime = signal('');
  currentDate = signal('');
  private clockInterval: any;

  constructor(
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    public driveService: GoogleDriveService
  ) {
    this.noSleep = new NoSleep();
    this.loadWakeLockPreference();
    this.initializeClock();
    this.loadSidebarState();
    this.checkMobileView();
  }

  ngOnDestroy() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  // Sidebar methods
  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    this.saveSidebarState();
  }

  private loadSidebarState() {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('sidebarCollapsed');
    this.sidebarCollapsed = saved === 'true';
  }

  private saveSidebarState() {
    if (typeof window === 'undefined') return;
    localStorage.setItem('sidebarCollapsed', String(this.sidebarCollapsed));
  }

  @HostListener('window:resize')
  checkMobileView() {
    if (typeof window !== 'undefined') {
      this.isMobileView = window.innerWidth <= 768;
      // Auto-collapse on mobile
      if (this.isMobileView && !this.sidebarCollapsed) {
        this.sidebarCollapsed = true;
      }
    }
  }

  private initializeClock() {
    // Initialize clock immediately
    this.updateClock();
    
    // Update every second
    this.clockInterval = setInterval(() => {
      this.updateClock();
    }, 1000);
  }

  private updateClock() {
    const now = new Date();
    
    // Format time (HH:MM:SS)
    this.currentTime.set(now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }));
    
    // Format date (Day, Month DD, YYYY)
    this.currentDate.set(now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }));
  }

  async connectGoogleDrive() {
    this.isConnectingDrive = true;
    try {
      await this.driveService.initiateAuth();
      alert('✅ Google Drive connected successfully!');
    } catch (error) {
      console.error('Google Drive connection failed:', error);
      alert('❌ Failed to connect Google Drive. Please try again.');
    } finally {
      this.isConnectingDrive = false;
    }
  }

  disconnectGoogleDrive() {
    if (confirm('Disconnect Google Drive? You can reconnect anytime.')) {
      this.driveService.disconnect();
    }
  }

  toggleWakeLock() {
    try {
      if (this.isWakeLockActive) {
        this.noSleep.disable();
        this.isWakeLockActive = false;
        this.saveWakeLockPreference(false);
      } else {
        this.noSleep.enable();
        this.isWakeLockActive = true;
        this.saveWakeLockPreference(true);
      }
    } catch (error) {
      console.error('Wake lock error:', error);
      alert('⚠️ Failed to toggle screen wake lock. Please try again.');
    }
  }

  private loadWakeLockPreference() {
    try {
      const saved = localStorage.getItem('screenWakeLockEnabled');
      if (saved === 'true') {
        // Auto-enable wake lock if it was previously enabled
        this.noSleep.enable();
        this.isWakeLockActive = true;
      }
    } catch (error) {
      console.error('Failed to load wake lock preference:', error);
    }
  }

  private saveWakeLockPreference(enabled: boolean) {
    try {
      localStorage.setItem('screenWakeLockEnabled', enabled.toString());
    } catch (error) {
      console.error('Failed to save wake lock preference:', error);
    }
  }

  onContractsChange(newContracts: Contract[]) {
    this.contracts = newContracts;
  }

  getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  switchTab(tab: 'input' | 'dashboard' | 'v2' | 'change-track' | 'stock-radar' | 'help') {
    this.activeTab = tab;
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.uploadedFileName = file.name;
      const reader = new FileReader();
      // Initialize progress state
      this.uploadInProgress = true;
      this.uploadProgress = 0;
      this.uploadPhase = 'Loading file';
      this.uploadStatusMessage = '';
      this.uploadSuccess = false;
      this.uploadError = false;

      reader.onprogress = (e: ProgressEvent<FileReader>) => {
        if (e.lengthComputable) {
          const percent = Math.floor((e.loaded / e.total) * 40); // File load phase up to 40%
          this.zone.run(() => {
            this.uploadProgress = percent;
          });
        }
      };
      
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          // Smart month detection: Parse contract names and find most common month
          const detectedMonth = this.detectMonthFromContracts(jsonData);
          if (detectedMonth) {
            this.formData.monthYear = detectedMonth;
          }

          // Skip header row and process data
          const newContracts: Contract[] = [];
          let successCount = 0;
          this.uploadPhase = 'Parsing rows';
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row[0] && row[1] !== undefined) {
              const contractName = String(row[0]).trim();
              const pnl = Number(row[1]);
              // Auto-detect type based on symbol name
              const contractType = contractName.toUpperCase().includes('NIFTY') ? 'nifty' : 'regular';

              if (contractName && !isNaN(pnl)) {
                newContracts.push({
                  monthYear: this.formData.monthYear,
                  name: contractName,
                  type: contractType,
                  pnl: pnl
                });
                successCount++;
              }
            }
            // Update parse progress (40% - 95%)
            if (jsonData.length > 1) {
              const progressPortion = ((i) / (jsonData.length - 1));
              const mapped = 40 + Math.floor(progressPortion * 55); // 40 -> 95
              if (mapped > this.uploadProgress) {
                this.zone.run(() => { this.uploadProgress = mapped; });
              }
            }
          }

          // Ensure UI updates within Angular zone for immediate refresh
          this.zone.run(() => {
            this.contracts = [...this.contracts, ...newContracts];
            this.uploadedFileName = file.name;
            this.uploadPhase = 'Finalizing';
            
            // Update formData.monthYear to the latest month in contracts array
            // This ensures the dashboard dropdown shows the correct month
            if (this.contracts.length > 0) {
              const latestMonth = this.contracts
                .map(c => c.monthYear)
                .filter(Boolean)
                .reduce((max, curr) => {
                  const mDate = new Date(max + '-01').getTime();
                  const cDate = new Date(curr + '-01').getTime();
                  return cDate > mDate ? curr : max;
                });
              this.formData.monthYear = latestMonth;
            }
            
            // Ensure UI reaches 100% and triggers change detection
            this.uploadProgress = Math.max(this.uploadProgress, 95);
            requestAnimationFrame(() => {
              this.uploadProgress = 100;
              this.uploadInProgress = false;
              this.uploadSuccess = true;
              this.uploadStatusMessage = successCount === 0
                ? 'No valid rows found.'
                : `Imported ${successCount} contract${successCount !== 1 ? 's' : ''} successfully.`;
              this.cdr.detectChanges();
            });
            this.cdr.detectChanges();
            // Reset file input to allow re-upload of same file
            event.target.value = '';
          });
        } catch (error) {
          this.zone.run(() => {
            this.uploadInProgress = false;
            this.uploadError = true;
            this.uploadStatusMessage = 'Error reading Excel file. Please check the format.';
          });
          console.error(error);
        }
      };

      reader.readAsArrayBuffer(file);
    }
  }

  clearUploadStatus() {
    this.uploadStatusMessage = '';
    this.uploadSuccess = false;
    this.uploadError = false;
  }

  downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Symbol', 'Realized P&L'],
      ['WIPRO25DECFUT', 18600],
      ['NIFTY25N112450PE', -7946.25],
      ['KAYNES25DECFUT', 7500]
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contracts');
    XLSX.writeFile(wb, 'trading_contracts_template.xlsx');
  }

  addContract() {
    if (!this.formData.monthYear || !this.formData.contractName || 
        this.formData.contractPnL === null || isNaN(this.formData.contractPnL)) {
      alert('Please fill all fields correctly');
      return;
    }

    this.contracts.push({
      monthYear: this.formData.monthYear,
      name: this.formData.contractName,
      type: this.formData.contractType,
      pnl: this.formData.contractPnL
    });

    this.formData.contractName = '';
    this.formData.contractPnL = null;
    this.formData.contractType = 'regular';
  }

  deleteContract(index: number) {
    this.contracts.splice(index, 1);
  }

  clearAll() {
    if (confirm('Are you sure you want to clear all contracts?')) {
      this.contracts = [];
    }
  }

  getTotalPnL(): number {
    return this.contracts.reduce((sum, c) => sum + c.pnl, 0);
  }

  getTotalProfit(): number {
    return this.contracts.filter(c => c.pnl > 0).reduce((sum, c) => sum + c.pnl, 0);
  }

  getTotalLoss(): number {
    return Math.abs(this.contracts.filter(c => c.pnl < 0).reduce((sum, c) => sum + c.pnl, 0));
  }

  getRegularProfitTotal(): number {
    return this.contracts
      .filter(c => c.type === 'regular' && c.pnl > 0)
      .reduce((sum, c) => sum + c.pnl, 0);
  }

  getRegularLossTotal(): number {
    return Math.abs(this.contracts
      .filter(c => c.type === 'regular' && c.pnl < 0)
      .reduce((sum, c) => sum + c.pnl, 0));
  }

  getMajorProfits(): Contract[] {
    return this.contracts
      .filter(c => c.type === 'regular' && c.pnl > 0)
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 12);
  }

  getMajorLosses(): Contract[] {
    return this.contracts
      .filter(c => c.type === 'regular' && c.pnl < 0)
      .sort((a, b) => a.pnl - b.pnl)
      .slice(0, 12);
  }

  getNiftyProfits(): Contract[] {
    return this.contracts
      .filter(c => c.type === 'nifty' && c.pnl > 0 && !this.isNiftyOption(c))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 5);
  }

  getNiftyLosses(): Contract[] {
    return this.contracts
      .filter(c => c.type === 'nifty' && c.pnl < 0 && !this.isNiftyOption(c))
      .sort((a, b) => a.pnl - b.pnl)
      .slice(0, 5);
  }

  getNiftyFuturesTotal(): number {
    return this.contracts
      .filter(c => c.type === 'nifty' && !this.isNiftyOption(c))
      .reduce((sum, c) => sum + c.pnl, 0);
  }

  getNiftyFuturesProfitTotal(): number {
    return this.contracts
      .filter(c => c.type === 'nifty' && !this.isNiftyOption(c) && c.pnl > 0)
      .reduce((sum, c) => sum + c.pnl, 0);
  }

  getNiftyFuturesLossTotal(): number {
    return Math.abs(this.contracts
      .filter(c => c.type === 'nifty' && !this.isNiftyOption(c) && c.pnl < 0)
      .reduce((sum, c) => sum + c.pnl, 0));
  }

  isNiftyOption(contract: Contract): boolean {
    const name = contract.name.toUpperCase();
    return name.includes('NIFTY') && (name.includes('CE') || name.includes('PE'));
  }

  getNiftyOptionsTotal(): number {
    return this.contracts
      .filter(c => this.isNiftyOption(c))
      .reduce((sum, c) => sum + c.pnl, 0);
  }

  getNiftyOptionsProfitTotal(): number {
    return this.contracts
      .filter(c => this.isNiftyOption(c) && c.pnl > 0)
      .reduce((sum, c) => sum + c.pnl, 0);
  }

  getNiftyOptionsLossTotal(): number {
    return Math.abs(this.contracts
      .filter(c => this.isNiftyOption(c) && c.pnl < 0)
      .reduce((sum, c) => sum + c.pnl, 0));
  }

  getNiftyOptionTopProfits(): Contract[] {
    return this.contracts
      .filter(c => this.isNiftyOption(c) && c.pnl > 0)
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 5);
  }

  getNiftyOptionTopLosses(): Contract[] {
    return this.contracts
      .filter(c => this.isNiftyOption(c) && c.pnl < 0)
      .sort((a, b) => a.pnl - b.pnl)
      .slice(0, 5);
  }

  getMonthName(): string {
    if (this.contracts.length === 0) return '';
    // Use the most recent (max) monthYear from all contracts to avoid relying on array order
    const latest = this.contracts
      .map(c => c.monthYear)
      .filter(Boolean)
      .reduce((max, curr) => {
        const mDate = new Date(max + '-01').getTime();
        const cDate = new Date(curr + '-01').getTime();
        return cDate > mDate ? curr : max;
      });
    const date = new Date(latest + '-01');
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
  }

  formatMonth(monthYear: string): string {
    if (!monthYear) return '';
    const date = new Date(monthYear + '-01');
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  formatNumber(num: number): string {
    return Math.abs(num).toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }

  trackByIndex(index: number): number {
    return index;
  }

  async exportDashboardAsImage() {
    const dashboardElement = document.getElementById('dashboard-content');
    if (!dashboardElement) {
      alert('Dashboard not found');
      return;
    }

    // Add a non-invasive solid background overlay for export clarity (beneath content)
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = '#1a2332';
    overlay.style.zIndex = '-1';
    dashboardElement.style.position = 'relative';
    dashboardElement.prepend(overlay);

    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      // Primary: html-to-image (crisper via SVG foreignObject)
      const dataUrl = await toPng(dashboardElement, {
        backgroundColor: '#1a2332',
        pixelRatio: 3,
        cacheBust: true,
      });
      overlay.remove();
      dashboardElement.style.position = '';
      const link = document.createElement('a');
      link.download = `trading-dashboard-${this.getMonthName().replace(/\s/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (primaryError) {
      // Fallback: html2canvas tuned
      try {
        const canvas = await html2canvas(dashboardElement, {
          backgroundColor: '#1a2332',
          scale: 3,
          logging: false,
          useCORS: true,
          allowTaint: false,
          width: dashboardElement.offsetWidth,
          height: dashboardElement.offsetHeight
        });
        overlay.remove();
        dashboardElement.style.position = '';
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const fileName = `trading-dashboard-${this.getMonthName().replace(/\s/g, '-')}.png`;
            link.download = fileName;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
          }
        }, 'image/png');
      } catch (fallbackError) {
        overlay.remove();
        dashboardElement.style.position = '';
        console.error('Error exporting dashboard:', fallbackError);
        alert('Failed to export dashboard. Please try again.');
      }
    }
  }

  // Smart month detection from contract names
  private detectMonthFromContracts(jsonData: any[][]): string | null {
    const monthCounts = new Map<string, number>();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12
    
    // Month patterns to detect in contract names
    const monthPatterns = [
      { pattern: /JAN/i, month: 1 },
      { pattern: /FEB/i, month: 2 },
      { pattern: /MAR/i, month: 3 },
      { pattern: /APR/i, month: 4 },
      { pattern: /MAY/i, month: 5 },
      { pattern: /JUN/i, month: 6 },
      { pattern: /JUL/i, month: 7 },
      { pattern: /AUG/i, month: 8 },
      { pattern: /SEP/i, month: 9 },
      { pattern: /OCT/i, month: 10 },
      { pattern: /NOV/i, month: 11 },
      { pattern: /DEC/i, month: 12 },
      // Single letter NIFTY patterns: N11 = Nov (11th month), D12 = Dec (12th month)
      { pattern: /N11/i, month: 11 },
      { pattern: /D12/i, month: 12 },
      { pattern: /J01/i, month: 1 },  // Jan
      { pattern: /F02/i, month: 2 },  // Feb
      { pattern: /M03/i, month: 3 },  // Mar
      { pattern: /A04/i, month: 4 },  // Apr
      { pattern: /M05/i, month: 5 },  // May
      { pattern: /J06/i, month: 6 },  // Jun
      { pattern: /J07/i, month: 7 },  // Jul
      { pattern: /A08/i, month: 8 },  // Aug
      { pattern: /S09/i, month: 9 },  // Sep
      { pattern: /O10/i, month: 10 }, // Oct
    ];

    let contractsWithMonthInfo = 0;
    let totalContracts = 0;

    // Parse contract names and count months
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (row[0]) {
        totalContracts++;
        const contractName = String(row[0]).trim().toUpperCase();
        
        // Try to extract year from contract name (25 = 2025, 26 = 2026)
        let year = currentYear;
        const yearMatch = contractName.match(/(\d{2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|[JFMASOND]\d{2})/i);
        if (yearMatch) {
          const shortYear = parseInt(yearMatch[1]);
          year = shortYear >= 0 && shortYear <= 50 ? 2000 + shortYear : 1900 + shortYear;
        }
        
        // Check each month pattern
        let monthFound = false;
        for (const { pattern, month } of monthPatterns) {
          if (pattern.test(contractName)) {
            const monthKey = `${year}-${String(month).padStart(2, '0')}`;
            monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
            contractsWithMonthInfo++;
            monthFound = true;
            break; // Only count first match per contract
          }
        }
      }
    }

    // If we found month info in at least some contracts, use the most common one
    if (contractsWithMonthInfo > 0) {
      let maxCount = 0;
      let detectedMonth: string | null = null;
      
      for (const [month, count] of monthCounts) {
        if (count > maxCount) {
          maxCount = count;
          detectedMonth = month;
        }
      }
      
      return detectedMonth;
    }

    // Fallback: If no month patterns found in any contract, use current month
    return `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  }
}
