import { Component, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarkdownModule } from 'ngx-markdown';
import { GoogleDriveService } from './google-drive.service';

interface StockLevel {
  id: string;
  label: string; // Auto-generated: "Support1", "Support2", etc.
  value: number;
  timestamp: Date;
}

interface StockNote {
  id: string;
  text: string;
  timestamp: Date;
  format?: 'plain' | 'markdown'; // Default: 'markdown' for backward compatibility
}

interface StockCard {
  name: string;
  dateContext: string; // YYYY-MM-DD
  supports: StockLevel[];
  resistances: StockLevel[];
  notes: StockNote[];
  expanded: boolean;
  newSupportValue?: number | null;
  newResistanceValue?: number | null;
  newNoteText?: string;
}

interface StockRadarData {
  version: string;
  lastModified: string;
  cards: StockCard[];
}

@Component({
  selector: 'app-stock-radar',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownModule],
  template: `
    <div class="sr-container">
      <!-- Add Stock Card Bar -->
      <div class="add-stock-bar">
        <input 
          type="text" 
          [(ngModel)]="newStockName" 
          placeholder="Enter stock name (e.g., WIPRO)"
          class="stock-input"
        />
        <input 
          type="date" 
          [(ngModel)]="newStockDate" 
          class="date-input"
        />
        <button (click)="addStockCard()" class="btn-add-stock">+ Add Stock Card</button>
        
        <!-- Google Drive Sync Button -->
        <button 
          *ngIf="driveService.isConnected()" 
          (click)="syncGoogleDrive()" 
          class="btn-sync-drive"
          [disabled]="isSyncing">
          {{ isSyncing ? '⏳ Syncing...' : '🔄 Sync Drive' }}
        </button>
      </div>

      <!-- Status Messages -->
      <div *ngIf="statusMessage" class="status-message" [class.success]="statusType === 'success'" [class.error]="statusType === 'error'">
        {{ statusMessage }}
      </div>

      <!-- Warning Messages -->
      <div *ngIf="duplicateStockName" class="warning-msg">
        ⚠️ Stock card "{{ newStockName }}" already exists!
      </div>

      <!-- Cards Wrapper -->
      <div class="cards-wrapper" [class.expanding]="anyExpanded">
        <div 
          *ngFor="let card of stockCards" 
          class="sr-card"
          [class.expanded]="card.expanded"
        >
          <!-- Card Header -->
          <div class="card-header">
            <div class="header-left">
              <span class="expand-icon" (click)="toggleExpand(card)">
                {{ card.expanded ? '⌃' : '⌄' }}
              </span>
              <h3 class="stock-name">{{ card.name }}</h3>
            </div>
            <div class="header-right">
              <input 
                type="date" 
                [(ngModel)]="card.dateContext" 
                (change)="saveToLocalStorage()"
                class="date-picker"
              />
              <button (click)="clearCard(card)" class="btn-clear-card">Clear Card</button>
              <button 
                *ngIf="card.expanded" 
                class="icon-btn close" 
                (click)="toggleExpand(card)"
                title="Close fullscreen (ESC)"
              >×</button>
            </div>
          </div>

          <!-- Expanded Content -->
          <div *ngIf="card.expanded" class="card-content">
            
            <!-- Grid Layout for Cards -->
            <div class="content-grid">
              
              <!-- Support Card -->
              <div class="mini-card">
                <div class="mini-card-header">
                  <h4 class="mini-card-title">📍 Supports</h4>
                </div>
                <div class="mini-card-body">
                  <!-- Support Input Row -->
                  <div class="mini-input-row">
                    <input 
                      type="number" 
                      [(ngModel)]="card.newSupportValue" 
                      placeholder="Enter support level"
                      class="mini-level-input"
                      step="0.01"
                    />
                    <button (click)="addSupport(card)" class="btn-add-mini">+</button>
                  </div>

                  <!-- Supports List -->
                  <div *ngIf="card.supports.length > 0" class="mini-levels-list">
                    <div *ngFor="let support of card.supports; let i = index" class="mini-level-item">
                      <span class="mini-level-label">{{ support.label }}</span>
                      <span class="mini-level-value">{{ formatNumber(support.value) }}</span>
                      <button (click)="deleteSupport(card, i)" class="btn-delete-mini">−</button>
                    </div>
                  </div>

                  <div *ngIf="card.supports.length === 0" class="empty-mini-state">
                    No support levels added yet
                  </div>
                </div>
              </div>

              <!-- Resistance Card -->
              <div class="mini-card">
                <div class="mini-card-header">
                  <h4 class="mini-card-title">🎯 Resistances</h4>
                </div>
                <div class="mini-card-body">
                  <!-- Resistance Input Row -->
                  <div class="mini-input-row">
                    <input 
                      type="number" 
                      [(ngModel)]="card.newResistanceValue" 
                      placeholder="Enter resistance level"
                      class="mini-level-input"
                      step="0.01"
                    />
                    <button (click)="addResistance(card)" class="btn-add-mini">+</button>
                  </div>

                  <!-- Resistances List -->
                  <div *ngIf="card.resistances.length > 0" class="mini-levels-list">
                    <div *ngFor="let resistance of card.resistances; let i = index" class="mini-level-item">
                      <span class="mini-level-label">{{ resistance.label }}</span>
                      <span class="mini-level-value">{{ formatNumber(resistance.value) }}</span>
                      <button (click)="deleteResistance(card, i)" class="btn-delete-mini">−</button>
                    </div>
                  </div>

                  <div *ngIf="card.resistances.length === 0" class="empty-mini-state">
                    No resistance levels added yet
                  </div>
                </div>
              </div>

              <!-- Notes Card -->
              <div class="mini-card mini-card-wide">
                <div class="mini-card-header">
                  <h4 class="mini-card-title">📝 Development Notes</h4>
                </div>
                <div class="mini-card-body">
                  <!-- Notes Input Row -->
                  <div class="mini-input-row">
                    <textarea
                      [(ngModel)]="card.newNoteText" 
                      placeholder="Enter note (Markdown: **bold**, *italic*, - list)"
                      class="mini-note-input"
                      rows="3"
                    ></textarea>
                    <button (click)="addNote(card)" class="btn-add-mini">+</button>
                  </div>

                  <!-- Notes List -->
                  <div *ngIf="card.notes.length > 0" class="mini-notes-list">
                    <div *ngFor="let note of card.notes; let i = index" class="mini-note-item">
                      <div class="mini-note-text">
                        <markdown [data]="note.text"></markdown>
                      </div>
                      <button (click)="deleteNote(card, i)" class="btn-delete-mini">−</button>
                    </div>
                  </div>

                  <div *ngIf="card.notes.length === 0" class="empty-mini-state">
                    No development notes added yet
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="stockCards.length === 0" class="empty-state">
        <p>📊 No stock cards yet. Add your first stock to start tracking support and resistance levels!</p>
      </div>
    </div>
  `,
  styles: [`
    .sr-container {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Add Stock Bar */
    .add-stock-bar {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 8px;
    }

    .stock-input {
      flex: 1;
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 193, 7, 0.3);
      border-radius: 6px;
      color: #fff;
      font-size: 14px;
    }

    .date-input {
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 193, 7, 0.3);
      border-radius: 6px;
      color: #fff;
      font-size: 14px;
      min-width: 160px;
    }

    .btn-add-stock {
      padding: 10px 20px;
      background: #4caf50;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      transition: background 0.2s;
      white-space: nowrap;
    }

    .btn-add-stock:hover {
      background: #45a049;
    }

    /* Warning Message */
    .warning-msg {
      padding: 12px 16px;
      background: rgba(255, 152, 0, 0.15);
      border: 1px solid #ff9800;
      border-radius: 6px;
      color: #ff9800;
      margin-bottom: 16px;
      font-size: 14px;
    }

    /* Cards Wrapper */
    .cards-wrapper {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 20px;
    }

    .cards-wrapper.expanding .sr-card:not(.expanded) {
      display: none;
    }

    /* Stock Card */
    .sr-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 193, 7, 0.2);
      border-radius: 8px;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .sr-card.expanded {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: #1a2332;
      border-radius: 0;
      z-index: 1000;
      overflow-y: auto;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6);
    }

    /* Card Header */
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: rgba(255, 193, 7, 0.08);
      border-bottom: 1px solid rgba(255, 193, 7, 0.2);
    }

    .sr-card.expanded .card-header {
      padding: 20px 30px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .expand-icon {
      font-size: 20px;
      cursor: pointer;
      color: #ffc107;
      user-select: none;
      transition: transform 0.2s;
    }

    .expand-icon:hover {
      transform: scale(1.2);
    }

    .stock-name {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #ffc107;
    }

    .sr-card.expanded .stock-name {
      font-size: 24px;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .date-picker {
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 193, 7, 0.3);
      border-radius: 4px;
      color: #fff;
      font-size: 13px;
    }

    .sr-card.expanded .date-picker {
      padding: 10px 14px;
      font-size: 14px;
    }

    .btn-clear-card {
      padding: 8px 16px;
      background: #ff9800;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
      transition: background 0.2s;
      white-space: nowrap;
    }

    .btn-clear-card:hover {
      background: #f57c00;
    }

    .sr-card.expanded .btn-clear-card {
      padding: 10px 20px;
      font-size: 14px;
    }

    .icon-btn.close {
      width: 32px;
      height: 32px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      color: #fff;
      font-size: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      line-height: 1;
      padding: 0;
    }

    .icon-btn.close:hover {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.4);
    }

    /* Card Content */
    .card-content {
      padding: 20px;
    }

    .sr-card.expanded .card-content {
      padding: 24px 30px;
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Content Grid */
    .content-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    /* Mini Cards */
    .mini-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 193, 7, 0.2);
      border-radius: 8px;
      overflow: hidden;
    }

    .mini-card-wide {
      grid-column: span 2;
    }

    .mini-card-header {
      padding: 12px 16px;
      background: rgba(255, 193, 7, 0.08);
      border-bottom: 1px solid rgba(255, 193, 7, 0.2);
    }

    .mini-card-title {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      color: #ffc107;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .mini-card-body {
      padding: 16px;
    }

    /* Mini Input Rows */
    .mini-input-row {
      display: flex;
      gap: 10px;
      margin-bottom: 14px;
    }

    .mini-level-input, .mini-note-input {
      flex: 1;
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 193, 7, 0.3);
      border-radius: 6px;
      color: #fff;
      font-size: 13px;
      font-family: inherit;
      resize: vertical;
      min-height: 36px;
    }

    .mini-level-input::placeholder, .mini-note-input::placeholder {
      color: rgba(255, 255, 255, 0.4);
      font-size: 12px;
    }

    .btn-add-mini {
      width: 36px;
      height: 36px;
      background: #4caf50;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 18px;
      font-weight: 600;
      transition: background 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .btn-add-mini:hover {
      background: #45a049;
    }

    /* Mini Lists */
    .mini-levels-list, .mini-notes-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .mini-level-item {
      display: grid;
      grid-template-columns: 120px 1fr 36px;
      gap: 10px;
      align-items: center;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 6px;
    }

    .mini-level-label {
      font-size: 14px;
      font-weight: 600;
      color: #2196f3;
    }

    .mini-level-value {
      font-size: 15px;
      color: #fff;
      text-align: left;
    }

    .btn-delete-mini {
      width: 28px;
      height: 28px;
      background: #ff9800;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 18px;
      font-weight: 600;
      transition: background 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      flex-shrink: 0;
    }

    .btn-delete-mini:hover {
      background: #f57c00;
    }

    /* Mini Notes */
    .mini-note-item {
      display: grid;
      grid-template-columns: 1fr 36px;
      gap: 10px;
      align-items: center;
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.85);
      border-radius: 6px;
    }

    .mini-note-text {
      font-size: 15px;
      color: #1a1a1a;
      line-height: 1.6;
      word-wrap: break-word;
    }

    /* Markdown Styling in Notes */
    .mini-note-text markdown {
      display: block;
    }

    .mini-note-text markdown p {
      margin: 0 0 8px 0;
      color: #1a1a1a;
    }

    .mini-note-text markdown p:last-child {
      margin-bottom: 0;
    }

    .mini-note-text markdown strong {
      font-weight: 700;
      color: #d68000;
    }

    .mini-note-text markdown em {
      font-style: italic;
      color: #1565c0;
    }

    .mini-note-text markdown code {
      background: rgba(0, 0, 0, 0.08);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      color: #2e7d32;
    }

    .mini-note-text markdown pre {
      background: rgba(0, 0, 0, 0.05);
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 8px 0;
    }

    .mini-note-text markdown pre code {
      background: none;
      padding: 0;
      color: #388e3c;
    }

    .mini-note-text markdown ul,
    .mini-note-text markdown ol {
      margin: 8px 0;
      padding-left: 20px;
      color: #1a1a1a;
    }

    .mini-note-text markdown li {
      margin: 4px 0;
    }

    .mini-note-text markdown h1,
    .mini-note-text markdown h2,
    .mini-note-text markdown h3 {
      color: #d68000;
      margin: 12px 0 8px 0;
    }

    .mini-note-text markdown h1 {
      font-size: 18px;
      font-weight: 700;
    }

    .mini-note-text markdown h2 {
      font-size: 16px;
      font-weight: 600;
    }

    .mini-note-text markdown h3 {
      font-size: 15px;
      font-weight: 600;
    }

    .mini-note-text markdown a {
      color: #1565c0;
      text-decoration: none;
    }

    .mini-note-text markdown a:hover {
      text-decoration: underline;
    }

    .mini-note-text markdown blockquote {
      border-left: 3px solid #d68000;
      padding-left: 12px;
      margin: 8px 0;
      color: rgba(0, 0, 0, 0.7);
      font-style: italic;
    }

    .mini-note-text markdown hr {
      border: none;
      border-top: 1px solid rgba(0, 0, 0, 0.2);
      margin: 12px 0;
    }

    /* Empty State in Mini Cards */
    .empty-mini-state {
      text-align: center;
      padding: 20px;
      color: rgba(255, 255, 255, 0.4);
      font-size: 13px;
      font-style: italic;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: rgba(255, 255, 255, 0.5);
      font-size: 15px;
    }

    /* Input styles */
    input:focus {
      outline: none;
      border-color: #ffc107;
    }

    input[type="date"]::-webkit-calendar-picker-indicator {
      filter: invert(1);
      cursor: pointer;
    }

    input[type="number"]::-webkit-inner-spin-button,
    input[type="number"]::-webkit-outer-spin-button {
      opacity: 1;
    }

    /* Google Drive Section */
    .google-drive-section {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-left: auto;
    }

    .btn-connect-drive {
      padding: 10px 20px;
      background: linear-gradient(135deg, #4285f4 0%, #3367d6 100%);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.2s;
      box-shadow: 0 2px 4px rgba(66, 133, 244, 0.3);
      white-space: nowrap;
    }

    .btn-connect-drive:hover {
      background: linear-gradient(135deg, #3367d6 0%, #2851b8 100%);
      box-shadow: 0 4px 8px rgba(66, 133, 244, 0.4);
      transform: translateY(-1px);
    }

    .drive-controls {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .btn-sync-drive {
      padding: 10px 20px;
      background: #2196f3;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      transition: background 0.2s;
      white-space: nowrap;
    }

    .btn-sync-drive:hover:not(:disabled) {
      background: #1976d2;
    }

    .btn-sync-drive:disabled {
      background: #90caf9;
      cursor: not-allowed;
      opacity: 0.7;
    }

    /* Status Messages */
    .status-message {
      padding: 12px 20px;
      border-radius: 6px;
      margin-bottom: 16px;
      font-size: 14px;
      font-weight: 500;
      animation: slideIn 0.3s ease-out;
    }

    .status-message.success {
      background: rgba(76, 175, 80, 0.15);
      border: 1px solid #4caf50;
      color: #4caf50;
    }

    .status-message.error {
      background: rgba(244, 67, 54, 0.15);
      border: 1px solid #f44336;
      color: #f44336;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class StockRadarComponent implements OnInit {
  stockCards: StockCard[] = [];
  newStockName: string = '';
  newStockDate: string = this.getTodayDate();
  duplicateStockName: boolean = false;

  // Google Drive state
  private driveFileName = 'stock-radar-data.json';
  private driveFileId: string | null = null;
  isSyncing: boolean = false;
  statusMessage: string = '';
  statusType: 'success' | 'error' = 'success';

  constructor(
    private cdr: ChangeDetectorRef,
    public driveService: GoogleDriveService
  ) {}

  ngOnInit(): void {
    this.loadFromLocalStorage();
    this.loadDriveFileId();
    // Keep all cards collapsed on load
    if (this.stockCards.length > 0) {
      this.stockCards.forEach(c => c.expanded = false);
    }
  }

  get anyExpanded(): boolean {
    return this.stockCards.some(c => c.expanded);
  }

  getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  addStockCard(): void {
    const name = this.newStockName.trim();
    if (!name) {
      alert('Please enter a stock name');
      return;
    }

    // Check for duplicate
    if (this.stockCards.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      this.duplicateStockName = true;
      setTimeout(() => this.duplicateStockName = false, 3000);
      return;
    }

    const newCard: StockCard = {
      name: name,
      dateContext: this.newStockDate || this.getTodayDate(),
      supports: [],
      resistances: [],
      notes: [],
      expanded: this.stockCards.length === 0 // Expand if first card
    };

    this.stockCards.push(newCard);
    this.newStockName = '';
    this.newStockDate = this.getTodayDate();
    this.saveToLocalStorage();
  }

  toggleExpand(card: StockCard): void {
    // Collapse all other cards
    this.stockCards.forEach(c => {
      if (c !== card) c.expanded = false;
    });
    // Toggle current card
    card.expanded = !card.expanded;
  }

  clearCard(card: StockCard): void {
    if (confirm(`Clear all data for "${card.name}"?`)) {
      const index = this.stockCards.indexOf(card);
      if (index > -1) {
        this.stockCards.splice(index, 1);
        this.saveToLocalStorage();
      }
    }
  }

  // Support methods
  addSupport(card: StockCard): void {
    if (card.newSupportValue == null || card.newSupportValue === 0) {
      return;
    }

    const level: StockLevel = {
      id: Date.now().toString(),
      label: `Support${card.supports.length + 1}`,
      value: card.newSupportValue,
      timestamp: new Date()
    };

    card.supports.push(level);
    card.newSupportValue = null;
    this.saveToLocalStorage();
  }

  deleteSupport(card: StockCard, index: number): void {
    card.supports.splice(index, 1);
    // Re-label remaining supports
    card.supports.forEach((s, i) => {
      s.label = `Support${i + 1}`;
    });
    this.saveToLocalStorage();
  }

  // Resistance methods
  addResistance(card: StockCard): void {
    if (card.newResistanceValue == null || card.newResistanceValue === 0) {
      return;
    }

    const level: StockLevel = {
      id: Date.now().toString(),
      label: `Resistance${card.resistances.length + 1}`,
      value: card.newResistanceValue,
      timestamp: new Date()
    };

    card.resistances.push(level);
    card.newResistanceValue = null;
    this.saveToLocalStorage();
  }

  deleteResistance(card: StockCard, index: number): void {
    card.resistances.splice(index, 1);
    // Re-label remaining resistances
    card.resistances.forEach((r, i) => {
      r.label = `Resistance${i + 1}`;
    });
    this.saveToLocalStorage();
  }

  // Notes methods
  addNote(card: StockCard): void {
    const text = card.newNoteText?.trim();
    if (!text) {
      return;
    }

    const note: StockNote = {
      id: Date.now().toString(),
      text: text,
      timestamp: new Date()
    };

    card.notes.push(note);
    card.newNoteText = '';
    this.saveToLocalStorage();
  }

  deleteNote(card: StockCard, index: number): void {
    card.notes.splice(index, 1);
    this.saveToLocalStorage();
  }

  // Formatting
  formatNumber(num: number): string {
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // LocalStorage persistence
  saveToLocalStorage(): void {
    localStorage.setItem('stockRadarData', JSON.stringify(this.stockCards));
  }

  loadFromLocalStorage(): void {
    const stored = localStorage.getItem('stockRadarData');
    if (stored) {
      try {
        this.stockCards = JSON.parse(stored);
        // Keep all cards collapsed
        this.stockCards.forEach(c => c.expanded = false);
      } catch (e) {
        console.error('Failed to parse stored stock radar data:', e);
        this.stockCards = [];
      }
    }
  }

  // ESC key handler
  @HostListener('window:keydown', ['$event'])
  handleKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      const expandedCard = this.stockCards.find(c => c.expanded);
      if (expandedCard) {
        expandedCard.expanded = false;
      }
    }
  }

  // ============= GOOGLE DRIVE INTEGRATION =============

  /**
   * Smart sync: Load from Drive if local is empty, otherwise save to Drive
   */
  async syncGoogleDrive(): Promise<void> {
    if (!this.driveService.isConnected()) {
      this.showErrorMessage('Please connect Google Drive first');
      return;
    }

    this.isSyncing = true;
    this.cdr.detectChanges();

    try {
      // If no local data, try to load from Drive
      if (this.stockCards.length === 0) {
        await this.loadFromGoogleDrive();
      } else {
        // Otherwise, save local data to Drive
        await this.saveToGoogleDrive();
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      this.showErrorMessage('❌ Sync failed: ' + (error.message || 'Unknown error'));
    } finally {
      this.isSyncing = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Save current data to Google Drive
   */
  private async saveToGoogleDrive(): Promise<void> {
    if (this.stockCards.length === 0) {
      this.showErrorMessage('No data to save. Add some stock cards first.');
      return;
    }

    const data: StockRadarData = {
      version: '1.0',
      lastModified: new Date().toISOString(),
      cards: this.stockCards
    };

    try {
      if (this.driveFileId) {
        // Update existing file
        await this.driveService.updateFile(this.driveFileId, data);
        this.showSuccessMessage('✅ Synced to Google Drive!');
      } else {
        // Create new file
        const fileId = await this.driveService.createFile(this.driveFileName, data);
        this.driveFileId = fileId;
        this.saveDriveFileId();
        this.showSuccessMessage('✅ Synced to Google Drive!');
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Load data from Google Drive
   */
  private async loadFromGoogleDrive(): Promise<void> {
    try {
      // Search for file if we don't have fileId
      let fileId = this.driveFileId;

      if (!fileId) {
        const file = await this.driveService.searchFile(this.driveFileName);
        if (file) {
          fileId = file.id;
          this.driveFileId = fileId;
          this.saveDriveFileId();
        } else {
          this.showErrorMessage('ℹ️ No data found on Google Drive');
          return;
        }
      }

      // Download file content
      const driveData: StockRadarData = await this.driveService.downloadFile(fileId);

      // Merge with local data
      this.mergeWithLocalData(driveData);

      this.showSuccessMessage('✅ Data restored from Google Drive!');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Merge Drive data with local data (auto-merge, replace local with Drive data)
   */
  private mergeWithLocalData(cloudData: StockRadarData): void {
    this.stockCards = cloudData.cards;
    this.saveToLocalStorage();

    // Keep all cards collapsed
    if (this.stockCards.length > 0) {
      this.stockCards.forEach(c => c.expanded = false);
    }
  }

  /**
   * Load Drive file ID from localStorage
   */
  private loadDriveFileId(): void {
    try {
      const stored = localStorage.getItem('stockRadarDriveFileId');
      if (stored) {
        this.driveFileId = stored;
      }
    } catch (e) {
      console.warn('Failed to load Drive file ID', e);
    }
  }

  /**
   * Save Drive file ID to localStorage
   */
  private saveDriveFileId(): void {
    if (!this.driveFileId) return;
    try {
      localStorage.setItem('stockRadarDriveFileId', this.driveFileId);
    } catch (e) {
      console.warn('Failed to save Drive file ID', e);
    }
  }

  /**
   * Show success message
   */
  private showSuccessMessage(message: string): void {
    this.statusMessage = message;
    this.statusType = 'success';
    setTimeout(() => this.statusMessage = '', 4000);
  }

  /**
   * Show error message
   */
  private showErrorMessage(message: string): void {
    this.statusMessage = message;
    this.statusType = 'error';
    setTimeout(() => this.statusMessage = '', 6000);
  }
}

