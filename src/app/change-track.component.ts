import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ChangeEntry { date: string; value: number; }
interface ChangeCard { name: string; entries: ChangeEntry[]; newEntryDate: string; newEntryValue: number | null; duplicateDate?: boolean; expanded?: boolean; }

@Component({
  selector: 'app-change-track',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ct-container">
      <div class="ct-header">
        <h1>🔄 Change Track</h1>
        <p class="subtitle">Track daily change values per contract (local only)</p>
      </div>

      <div class="add-contract-bar">
        <input type="text" [(ngModel)]="newContractName" placeholder="Enter contract name (e.g., WIPRO25DECFUT)" />
        <button (click)="addContract()">ADD</button>
        <button class="clear-btn" (click)="clearAllCards()">CLEAR PAGE DATA</button>
      </div>
      <div *ngIf="duplicateWarning" class="warn">Contract already exists.</div>

      <div class="cards-wrapper" [class.expanding]="anyExpanded">
        <div *ngFor="let card of cards; trackBy: trackByName" class="ct-card" [class.expanded]="card.expanded">
          <div class="card-header">
            <div class="card-title">{{ card.name }}</div>
            <div class="header-actions">
              <button class="icon-btn add header-add" (click)="addEntry(card)" aria-label="Add change entry"><span class="plus-icon">+</span></button>
              <button class="icon-btn fullscreen" (click)="toggleExpand(card)" [attr.aria-label]="card.expanded ? 'Exit full screen' : 'Full screen'">⛶</button>
              <button *ngIf="card.expanded" class="icon-btn close" (click)="toggleExpand(card)" aria-label="Close fullscreen">✖</button>
            </div>
          </div>
          <div class="entry-add-row">
            <input type="date" [(ngModel)]="card.newEntryDate" />
            <input type="number" [(ngModel)]="card.newEntryValue" placeholder="Change (₹)" />
          </div>
          <div *ngIf="card.duplicateDate" class="warn small">Date already recorded.</div>
          <div *ngIf="card.entries.length === 0" class="empty">No changes recorded yet.</div>
          <div class="entry-list">
            <div *ngFor="let e of card.entries; let i = index" class="entry-item">
              <span class="date">{{ formatDisplayDate(e.date) }}</span>
              <span class="value" [class.profit]="e.value >= 0" [class.loss]="e.value < 0">
                {{ e.value >= 0 ? '+' : '-' }}₹{{ formatNumber(e.value) }}
              </span>
              <button class="icon-btn delete" (click)="deleteEntry(card, i)" title="Delete">−</button>
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
    .add-contract-bar input { flex:1; padding:10px 14px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); border-radius:8px; color:#fff; font-size:0.9em; }
    .add-contract-bar button { padding:10px 20px; background:#2196f3; border:none; border-radius:8px; color:#fff; font-weight:600; cursor:pointer; font-size:0.85em; letter-spacing:1px; }
    .add-contract-bar button:hover { background:#1976d2; }
    .clear-btn { background: rgba(255,255,255,0.15); }
    .clear-btn:hover { background: rgba(255,255,255,0.25); }
    .warn { color:#ff6e6e; font-size:0.75em; }
    .cards-wrapper { display:grid; grid-template-columns: repeat(auto-fill,minmax(260px,1fr)); gap:18px; align-items:start; }
    .ct-card { background: rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:14px 16px; display:flex; flex-direction: column; gap:12px; position:relative; }
    .card-header { display:flex; justify-content: space-between; align-items:center; gap:8px; }
    .header-actions { display:flex; gap:6px; align-items:center; }
    .card-title { font-size:0.9em; font-weight:600; letter-spacing:1px; color:#ffc107; }
    .entry-add-row { display:grid; grid-template-columns: 1fr 1fr; gap:8px; align-items:center; z-index:1; margin-top:4px; }
    .warn.small { font-size:0.65em; margin-top:-4px; }
    .entry-add-row input { padding:8px 10px; background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.15); border-radius:8px; color:#fff; font-size:0.8em; }
    .icon-btn { border:none; cursor:pointer; padding:8px 10px; border-radius:8px; font-size:0.9em; display:flex; align-items:center; justify-content:center; font-weight:600; }
    .icon-btn.add { background:#4caf50; color:#fff; width:42px; height:34px; font-size:1.3em; line-height:1; display:flex; align-items:center; justify-content:center; font-weight:700; border:1px solid rgba(255,255,255,0.3); }
    .icon-btn.add.header-add { flex-shrink:0; }
    .icon-btn.add .plus-icon { pointer-events:none; }
    .icon-btn.add:hover { background:#43a047; }
    .icon-btn.fullscreen { background: rgba(255,255,255,0.15); color:#fff; width:38px; height:34px; font-size:1.1em; border:1px solid rgba(255,255,255,0.25); }
    .icon-btn.fullscreen:hover { background: rgba(255,255,255,0.25); }
    .icon-btn.close { background:#ff6e6e; color:#fff; width:38px; height:34px; font-size:1.1em; border:1px solid rgba(255,255,255,0.25); margin-right:68px; }
    .icon-btn.close:hover { background:#f44336; }
    .icon-btn.delete { background:#ff6e6e; color:#fff; }
    .icon-btn.delete:hover { background:#f44336; }
    .empty { font-size:0.7em; color:#777; padding:4px 0; }
    .entry-list { display:flex; flex-direction:column; gap:6px; max-height:360px; overflow-y:auto; padding-right:4px; }
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
    .entry-item { display:grid; grid-template-columns: 140px 1fr 50px; gap:12px; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06); }
    .entry-item:last-child { border-bottom:none; }
    .date { font-size:0.7em; color:#bbb; }
    .value { font-size:0.85em; font-weight:600; text-align:left; }
    .value.profit { color:#4caf50; }
    .value.loss { color:#ff6e6e; }
    .footer-note { font-size:0.6em; color:#888; text-align:center; margin-top:4px; }
    code { background: rgba(0,0,0,0.3); padding:2px 6px; border-radius:6px; font-size:0.85em; }
  `]
})
export class ChangeTrackComponent implements OnInit {
  newContractName = '';
  cards: ChangeCard[] = [];
  duplicateWarning = false;
  private storageKey = 'changeTrackData';

  ngOnInit(): void {
    this.loadFromStorage();
  }

  trackByName(index: number, card: ChangeCard) { return card.name; }

  addContract() {
    const raw = (this.newContractName || '').trim();
    if (!raw) return;
    const exists = this.cards.some(c => c.name.toLowerCase() === raw.toLowerCase());
    if (exists) { this.duplicateWarning = true; setTimeout(()=> this.duplicateWarning = false, 2000); return; }
    const today = this.getToday();
    this.cards.push({ name: raw, entries: [], newEntryDate: today, newEntryValue: null });
    this.newContractName = '';
    this.saveToStorage();
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
    card.entries.unshift({ date, value: card.newEntryValue });
    card.newEntryValue = null;
    this.saveToStorage();
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

  deleteEntry(card: ChangeCard, index: number) {
    card.entries.splice(index, 1);
    this.saveToStorage();
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
}
