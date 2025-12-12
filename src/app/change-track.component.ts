import { Component, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoogleDriveService } from './google-drive.service';
import * as XLSX from 'xlsx';

interface ChangeEntry { 
  date: string; 
  value: number; 
  open?: number; 
  close?: number; 
  volume?: number;
  isEditing?: boolean;
  editDate?: string;
  editValue?: number;
  editOpen?: number;
  editClose?: number;
  editVolume?: number;
}
interface ChangeCard { 
  name: string; 
  entries: ChangeEntry[]; 
  newEntryDate: string; 
  newEntryValue: number | null; 
  newEntryOpen?: number | null; 
  newEntryClose?: number | null; 
  newEntryVolume?: number | null; 
  duplicateDate?: boolean; 
  expanded?: boolean;
  selectedFromDate?: string; // Date picker for change calculation
  calculatedChange?: number; // Calculated change from selected date to latest
  daysCount?: number; // Number of days for which change is calculated
}

interface ChangeTrackData {
  version: string;
  lastModified: string;
  data: { [key: string]: ChangeEntry[] };
}

@Component({
  selector: 'app-change-track',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ct-container">
      <div class="ct-header">
        <h1>🔄 Change Track</h1>
        <p class="subtitle">Track daily change values per contract</p>
      </div>

      <!-- Status Messages -->
      <div *ngIf="statusMessage" class="status-message" [class.success]="statusType === 'success'" [class.error]="statusType === 'error'">
        {{ statusMessage }}
      </div>

      <div class="add-contract-bar">
        <input type="text" [(ngModel)]="newContractName" placeholder="Enter contract name (e.g., WIPRO25DECFUT)" />
        <button (click)="addContract()">ADD</button>
        <input 
          type="file" 
          id="excelUpload"
          accept=".xlsx,.xls,.csv"
          (change)="onExcelUpload($event)"
          style="display: none">
        <label for="excelUpload" class="btn-upload">📊 Upload Excel</label>
        <button class="clear-btn" (click)="clearAllCards()">CLEAR PAGE DATA</button>
        
        <!-- Google Drive Sync Button -->
        <button 
          *ngIf="driveService.isConnected()" 
          (click)="syncGoogleDrive()" 
          class="btn-sync-drive"
          [disabled]="isSyncing">
          {{ isSyncing ? '⏳ Syncing...' : '🔄 Sync Drive' }}
        </button>
      </div>
      <div *ngIf="duplicateWarning" class="warn">Contract already exists.</div>

      <div class="cards-wrapper" [class.expanding]="anyExpanded">
        <div *ngFor="let card of cards; trackBy: trackByName" class="ct-card" [class.expanded]="card.expanded">
          <div class="card-header">
            <div class="card-title">{{ card.name }}</div>
            <div class="change-calculator">
              <input 
                type="date" 
                [(ngModel)]="card.selectedFromDate" 
                (ngModelChange)="calculateChange(card)"
                [max]="getLatestDate(card)"
                class="date-picker-small"
              />
              <span class="calculated-change" [class.profit]="(card.calculatedChange || 0) >= 0" [class.loss]="(card.calculatedChange || 0) < 0">
                {{ (card.calculatedChange || 0) >= 0 ? '+' : '' }}{{ formatNumber(card.calculatedChange || 0) }}
              </span>
              <span class="days-badge">{{ card.daysCount || 0 }}d</span>
            </div>
            <div class="header-actions">
              <button class="icon-btn add header-add" (click)="addEntry(card)" aria-label="Add change entry"><span class="plus-icon">+</span></button>
              <button class="icon-btn delete-card" (click)="deleteCard(card)" aria-label="Delete card">🗑️</button>
              <button class="icon-btn fullscreen" (click)="toggleExpand(card)" [attr.aria-label]="card.expanded ? 'Exit full screen' : 'Full screen'">⛶</button>
              <button *ngIf="card.expanded" class="icon-btn close" (click)="toggleExpand(card)" aria-label="Close fullscreen">✖</button>
            </div>
          </div>
          <div class="entry-add-row">
            <input type="date" [(ngModel)]="card.newEntryDate" class="input-date" />
            <input type="number" [(ngModel)]="card.newEntryValue" placeholder="Change" class="input-change" />
            <input type="number" [(ngModel)]="card.newEntryOpen" placeholder="Open" class="input-small" />
            <input type="number" [(ngModel)]="card.newEntryClose" placeholder="Close" class="input-small" />
            <input type="number" [(ngModel)]="card.newEntryVolume" placeholder="Volume" class="input-small" />
          </div>
          <div *ngIf="card.duplicateDate" class="warn small">Date already recorded.</div>
          <div *ngIf="card.entries.length === 0" class="empty">No changes recorded yet.</div>
          <div class="entry-list-wrapper">
            <div class="entry-list">
              <div *ngFor="let e of card.entries; let i = index" class="entry-item" [class.editing]="e.isEditing">
              <!-- View Mode -->
              <ng-container *ngIf="!e.isEditing">
                <span class="date">{{ formatDisplayDate(e.date) }}</span>
                <span class="value-wrapper">
                  <span class="value" [class.profit]="e.value >= 0" [class.loss]="e.value < 0">
                    {{ e.value >= 0 ? '+' : '-' }}₹{{ formatNumber(e.value) }}
                  </span>
                  <div *ngIf="e.open !== undefined || e.close !== undefined || e.volume !== undefined" class="tooltip-bubble">
                    <div class="tooltip-row" *ngIf="e.open !== undefined"><strong>Open:</strong> ₹{{ formatNumber(e.open) }}</div>
                    <div class="tooltip-row" *ngIf="e.close !== undefined"><strong>Close:</strong> ₹{{ formatNumber(e.close) }}</div>
                    <div class="tooltip-row" *ngIf="e.volume !== undefined"><strong>Volume:</strong> {{ e.volume.toLocaleString('en-IN') }}</div>
                  </div>
                </span>
                <div class="entry-actions">
                  <button class="icon-btn edit" (click)="startEdit(e)" title="Edit">✎</button>
                  <button class="icon-btn delete" (click)="deleteEntry(card, i)" title="Delete">−</button>
                </div>
              </ng-container>
              <!-- Edit Mode -->
              <ng-container *ngIf="e.isEditing">
                <input type="date" [(ngModel)]="e.editDate" class="edit-input-date" />
                <input type="number" [(ngModel)]="e.editValue" class="edit-input-value" />
                <input type="number" [(ngModel)]="e.editOpen" placeholder="Open" class="edit-input-small" />
                <input type="number" [(ngModel)]="e.editClose" placeholder="Close" class="edit-input-small" />
                <input type="number" [(ngModel)]="e.editVolume" placeholder="Vol" class="edit-input-small" />
                <div class="entry-actions">
                  <button class="icon-btn save" (click)="saveEdit(card, e)" title="Save">✓</button>
                  <button class="icon-btn cancel" (click)="cancelEdit(e)" title="Cancel">✖</button>
                </div>
              </ng-container>
            </div>
          </div>
        </div>
      </div>

      <div class="footer-note">Data is stored locally (no backend). See <code>docs/change-track-requirements.md</code> for roadmap.</div>
    </div>
  `,
  styles: [`
    .ct-container { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 24px; display:flex; flex-direction: column; gap:24px; }
    h1 { font-size: 1.4em; color:#ffc107; letter-spacing:1px; }
    .subtitle { font-size:0.8em; color:#bbb; margin-top:4px; }
    .add-contract-bar { display:flex; gap:12px; }
    .add-contract-bar input[type="text"] { flex:1; padding:10px 14px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); border-radius:8px; color:#fff; font-size:0.9em; }
    .add-contract-bar button { padding:10px 20px; background:#2196f3; border:none; border-radius:8px; color:#fff; font-weight:600; cursor:pointer; font-size:0.85em; letter-spacing:1px; }
    .add-contract-bar button:hover { background:#1976d2; }
    .btn-upload { padding:10px 20px; background:#4caf50; border:none; border-radius:8px; color:#fff; font-weight:600; cursor:pointer; font-size:0.85em; letter-spacing:1px; display:inline-block; }
    .btn-upload:hover { background:#43a047; }
    .clear-btn { background: rgba(255,255,255,0.15); }
    .clear-btn:hover { background: rgba(255,255,255,0.25); }
    .warn { color:#ff6e6e; font-size:0.75em; }
    .cards-wrapper { display:grid; grid-template-columns: repeat(auto-fill,minmax(500px,1fr)); gap:18px; align-items:start; }
    .ct-card { background: rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:14px 16px; display:flex; flex-direction: column; gap:12px; position:relative; overflow:visible; }
    .card-header { display:flex; align-items:center; gap:10px; justify-content: space-between; }
    .header-actions { display:flex; gap:6px; align-items:center; flex-shrink: 0; }
    .card-title { font-size:0.9em; font-weight:600; letter-spacing:1px; color:#ffc107; white-space: nowrap; flex-shrink: 0; }
    .change-calculator { display:flex; align-items:center; gap:6px; flex-wrap: nowrap; flex: 1; justify-content: flex-end; margin: 0 10px; }
    .date-picker-small { padding:3px 6px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,193,7,0.3); border-radius:6px; color:#fff; font-size:0.65em; cursor:pointer; min-width: 90px; }
    .date-picker-small::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; width: 12px; height: 12px; }
    .calculated-change { font-size:0.8em; font-weight:700; padding:4px 10px; border-radius:6px; background:rgba(0,0,0,0.3); white-space: nowrap; min-width: 60px; text-align: center; }
    .calculated-change.profit { color:#4caf50; }
    .calculated-change.loss { color:#f44336; }
    .days-badge { font-size:0.75em; font-weight:700; padding:2px 6px; border-radius:50%; color:#ffc107; border:1.5px solid rgba(255, 255, 255, 0.7); white-space: nowrap; min-width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; }
    .entry-add-row { display:grid; grid-template-columns: 110px 120px 85px 85px 85px; gap:6px; align-items:center; z-index:1; margin-top:4px; }
    .warn.small { font-size:0.65em; margin-top:-4px; }
    .entry-add-row input { padding:6px 8px; background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.15); border-radius:6px; color:#fff; font-size:0.8em; width:100%; box-sizing:border-box; }
    .entry-add-row .input-date { font-size:0.75em; }
    .entry-add-row .input-change { }
    .entry-add-row .input-small { font-size:0.75em; }
    .icon-btn { border:none; cursor:pointer; padding:8px 10px; border-radius:8px; font-size:0.9em; display:flex; align-items:center; justify-content:center; font-weight:600; }
    .icon-btn.add { background:#4caf50; color:#fff; width:42px; height:34px; font-size:1.3em; line-height:1; display:flex; align-items:center; justify-content:center; font-weight:700; border:1px solid rgba(255,255,255,0.3); }
    .icon-btn.add.header-add { flex-shrink:0; }
    .icon-btn.add .plus-icon { pointer-events:none; }
    .icon-btn.add:hover { background:#43a047; }
    .icon-btn.fullscreen { background: rgba(255,255,255,0.15); color:#fff; width:38px; height:34px; font-size:1.1em; border:1px solid rgba(255,255,255,0.25); }
    .icon-btn.fullscreen:hover { background: rgba(255,255,255,0.25); }
    .icon-btn.delete-card { background: #ff6e6e; color:#fff; width:38px; height:34px; font-size:0.9em; border:1px solid rgba(255,255,255,0.25); }
    .icon-btn.delete-card:hover { background: #f44336; }
    .icon-btn.close { background:#ff6e6e; color:#fff; width:38px; height:34px; font-size:1.1em; border:1px solid rgba(255,255,255,0.25); margin-right:68px; }
    .icon-btn.close:hover { background:#f44336; }
    .icon-btn.delete { background:#ff6e6e; color:#fff; }
    .icon-btn.delete:hover { background:#f44336; }
    .icon-btn.edit { background:#2196f3; color:#fff; font-size:0.8em; padding:6px 8px; }
    .icon-btn.edit:hover { background:#1976d2; }
    .icon-btn.save { background:#4caf50; color:#fff; font-size:0.9em; padding:6px 8px; }
    .icon-btn.save:hover { background:#43a047; }
    .icon-btn.cancel { background:#ff9800; color:#fff; font-size:0.8em; padding:6px 8px; }
    .icon-btn.cancel:hover { background:#f57c00; }
    .entry-actions { display:flex; gap:4px; opacity:0; transition: opacity 0.2s ease-in-out; }
    .entry-item:hover .entry-actions { opacity:1; }
    .entry-item.editing { grid-template-columns: 110px 120px 85px 85px 85px 100px; background:rgba(33,150,243,0.08); padding:8px 4px; border-radius:6px; }
    .entry-item.editing .entry-actions { opacity:1; }
    .edit-input-date, .edit-input-value, .edit-input-small { padding:6px 8px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.3); border-radius:4px; color:#fff; font-size:0.8em; width:100%; box-sizing:border-box; }
    .edit-input-date { font-size:0.75em; }
    .edit-input-small { font-size:0.75em; }
    .empty { font-size:0.7em; color:#777; padding:4px 0; }
    .entry-list-wrapper { position:relative; overflow:visible; }
    .entry-list { display:flex; flex-direction:column; gap:6px; max-height:360px; overflow-y:auto; overflow-x:visible; padding-right:4px; }
    .entry-list::-webkit-scrollbar { width:8px; }
    .entry-list::-webkit-scrollbar-track { background:rgba(255,255,255,0.05); border-radius:4px; }
    .entry-list::-webkit-scrollbar-thumb { background:rgba(255,193,7,0.4); border-radius:4px; }
    .entry-list::-webkit-scrollbar-thumb:hover { background:rgba(255,193,7,0.6); }
    .ct-card.expanded::-webkit-scrollbar { width:10px; }
    .ct-card.expanded::-webkit-scrollbar-track { background:rgba(255,255,255,0.05); border-radius:5px; }
    .ct-card.expanded::-webkit-scrollbar-thumb { background:rgba(255,193,7,0.4); border-radius:5px; }
    .ct-card.expanded::-webkit-scrollbar-thumb:hover { background:rgba(255,193,7,0.6); }
    .ct-card.expanded { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 1000; margin:0; border-radius:0; padding:28px 36px; background:#1a2332; box-shadow: 0 0 0 9999px rgba(0,0,0,0.6); overflow:auto; display:flex; flex-direction:column; }
    .ct-card.expanded .entry-list { max-height: none; }
    .ct-card.expanded { padding:40px 56px; }
    .ct-card.expanded .card-title { font-size:1.2em; }
    .ct-card.expanded .entry-item { padding:12px 4px; grid-template-columns: 160px 1fr 54px; }
    .ct-card.expanded .value { font-size:1em; }
    .ct-card.expanded .date { font-size:0.75em; }
    .ct-card.expanded .entry-add-row input { font-size:0.9em; }
    .ct-card.expanded .entry-add-row input { font-size:0.9em; }
    .cards-wrapper.expanding .ct-card:not(.expanded) { display:none; }
    .entry-item { display:grid; grid-template-columns: 100px 1fr 80px; gap:8px; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06); position:relative; }
    .entry-item:last-child { border-bottom:none; }
    .date { font-size:0.7em; color:#bbb; }
    .value { font-size:0.85em; font-weight:600; text-align:left; }
    .value.profit { color:#4caf50; }
    .value.loss { color:#ff6e6e; }
    .value-wrapper { position:relative; display:inline-block; cursor:help; }
    .value-wrapper:hover .tooltip-bubble { display:block; }
    .tooltip-bubble { display:none; position:absolute; background:rgba(0,0,0,0.9); color:#fff; padding:8px 12px; border-radius:6px; font-size:0.75em; z-index:99999; pointer-events:none; white-space:nowrap; margin-left:15px; margin-top:-30px; }
    .tooltip-row { margin:3px 0; }
    .tooltip-row strong { color:#ffc107; margin-right:8px; }
    .footer-note { font-size:0.6em; color:#888; text-align:center; margin-top:4px; }
    code { background: rgba(0,0,0,0.3); padding:2px 6px; border-radius:6px; font-size:0.85em; }
    
    .btn-sync-drive {
      padding: 10px 20px;
      background: #4285f4;
      border: none;
      border-radius: 8px;
      color: #fff;
      font-size: 0.85em;
      font-weight: 600;
      cursor: pointer;
      letter-spacing: 1px;
      transition: all 0.3s;
    }
    
    .btn-sync-drive:hover:not(:disabled) {
      background: #3367d6;
    }
    
    .btn-sync-drive:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .status-message {
      padding: 12px 18px;
      border-radius: 8px;
      font-size: 0.9em;
      font-weight: 600;
      margin-bottom: 16px;
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
export class ChangeTrackComponent implements OnInit {
  newContractName = '';
  cards: ChangeCard[] = [];
  duplicateWarning = false;
  private storageKey = 'changeTrackData';
  private driveFileName = 'change-track-data.json';
  private driveFileId: string | null = null;
  isSyncing = false;
  statusMessage = '';
  statusType: 'success' | 'error' = 'success';

  constructor(
    public driveService: GoogleDriveService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadFromStorage();
    this.loadDriveFileId();
    // Initialize calculations for all cards
    this.cards.forEach(card => this.initializeCardCalculation(card));
  }

  trackByName(index: number, card: ChangeCard) { return card.name; }

  addContract() {
    const raw = (this.newContractName || '').trim();
    if (!raw) return;
    const exists = this.cards.some(c => c.name.toLowerCase() === raw.toLowerCase());
    if (exists) { this.duplicateWarning = true; setTimeout(()=> this.duplicateWarning = false, 2000); return; }
    const today = this.getToday();
    const newCard: ChangeCard = { name: raw, entries: [], newEntryDate: today, newEntryValue: null };
    this.cards.push(newCard);
    this.newContractName = '';
    this.saveToStorage();
    this.initializeCardCalculation(newCard);
  }

  onExcelUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) {
          this.showStatus('❌ Excel file is empty or invalid', 'error');
          event.target.value = '';
          return;
        }

        // Get contract name from file name (remove extension)
        const fileName = file.name;
        const contractName = fileName.replace(/\.(xlsx|xls|csv)$/i, '').trim();
        if (!contractName) {
          this.showStatus('❌ File name is empty. Please provide a valid file name as contract name.', 'error');
          event.target.value = '';
          return;
        }

        // Check if contract already exists
        const exists = this.cards.some(c => c.name.toLowerCase() === contractName.toLowerCase());
        if (exists) {
          this.showStatus(`⚠️ Contract "${contractName}" already exists`, 'error');
          event.target.value = '';
          return;
        }

        // Parse entries starting from row 2 (skip row 1 header: Date, Change, Open, Close, Volume)
        const entries: ChangeEntry[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row[0] && row[1] !== undefined) {
            const dateValue = row[0];
            const changeValue = Number(row[1]);
            const openValue = row[2] !== undefined && row[2] !== '' ? Number(row[2]) : undefined;
            const closeValue = row[3] !== undefined && row[3] !== '' ? Number(row[3]) : undefined;
            const volumeValue = row[4] !== undefined && row[4] !== '' ? Number(row[4]) : undefined;

            // Handle Excel date serial number
            let dateStr: string;
            if (typeof dateValue === 'number') {
              // Excel serial date to JavaScript Date
              const excelDate = XLSX.SSF.parse_date_code(dateValue);
              dateStr = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
            } else {
              // Assume it's already a string in YYYY-MM-DD format
              dateStr = String(dateValue).trim();
            }

            if (dateStr && !isNaN(changeValue)) {
              const entry: ChangeEntry = { date: dateStr, value: changeValue };
              if (openValue !== undefined && !isNaN(openValue)) entry.open = openValue;
              if (closeValue !== undefined && !isNaN(closeValue)) entry.close = closeValue;
              if (volumeValue !== undefined && !isNaN(volumeValue)) entry.volume = volumeValue;
              entries.push(entry);
            }
          }
        }

        if (entries.length === 0) {
          this.showStatus('⚠️ No valid entries found in Excel file', 'error');
          event.target.value = '';
          return;
        }

        // Create new card with entries
        const today = this.getToday();
        const newCard: ChangeCard = {
          name: contractName,
          entries: entries,
          newEntryDate: today,
          newEntryValue: null
        };
        this.cards.push(newCard);
        this.saveToStorage();
        this.initializeCardCalculation(newCard);

        // Trigger change detection to refresh the view immediately
        this.cdr.detectChanges();

        this.showStatus(`✅ Successfully imported "${contractName}" with ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}!`, 'success');
        event.target.value = '';
      } catch (error) {
        console.error('Error reading Excel file:', error);
        this.showStatus('❌ Error reading Excel file. Please check the format.', 'error');
        event.target.value = '';
      }
    };

    reader.readAsArrayBuffer(file);
  }

  addEntry(card: ChangeCard) {
    if (card.newEntryValue === null || isNaN(card.newEntryValue)) return;
    const date = card.newEntryDate || this.getToday();
    const exists = card.entries.some(e => e.date === date);
    if (exists) {
      card.duplicateDate = true;
      setTimeout(() => { card.duplicateDate = false; }, 1800);
      return;
    }
    const entry: ChangeEntry = { date, value: card.newEntryValue };
    if (card.newEntryOpen !== null && card.newEntryOpen !== undefined) entry.open = card.newEntryOpen;
    if (card.newEntryClose !== null && card.newEntryClose !== undefined) entry.close = card.newEntryClose;
    if (card.newEntryVolume !== null && card.newEntryVolume !== undefined) entry.volume = card.newEntryVolume;
    card.entries.unshift(entry);
    card.newEntryValue = null;
    card.newEntryOpen = null;
    card.newEntryClose = null;
    card.newEntryVolume = null;
    this.saveToStorage();
    this.calculateChange(card);
  }

  toggleExpand(card: ChangeCard) {
    card.expanded = !card.expanded;
  }

  get anyExpanded(): boolean { return this.cards.some(c => c.expanded); }

  @HostListener('window:keydown', ['$event'])
  handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      const expanded = this.cards.find(c => c.expanded);
      if (expanded) expanded.expanded = false;
    }
  }

  clearAllCards() {
    if (!this.cards.length) return;
    const confirmClear = confirm('Clear all change track data? This cannot be undone.');
    if (!confirmClear) return;
    this.cards = [];
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem(this.storageKey); } catch {}
    }
  }

  deleteCard(card: ChangeCard) {
    const confirmDelete = confirm(`Delete contract "${card.name}" and all its entries? This cannot be undone.`);
    if (!confirmDelete) return;
    const index = this.cards.indexOf(card);
    if (index > -1) {
      this.cards.splice(index, 1);
      this.saveToStorage();
    }
  }

  deleteEntry(card: ChangeCard, index: number) {
    card.entries.splice(index, 1);
    this.saveToStorage();
    // Recalculate change after deletion
    this.calculateChange(card);
  }

  startEdit(entry: ChangeEntry) {
    entry.isEditing = true;
    entry.editDate = entry.date;
    entry.editValue = entry.value;
    entry.editOpen = entry.open;
    entry.editClose = entry.close;
    entry.editVolume = entry.volume;
  }

  saveEdit(card: ChangeCard, entry: ChangeEntry) {
    if (!entry.editDate || entry.editValue === null || entry.editValue === undefined) {
      alert('Please fill in date and change value');
      return;
    }

    // Check for duplicate date (exclude current entry)
    const duplicate = card.entries.some(e => e !== entry && e.date === entry.editDate);
    if (duplicate) {
      alert('This date already exists for another entry');
      return;
    }

    // Update entry
    entry.date = entry.editDate!;
    entry.value = entry.editValue!;
    entry.open = entry.editOpen !== null && entry.editOpen !== undefined ? entry.editOpen : undefined;
    entry.close = entry.editClose !== null && entry.editClose !== undefined ? entry.editClose : undefined;
    entry.volume = entry.editVolume !== null && entry.editVolume !== undefined ? entry.editVolume : undefined;
    
    // Clear edit mode
    entry.isEditing = false;
    delete entry.editDate;
    delete entry.editValue;
    delete entry.editOpen;
    delete entry.editClose;
    delete entry.editVolume;

    // Re-sort entries by date descending
    card.entries.sort((a, b) => b.date.localeCompare(a.date));
    
    this.saveToStorage();
    this.calculateChange(card);
  }

  cancelEdit(entry: ChangeEntry) {
    entry.isEditing = false;
    delete entry.editDate;
    delete entry.editValue;
    delete entry.editOpen;
    delete entry.editClose;
    delete entry.editVolume;
  }

  getToday(): string {
    const d = new Date();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  formatDisplayDate(date: string): string {
    if (!date) return '';
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Get latest date from card entries
  getLatestDate(card: ChangeCard): string {
    if (!card.entries || card.entries.length === 0) {
      return this.getToday();
    }
    // Sort entries by date and get the latest
    const sortedEntries = [...card.entries].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sortedEntries[0].date;
  }

  // Get default "from" date (5 days before latest, or earliest available)
  getDefaultFromDate(card: ChangeCard): string {
    if (!card.entries || card.entries.length === 0) {
      return this.getToday();
    }

    const sortedEntries = [...card.entries].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const latestDate = this.getLatestDate(card);
    const latest = new Date(latestDate);
    
    // Try to get date 6 days before latest (to ensure 5 days difference)
    const sixDaysBefore = new Date(latest);
    sixDaysBefore.setDate(sixDaysBefore.getDate() - 6);
    const sixDaysBeforeStr = this.formatDateToString(sixDaysBefore);

    // Find first entry that is >= 6 days before, or use earliest
    const entriesInRange = sortedEntries.filter(e => e.date >= sixDaysBeforeStr);
    
    if (entriesInRange.length > 0) {
      return entriesInRange[0].date;
    }

    // If no entries in last 6 days, return earliest
    return sortedEntries[0].date;
  }

  formatDateToString(date: Date): string {
    const m = String(date.getMonth()+1).padStart(2,'0');
    const day = String(date.getDate()).padStart(2,'0');
    return `${date.getFullYear()}-${m}-${day}`;
  }

  // Calculate change from selected date to latest date
  calculateChange(card: ChangeCard): void {
    if (!card.entries || card.entries.length === 0) {
      card.calculatedChange = 0;
      card.daysCount = 0;
      return;
    }

    const fromDate = card.selectedFromDate || this.getDefaultFromDate(card);
    const toDate = this.getLatestDate(card);

    // Filter entries between fromDate and toDate (inclusive)
    const relevantEntries = card.entries.filter(e => 
      e.date >= fromDate && e.date <= toDate
    );

    // Sum up all changes
    const totalChange = relevantEntries.reduce((sum, entry) => sum + entry.value, 0);
    card.calculatedChange = totalChange;

    // Calculate number of days
    card.daysCount = this.calculateDaysCount(fromDate, toDate);
  }

  // Calculate number of days between two dates
  calculateDaysCount(fromDate: string, toDate: string): number {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  // Initialize card with default from date and calculate change
  initializeCardCalculation(card: ChangeCard): void {
    if (!card.selectedFromDate) {
      card.selectedFromDate = this.getDefaultFromDate(card);
    }
    this.calculateChange(card);
  }

  formatNumber(num: number): string {
    return Math.abs(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const obj = JSON.parse(raw) as { [key: string]: ChangeEntry[] };
      this.cards = Object.keys(obj).map(name => ({ name, entries: obj[name].sort((a,b) => b.date.localeCompare(a.date)), newEntryDate: this.getToday(), newEntryValue: null }));
    } catch (e) { console.warn('Failed to load change track data', e); }
  }

  saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      const obj: { [key: string]: ChangeEntry[] } = {};
      for (const c of this.cards) { obj[c.name] = c.entries; }
      localStorage.setItem(this.storageKey, JSON.stringify(obj));
    } catch (e) { console.warn('Failed to save change track data', e); }
  }

  // Google Drive Integration Methods

  async syncGoogleDrive() {
    if (!this.driveService.isConnected()) {
      this.showStatus('Please connect Google Drive first', 'error');
      return;
    }

    this.isSyncing = true;
    this.cdr.detectChanges();

    try {
      // If no local data, load from Drive
      if (this.cards.length === 0) {
        await this.loadFromGoogleDrive();
      } else {
        // Otherwise, save to Drive
        await this.saveToGoogleDrive();
      }
    } catch (error) {
      console.error('Sync error:', error);
      this.showStatus('❌ Sync failed: ' + (error as Error).message, 'error');
    } finally {
      this.isSyncing = false;
      this.cdr.detectChanges();
    }
  }

  private async saveToGoogleDrive() {
    const data: ChangeTrackData = {
      version: '1.0',
      lastModified: new Date().toISOString(),
      data: {}
    };

    for (const c of this.cards) {
      data.data[c.name] = c.entries;
    }

    try {
      if (this.driveFileId) {
        // Update existing file
        await this.driveService.updateFile(this.driveFileId, data);
        this.showStatus('✅ Synced to Google Drive!', 'success');
      } else {
        // Create new file
        const fileId = await this.driveService.createFile(this.driveFileName, data);
        this.driveFileId = fileId;
        this.saveDriveFileId();
        this.showStatus('✅ Synced to Google Drive!', 'success');
      }
    } catch (error) {
      throw error;
    }
  }

  private async loadFromGoogleDrive() {
    try {
      // Search for file
      let fileId = this.driveFileId;
      
      if (!fileId) {
        const file = await this.driveService.searchFile(this.driveFileName);
        if (file) {
          fileId = file.id;
          this.driveFileId = fileId;
          this.saveDriveFileId();
        } else {
          this.showStatus('ℹ️ No data found on Google Drive', 'error');
          return;
        }
      }

      // Download file content
      const driveData: ChangeTrackData = await this.driveService.downloadFile(fileId);
      
      // Merge with local data
      this.mergeWithLocalData(driveData.data);
      
      this.showStatus('✅ Data restored from Google Drive!', 'success');
    } catch (error) {
      throw error;
    }
  }

  private mergeWithLocalData(driveData: { [key: string]: ChangeEntry[] }) {
    const merged: { [key: string]: ChangeEntry[] } = {};
    
    // Start with existing local data
    for (const card of this.cards) {
      merged[card.name] = [...card.entries];
    }
    
    // Merge Drive data
    for (const name in driveData) {
      if (!merged[name]) {
        merged[name] = driveData[name];
      } else {
        // Merge entries by date (avoid duplicates)
        const existingDates = new Set(merged[name].map(e => e.date));
        for (const entry of driveData[name]) {
          if (!existingDates.has(entry.date)) {
            merged[name].push(entry);
          }
        }
        // Sort by date descending
        merged[name].sort((a, b) => b.date.localeCompare(a.date));
      }
    }

    // Update cards
    this.cards = Object.keys(merged).map(name => ({
      name,
      entries: merged[name],
      newEntryDate: this.getToday(),
      newEntryValue: null,
      expanded: false
    }));

    this.saveToStorage();
  }

  private loadDriveFileId() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('changeTrackDriveFileId');
      if (stored) {
        this.driveFileId = stored;
      }
    } catch (e) {
      console.warn('Failed to load Drive file ID', e);
    }
  }

  private saveDriveFileId() {
    if (typeof window === 'undefined' || !this.driveFileId) return;
    try {
      localStorage.setItem('changeTrackDriveFileId', this.driveFileId);
    } catch (e) {
      console.warn('Failed to save Drive file ID', e);
    }
  }

  private showStatus(message: string, type: 'success' | 'error') {
    this.statusMessage = message;
    this.statusType = type;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.statusMessage = '';
      this.cdr.detectChanges();
    }, 5000);
  }
}
