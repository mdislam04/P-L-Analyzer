# Stock Radar Feature Specification

## Overview
Stock Radar enables traders to track multiple stocks with detailed technical levels, support/resistance zones, and notes about developments. Each stock gets its own expandable/collapsible card with comprehensive tracking capabilities.

## Design Analysis (from screenshot)
The screenshot shows a professional dark-themed card for "WIPRO" with:
- **Header**: Stock name + date picker + "Clear Card" button (orange)
- **Input sections**: 
  - Support level entry with green (+) button
  - Resistance level entry with green (+) button  
  - Notes/Info/New development entry with green (+) button
- **Display sections**:
  - Support levels (Support1: 250, Support2: 245) with delete (−) buttons (orange)
  - Resistance levels (Resistance1: 260, Resistance2: 265) with delete (−) buttons (orange)
  - New development note with delete (−) button (orange)
  - Summary text: "In last 10 days wipro is up by 15, jump 20 in 10 session and down 6-5 in 6 session" with delete (−)

## Goals
- Track technical levels (support/resistance) per stock
- Record notes and developments with timestamps
- Expandable/collapsible cards (first card expanded by default)
- Professional, clean UI with consistent alignment
- Persistent storage (localStorage)
- Clear card functionality

## Data Model

```typescript
interface StockLevel {
  id: string;           // Unique ID for deletion
  label: string;        // e.g., "Support1", "Resistance1"
  value: number;        // Price level
  timestamp: string;    // ISO date when added
}

interface StockNote {
  id: string;
  text: string;
  timestamp: string;
}

interface StockCard {
  name: string;               // Stock symbol/name (e.g., "WIPRO")
  dateContext: string;        // Optional date for context tracking (YYYY-MM-DD)
  supports: StockLevel[];     // Array of support levels
  resistances: StockLevel[];  // Array of resistance levels
  notes: StockNote[];         // Array of notes/developments
  expanded: boolean;          // Collapse/expand state
}

LocalStorage Key: 'stockRadarData'
Format: { [stockName: string]: Omit<StockCard, 'expanded'> }
```

## UI/UX Design

### Top Bar
- Input: Stock name textbox (placeholder: "Enter stock symbol (e.g., WIPRO)")
- Button: "ADD STOCK" (primary blue #2196f3)
- Button: "CLEAR ALL DATA" (secondary, muted)

### Card Layout (per stock)
**Card States:**
- **Collapsed**: Shows only header (stock name + expand icon)
- **Expanded**: Shows full content

**Card Header:**
- Left: Stock name (bold, yellow #ffc107, 1.1em)
- Right actions:
  - Date picker (optional context date, type="date")
  - "CLEAR CARD" button (warning orange #ff9800)
  - Expand/collapse icon toggle (⌄ / ⌃)

**Card Body (when expanded):**

1. **Input Section** (3 rows, grid layout):
   - Row 1: Label "Support Level" | Input (number) | Green (+) button
   - Row 2: Label "Resistance Level" | Input (number) | Green (+) button
   - Row 3: Label "Notes / Info / New Dev" | Textarea | Green (+) button

2. **Display Section** (4 subsections):
   - **Supports** (2 columns if multiple):
     - "Support1 - 250" with orange (−) delete button
     - "Support2 - 245" with orange (−) delete button
   - **Resistances** (2 columns if multiple):
     - "Resistance1 - 260" with orange (−) delete button
     - "Resistance2 - 265" with orange (−) delete button
   - **Developments**:
     - "New development on wipro" with orange (−) button
   - **Notes/Summary**:
     - Longer text entries with orange (−) button
     - Multiple lines supported, wrap text

### Color Palette
- Background: Dark gradient (#1a2332 → #0f1419)
- Card bg: rgba(255,255,255,0.04)
- Borders: rgba(255,255,255,0.1)
- Primary accent: #ffc107 (yellow/gold) for stock names
- Add buttons: #4caf50 (green)
- Delete buttons: #ff9800 (orange, not red to differentiate from losses)
- Clear card: #ff9800 (orange)
- Input backgrounds: rgba(255,255,255,0.07)
- Text primary: #fff
- Text muted: #bbb

### Spacing & Alignment
- Card padding: 20px 24px
- Gap between sections: 16px
- Input row grid: `auto 1fr auto` (label, input, button)
- Display items: Grid 2 columns for levels if >1 item
- Font sizes:
  - Stock name: 1.1em
  - Section labels: 0.75em uppercase
  - Level text: 0.85em
  - Notes: 0.8em
  - Buttons: 0.75em

## Feature Breakdown

### 1. Add Stock Card
- Input: Stock name (required, trim whitespace)
- Validation: No duplicate stock names (case-insensitive)
- Action: Create new card, add to top of list
- State: First card expanded, rest collapsed by default
- Persist immediately

### 2. Support/Resistance Management
- Input: Numeric value (required)
- Action: Add to array with auto-label (Support1, Support2, etc.)
- Display: Show in grid (2 cols if multiple items)
- Delete: Remove by ID, re-persist
- Auto-sort: Optional (desc for support, asc for resistance)

### 3. Notes/Developments Management
- Input: Textarea (multi-line support, required)
- Action: Add with timestamp
- Display: List with timestamps (optional, can show "X days ago")
- Delete: Remove by ID
- Character limit: Optional (500 chars recommended)

### 4. Date Context
- Optional date picker for "as of" context
- Helps track when levels were set
- Displayed in header near stock name

### 5. Expand/Collapse
- Icon toggle: ⌄ (down) when collapsed, ⌃ (up) when expanded
- Click header or icon to toggle
- First card expanded by default on load
- State persists per session (not in localStorage, reset on reload)

### 6. Clear Card
- Button: "CLEAR CARD" in header
- Confirmation: "Remove {stockName} and all data? Cannot be undone."
- Action: Remove card from array, update localStorage

### 7. Clear All Data
- Button: "CLEAR ALL DATA" in top bar
- Confirmation: "Clear all stock radar data? Cannot be undone."
- Action: Empty array, clear localStorage key

## Behaviors

### Adding Levels/Notes
- Validate input (non-empty, numeric for levels)
- Generate unique ID (timestamp + random)
- Auto-label levels (Support1, Support2, etc.)
- Clear input field after successful add
- Show brief validation feedback if invalid

### Deletion
- Confirm for card deletion
- No confirm for individual level/note deletion (too many clicks)
- Update localStorage immediately

### Persistence
- Load on component init
- Save after every mutation
- Expanded state NOT persisted (reset on reload, first expanded)

### Edge Cases
- Empty states: "No supports added yet" (muted text)
- Large numbers: Format with commas (e.g., 1,250.50)
- Long notes: Word wrap, max-height with scroll
- Many cards: Scroll container for card list

## Advanced Features (Future/Optional)

### Phase 2 Ideas:
- **Alerts**: Set price alerts when stock crosses support/resistance
- **Chart integration**: Mini chart showing levels
- **Export**: Download stock data as JSON/CSV
- **Import**: Bulk import from CSV
- **Search/Filter**: Search stocks by name
- **Tags**: Categorize stocks (watchlist, portfolio, etc.)
- **Historical tracking**: Track level changes over time
- **Auto-fetch**: Pull current price from API
- **Comparison**: Side-by-side view of multiple stocks

## Implementation Steps

1. **Spec & Design** ✅
2. Create `StockRadarComponent` with inline template/styles
3. Implement data model and localStorage helpers
4. Build add stock card flow with validation
5. Implement support/resistance input & display
6. Implement notes input & display
7. Add expand/collapse functionality
8. Add delete card & clear all features
9. Wire component to new tab in `app.ts`
10. Polish styles, alignment, spacing
11. Test CRUD operations and persistence
12. Edge case handling and validation feedback

## Accessibility
- ARIA labels for all icon buttons
- Keyboard navigation support
- Focus management for inputs
- Semantic HTML structure

## Performance
- trackBy for *ngFor loops (stock name)
- Avoid unnecessary re-renders
- Debounce save if many rapid changes (optional)

## Testing Checklist
- [ ] Add multiple stock cards
- [ ] Add/delete support levels
- [ ] Add/delete resistance levels
- [ ] Add/delete notes
- [ ] Expand/collapse cards
- [ ] Clear individual card
- [ ] Clear all data
- [ ] Duplicate stock name validation
- [ ] Empty input validation
- [ ] Persistence after reload
- [ ] First card expanded by default
- [ ] Long text wrapping
- [ ] Large numbers formatting

## File Structure
```
src/app/
  ├── stock-radar.component.ts   (new)
  ├── app.ts                      (update: add tab)
docs/
  └── stockradar.md              (this file)
```

## Estimated Effort
- Spec: 30 min ✅
- Component scaffold: 15 min
- Core CRUD logic: 45 min
- Styling & layout: 30 min
- Testing & polish: 20 min
**Total: ~2.5 hours**

## Notes
- Keep consistent with existing app patterns (inline styles, standalone components)
- Match color palette and button styles from Change Track
- Use similar localStorage pattern as Change Track
- Prioritize clean, professional layout per screenshot
- Orange delete buttons distinguish from red loss indicators in other tabs
