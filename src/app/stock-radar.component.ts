import { Component, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../environments/environment';

// Google Identity Services type declaration
declare const google: any;

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

interface GoogleDriveConfig {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  fileId: string | null;
}

interface StockRadarData {
  version: string;
  lastModified: string;
  cards: StockCard[];
}

@Component({
  selector: 'app-stock-radar',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
        
        <!-- Google Drive Section -->
        <div class="google-drive-section">
          <button 
            *ngIf="!isGoogleDriveConnected()" 
            (click)="initiateGoogleAuth()" 
            class="btn-connect-drive">
            🔗 Connect Google Drive
          </button>
          
          <div *ngIf="isGoogleDriveConnected()" class="drive-controls">
            <button 
              (click)="syncGoogleDrive()" 
              class="btn-sync-drive"
              [disabled]="isSyncing">
              {{ isSyncing ? '⏳ Syncing...' : '🔄 Sync Drive' }}
            </button>
          </div>
        </div>
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
                    <input 
                      type="text" 
                      [(ngModel)]="card.newNoteText" 
                      placeholder="Enter development note"
                      class="mini-note-input"
                    />
                    <button (click)="addNote(card)" class="btn-add-mini">+</button>
                  </div>

                  <!-- Notes List -->
                  <div *ngIf="card.notes.length > 0" class="mini-notes-list">
                    <div *ngFor="let note of card.notes; let i = index" class="mini-note-item">
                      <span class="mini-note-text">{{ note.text }}</span>
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
    }

    .mini-level-input::placeholder, .mini-note-input::placeholder {
      color: rgba(255, 255, 255, 0.4);
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
      font-size: 12px;
      font-weight: 600;
      color: #2196f3;
    }

    .mini-level-value {
      font-size: 13px;
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
      background: rgba(255, 255, 255, 0.03);
      border-radius: 6px;
    }

    .mini-note-text {
      font-size: 13px;
      color: #fff;
      line-height: 1.5;
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
  googleDrive: GoogleDriveConfig = {
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    fileId: null
  };
  isSyncing: boolean = false;
  statusMessage: string = '';
  statusType: 'success' | 'error' = 'success';

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadFromLocalStorage();
    this.loadGoogleDriveConfig();
    this.handleOAuthCallback();
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

  // Check if connected
  isGoogleDriveConnected(): boolean {
    return !!this.googleDrive.accessToken;
  }

  // Google Identity Services (New Approach)
  async initiateGoogleAuth(): Promise<void> {
    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: environment.googleDrive.clientId,
        scope: environment.googleDrive.scope,
        callback: (response: any) => {
          if (response.error) {
            console.error('Auth error:', response);
            this.showErrorMessage('Failed to connect Google Drive');
            return;
          }
          
          this.googleDrive.accessToken = response.access_token;
          this.googleDrive.expiresAt = Date.now() + (response.expires_in * 1000);
          // Note: Google Identity Services doesn't provide refresh tokens in browser
          this.saveGoogleDriveConfig();
          this.showSuccessMessage('✅ Google Drive connected successfully!');
          this.cdr.detectChanges();
        },
      });
      
      client.requestAccessToken();
    } catch (error) {
      console.error('Auth initiation error:', error);
      this.showErrorMessage('Failed to initiate Google Drive connection');
    }
  }

  handleOAuthCallback(): void {
    // Not needed with Google Identity Services
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.googleDrive.accessToken) {
      throw new Error('Not authenticated');
    }
    
    // Check if token is expired or will expire soon (within 5 minutes)
    if (this.googleDrive.expiresAt && this.googleDrive.expiresAt - Date.now() < 300000) {
      // Re-prompt user for new token (Google Identity Services doesn't support refresh tokens in browser)
      this.showErrorMessage('Session expired. Please reconnect.');
      this.googleDrive.accessToken = null;
      this.googleDrive.expiresAt = null;
      this.saveGoogleDriveConfig();
      throw new Error('Token expired');
    }
  }

  // Google Drive Operations
  async saveToGoogleDrive(): Promise<void> {
    if (this.stockCards.length === 0) {
      this.showErrorMessage('No data to save. Add some stock cards first.');
      return;
    }

    console.log('Starting save to Google Drive...');
    this.isSyncing = true;
    try {
      await this.ensureValidToken();
      console.log('Token validated, access token exists:', !!this.googleDrive.accessToken);
      
      const data: StockRadarData = {
        version: '1.0',
        lastModified: new Date().toISOString(),
        cards: this.stockCards
      };
      
      console.log('Data to save:', data);
      
      let fileId = this.googleDrive.fileId;
      console.log('Existing file ID:', fileId);
      
      if (fileId) {
        // Update existing file
        await this.updateDriveFile(fileId, data);
      } else {
        // Create new file
        fileId = await this.createDriveFile(data);
        this.googleDrive.fileId = fileId;
        this.saveGoogleDriveConfig();
      }
      
      console.log('Save completed successfully');
      this.showSuccessMessage('✅ Data synced to Google Drive!');
      
    } catch (error: any) {
      console.error('Google Drive save error:', error);
      this.handleGoogleDriveError(error);
    } finally {
      this.isSyncing = false;
      this.cdr.detectChanges(); // Force UI update
      console.log('Save operation finished, isSyncing set to false');
    }
  }

  private async createDriveFile(data: StockRadarData): Promise<string> {
    console.log('Creating new file on Google Drive...');
    const metadata = {
      name: 'stockradar.json',
      mimeType: 'application/json'
    };
    
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;
    
    const multipartBody = 
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(data) +
      closeDelim;
    
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.googleDrive.accessToken}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`
      },
      body: multipartBody
    });
    
    console.log('Create file response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Create file error response:', errorText);
      throw new Error(`Google Drive API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('File created successfully, ID:', result.id);
    return result.id;
  }

  private async updateDriveFile(fileId: string, data: StockRadarData): Promise<void> {
    console.log('Updating existing file on Google Drive, ID:', fileId);
    const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.googleDrive.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    console.log('Update file response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Update file error response:', errorText);
      throw new Error(`Google Drive API error: ${response.status} - ${errorText}`);
    }
    
    console.log('File updated successfully');
  }

  async loadFromGoogleDrive(): Promise<void> {
    console.log('Starting load from Google Drive...');
    this.isSyncing = true;
    try {
      await this.ensureValidToken();
      
      let fileId = this.googleDrive.fileId;
      console.log('File ID:', fileId);
      
      if (!fileId) {
        // Search for existing file
        console.log('Searching for existing file...');
        const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='stockradar.json' and trashed=false`;
        const searchResponse = await fetch(searchUrl, {
          headers: { 'Authorization': `Bearer ${this.googleDrive.accessToken}` }
        });
        
        const searchData = await searchResponse.json();
        console.log('Search results:', searchData);
        if (searchData.files && searchData.files.length > 0) {
          fileId = searchData.files[0].id;
          this.googleDrive.fileId = fileId;
          this.saveGoogleDriveConfig();
        } else {
          console.log('No file found, setting isSyncing to false');
          this.isSyncing = false;
          this.cdr.detectChanges(); // Force UI update
          this.showErrorMessage('No data found on Google Drive');
          return;
        }
      }
      
      // Download file content
      console.log('Downloading file...');
      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      const response = await fetch(downloadUrl, {
        headers: { 'Authorization': `Bearer ${this.googleDrive.accessToken}` }
      });
      
      console.log('Download response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          this.googleDrive.fileId = null;
          this.saveGoogleDriveConfig();
          throw new Error('File not found on Google Drive');
        }
        throw new Error(`Google Drive API error: ${response.status}`);
      }
      
      const data: StockRadarData = await response.json();
      console.log('Data received:', data);
      await this.mergeWithLocalData(data);
      
      console.log('Load completed successfully');
      this.showSuccessMessage('✅ Data loaded from Google Drive!');
      
    } catch (error: any) {
      console.error('Google Drive load error:', error);
      this.handleGoogleDriveError(error);
    } finally {
      console.log('Finally block: setting isSyncing to false');
      this.isSyncing = false;
      this.cdr.detectChanges(); // Force UI update
    }
  }

  private async mergeWithLocalData(cloudData: StockRadarData): Promise<void> {
    // Auto-merge without confirmation
    
    this.stockCards = cloudData.cards;
    this.saveToLocalStorage();
    
    // Keep all cards collapsed
    if (this.stockCards.length > 0) {
      this.stockCards.forEach(c => c.expanded = false);
    }
  }

  async syncGoogleDrive(): Promise<void> {
    console.log('Starting sync with Google Drive...');
    this.isSyncing = true;
    
    try {
      await this.ensureValidToken();
      console.log('Token validated');
      
      // If no local data, try to load from Drive
      if (this.stockCards.length === 0) {
        console.log('No local data, loading from Drive...');
        await this.loadFromGoogleDrive();
        this.showSuccessMessage('✅ Data restored from Google Drive!');
        return;
      }
      
      // Otherwise, save local data to Drive
      const data: StockRadarData = {
        version: '1.0',
        lastModified: new Date().toISOString(),
        cards: this.stockCards
      };
      
      let fileId = this.googleDrive.fileId;
      
      if (fileId) {
        // Update existing file
        await this.updateDriveFile(fileId, data);
      } else {
        // Create new file
        fileId = await this.createDriveFile(data);
        this.googleDrive.fileId = fileId;
        this.saveGoogleDriveConfig();
      }
      
      console.log('Sync completed successfully');
      this.showSuccessMessage('✅ Synced to Google Drive!');
      
    } catch (error: any) {
      console.error('Sync error:', error);
      this.handleGoogleDriveError(error);
    } finally {
      this.isSyncing = false;
      this.cdr.detectChanges();
    }
  }

  // Status Messages
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

  private handleGoogleDriveError(error: any): void {
    if (error.message?.includes('Not authenticated') || error.status === 401) {
      this.showErrorMessage('Session expired. Please reconnect Google Drive.');
      // Clear tokens on auth error
      this.googleDrive = {
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        fileId: null
      };
      this.saveGoogleDriveConfig();
    } else if (error.status === 403) {
      this.showErrorMessage('Permission denied. Please grant access to Google Drive.');
    } else if (error.status === 404) {
      this.showErrorMessage('File not found on Google Drive.');
    } else if (!navigator.onLine) {
      this.showErrorMessage('No internet connection. Please try again when online.');
    } else {
      this.showErrorMessage(error.message || 'An error occurred. Please try again.');
    }
  }

  // Google Drive Config Persistence
  private saveGoogleDriveConfig(): void {
    localStorage.setItem('googleDriveConfig', JSON.stringify(this.googleDrive));
  }

  private loadGoogleDriveConfig(): void {
    const stored = localStorage.getItem('googleDriveConfig');
    if (stored) {
      try {
        this.googleDrive = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse Google Drive config:', e);
      }
    }
  }
}

