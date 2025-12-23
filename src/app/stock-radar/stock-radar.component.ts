import { Component, OnInit, HostListener, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarkdownModule } from 'ngx-markdown';
import { GoogleDriveService } from '../google-drive.service';

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
  notePreviewMode?: boolean; // For edit/preview toggle
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
  templateUrl: './stock-radar.component.html',
  styleUrls: ['./stock-radar.component.css']
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
    private zone: NgZone,
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

  // Markdown formatting helpers
  insertMarkdown(card: StockCard, type: string): void {
    const textarea = document.querySelector(`textarea.mini-note-input`) as HTMLTextAreaElement;
    if (!textarea) {
      card.newNoteText = card.newNoteText || '';
      return;
    }

    // Save scroll position before modification
    const scrollTop = textarea.scrollTop;
    const scrollLeft = textarea.scrollLeft;

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const selectedText = card.newNoteText?.substring(start, end) || '';
    const beforeText = card.newNoteText?.substring(0, start) || '';
    const afterText = card.newNoteText?.substring(end) || '';

    let insertText = '';
    let cursorOffset = 0;

    switch (type) {
      case 'bold':
        insertText = `**${selectedText || 'bold text'}**`;
        cursorOffset = selectedText ? insertText.length : 2;
        break;
      case 'italic':
        insertText = `*${selectedText || 'italic text'}*`;
        cursorOffset = selectedText ? insertText.length : 1;
        break;
      case 'code':
        insertText = `\`${selectedText || 'code'}\``;
        cursorOffset = selectedText ? insertText.length : 1;
        break;
      case 'list':
        insertText = selectedText ? `- ${selectedText}` : '- List item';
        cursorOffset = insertText.length;
        break;
      case 'link':
        insertText = `[${selectedText || 'link text'}](url)`;
        cursorOffset = selectedText ? insertText.length - 4 : 1;
        break;
      case 'h1':
        insertText = `# ${selectedText || 'Heading 1'}`;
        cursorOffset = insertText.length;
        break;
      case 'h2':
        insertText = `## ${selectedText || 'Heading 2'}`;
        cursorOffset = insertText.length;
        break;
    }

    card.newNoteText = beforeText + insertText + afterText;

    // Restore scroll position and cursor without causing scroll jump
    this.zone.run(() => {
      setTimeout(() => {
        if (textarea) {
          // Restore scroll position first
          textarea.scrollTop = scrollTop;
          textarea.scrollLeft = scrollLeft;
          
          // Focus and set cursor position
          textarea.focus();
          const newPos = start + cursorOffset;
          textarea.setSelectionRange(newPos, newPos);
        }
      }, 0);
    });
  }

  handleKeyboard(event: KeyboardEvent, card: StockCard): void {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'b':
          event.preventDefault();
          this.insertMarkdown(card, 'bold');
          break;
        case 'i':
          event.preventDefault();
          this.insertMarkdown(card, 'italic');
          break;
        case 'k':
          event.preventDefault();
          this.insertMarkdown(card, 'link');
          break;
      }
    }
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

