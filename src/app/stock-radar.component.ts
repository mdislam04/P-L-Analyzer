import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  `]
})
export class StockRadarComponent implements OnInit {
  stockCards: StockCard[] = [];
  newStockName: string = '';
  newStockDate: string = this.getTodayDate();
  duplicateStockName: boolean = false;

  ngOnInit(): void {
    this.loadFromLocalStorage();
    // Expand first card by default if exists
    if (this.stockCards.length > 0 && !this.stockCards.some(c => c.expanded)) {
      this.stockCards[0].expanded = true;
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
}
