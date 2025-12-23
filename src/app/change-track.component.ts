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
  percentageChange?: number; // Percentage change based on first/last day close prices
  isPinned?: boolean; // Pin card to top
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
  templateUrl: './change-track/change-track.component.html',
  styleUrls: ['./change-track/change-track.component.css']
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
    // Sort cards (pinned first)
    this.sortCards();
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

  togglePin(card: ChangeCard) {
    card.isPinned = !card.isPinned;
    this.sortCards();
    this.saveToStorage();
  }

  incrementDays(card: ChangeCard) {
    if (!card.entries || card.entries.length === 0) return;
    
    const currentDays = card.daysCount || 0;
    if (currentDays >= card.entries.length) return; // Can't go beyond all entries
    
    // Move the selected from date one day earlier
    const sortedEntries = [...card.entries].sort((a, b) => a.date.localeCompare(b.date));
    const currentIndex = sortedEntries.findIndex(e => e.date === card.selectedFromDate);
    
    if (currentIndex > 0) {
      card.selectedFromDate = sortedEntries[currentIndex - 1].date;
      this.calculateChange(card);
      this.saveToStorage();
    }
  }

  openDatePicker(card: ChangeCard) {
    // Trigger the hidden date input programmatically
    const dateInputs = document.querySelectorAll('.date-picker-hidden');
    const cardIndex = this.cards.indexOf(card);
    if (dateInputs[cardIndex]) {
      (dateInputs[cardIndex] as HTMLInputElement).showPicker?.();
    }
  }

  decrementDays(card: ChangeCard) {
    if (!card.entries || card.entries.length === 0) return;
    
    const currentDays = card.daysCount || 0;
    if (currentDays <= 1) return; // Can't go below 1 day
    
    // Move the selected from date one day later
    const sortedEntries = [...card.entries].sort((a, b) => a.date.localeCompare(b.date));
    const currentIndex = sortedEntries.findIndex(e => e.date === card.selectedFromDate);
    
    if (currentIndex < sortedEntries.length - 1) {
      card.selectedFromDate = sortedEntries[currentIndex + 1].date;
      this.calculateChange(card);
      this.saveToStorage();
    }
  }

  sortCards() {
    // Sort: pinned cards first (alphabetically), then unpinned cards (alphabetically)
    this.cards.sort((a, b) => {
      // Both pinned or both unpinned - sort alphabetically
      if (a.isPinned === b.isPinned) {
        return a.name.localeCompare(b.name);
      }
      // Pinned cards come first
      return a.isPinned ? -1 : 1;
    });
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

  // Get default "from" date (pick 5th most recent entry)
  getDefaultFromDate(card: ChangeCard): string {
    if (!card.entries || card.entries.length === 0) {
      return this.getToday();
    }

    // Sort entries by date descending (newest first)
    const sortedEntries = [...card.entries].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // If we have 5 or more entries, return the 5th one (index 4)
    // This gives us exactly 5 days of data (entries 0, 1, 2, 3, 4)
    if (sortedEntries.length >= 5) {
      return sortedEntries[4].date;
    }

    // If less than 5 entries, return the earliest one
    return sortedEntries[sortedEntries.length - 1].date;
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
      card.percentageChange = 0;
      return;
    }

    const fromDate = card.selectedFromDate || this.getDefaultFromDate(card);
    const toDate = this.getLatestDate(card);

    // Filter entries between fromDate and toDate (inclusive)
    const relevantEntries = card.entries.filter(e => 
      e.date >= fromDate && e.date <= toDate
    ).sort((a, b) => a.date.localeCompare(b.date)); // Sort by date ascending

    // Sum up all changes
    const totalChange = relevantEntries.reduce((sum, entry) => sum + entry.value, 0);
    card.calculatedChange = totalChange;

    // Count number of trading days (entries) in the range
    card.daysCount = relevantEntries.length;

    // Calculate percentage change based on first and last day close prices
    if (relevantEntries.length > 0) {
      const firstEntry = relevantEntries[0];
      const lastEntry = relevantEntries[relevantEntries.length - 1];
      
      // Use close prices if available, otherwise fall back to a calculation
      if (firstEntry.close !== undefined && lastEntry.close !== undefined && firstEntry.close !== 0) {
        const priceChange = lastEntry.close - firstEntry.close;
        card.percentageChange = (priceChange / firstEntry.close) * 100;
      } else {
        // Fallback: estimate based on total change and last close price
        card.percentageChange = 0;
      }
    } else {
      card.percentageChange = 0;
    }
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
      const data = JSON.parse(raw);
      
      // Handle old format (just entries) and new format (with metadata)
      if (data.version === '2.0') {
        // New format with isPinned
        this.cards = data.cards.map((cardData: any) => ({
          name: cardData.name,
          entries: cardData.entries.sort((a: ChangeEntry, b: ChangeEntry) => b.date.localeCompare(a.date)),
          newEntryDate: this.getToday(),
          newEntryValue: null,
          isPinned: cardData.isPinned || false
        }));
      } else {
        // Old format - migrate
        const obj = data as { [key: string]: ChangeEntry[] };
        this.cards = Object.keys(obj).map(name => ({
          name,
          entries: obj[name].sort((a, b) => b.date.localeCompare(a.date)),
          newEntryDate: this.getToday(),
          newEntryValue: null,
          isPinned: false
        }));
      }
    } catch (e) { console.warn('Failed to load change track data', e); }
  }

  saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      const data = {
        version: '2.0',
        cards: this.cards.map(c => ({
          name: c.name,
          entries: c.entries,
          isPinned: c.isPinned || false
        }))
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
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

  // Format volume in Indian number system (Lakhs/Crores)
  formatVolume(volume: number): string {
    const absVolume = Math.abs(volume);
    
    if (absVolume >= 10000000) {
      // Crores (1 Cr = 10,000,000)
      return (volume / 10000000).toFixed(2) + ' Cr';
    } else if (absVolume >= 100000) {
      // Lakhs (1 L = 100,000)
      return (volume / 100000).toFixed(2) + ' L';
    } else if (absVolume >= 1000) {
      // Thousands
      return (volume / 1000).toFixed(2) + ' K';
    } else {
      return volume.toLocaleString('en-IN');
    }
  }
}
