# Change Track Feature Requirements

## Overview
A "Change Track" tab enables manual tracking of day-to-day price change values (or custom deltas) per unique contract name. Users can create multiple contract cards, each holding dated change entries. Data persists locally (localStorage) and syncs with Google Drive for backup and cross-device access.

## Goals
- Rapid manual entry of daily change values per contract.
- Visual separation: one card per unique contract name.
- Persistent storage across sessions (localStorage key: `changeTrackData`).
- Google Drive sync for backup and cross-device access.
- Bulk import via Excel/CSV files.
- Date-range based change calculation with visual indicators.

## Data Model
```
interface ChangeEntry { date: string; value: number; }
interface ChangeCard { 
  name: string; 
  entries: ChangeEntry[]; 
  newEntryDate: string; 
  newEntryValue: number | null; 
  duplicateDate?: boolean; 
  expanded?: boolean;
  selectedFromDate?: string; // Date picker for change calculation
  calculatedChange?: number; // Calculated change from selected date to latest
  daysCount?: number; // Number of days for which change is calculated
}
LocalStorage Shape: { [contractName: string]: ChangeEntry[] }
```

## UI Elements
1. Top Input Bar:
   - Textbox: contract name input (`newContractName`)
   - Button: ADD → creates card if not existing (case-insensitive uniqueness)
   - Button: 📊 Upload Excel → imports contract with entries from Excel/CSV file
   - Button: CLEAR PAGE DATA → clears all cards with confirmation
   - Button: 🔄 Sync Drive → syncs data with Google Drive (if connected)
   - Feedback: status messages for success/error states
   
2. Card Layout (one per contract):
   - Header Row (single line):
     - Contract name
     - Date picker (for change calculation start date)
     - Calculated change badge (profit/loss colored)
     - Days count badge (yellow text on black, white border)
     - + button (add entry)
     - 🗑️ button (delete entire card)
     - ⛶ button (fullscreen toggle)
     - ✖ button (close fullscreen, only in expanded mode)
   - Entry Row Inputs:
     - Date picker (`type=date`) default: today (YYYY-MM-DD) - smaller size (110px)
     - Number input for change value (supports negatives)
     - Number input for open price (optional)
     - Number input for close price (optional)
     - Number input for volume (optional)
     - Add (+) icon button to append entry
   - Entries List:
     - Chronological (newest first)
     - Each entry: formatted date + value with sign/color
     - Hover tooltip on change value shows additional data (open, close, volume) if available
     - Delete (trash icon) removes entry
     
3. Fullscreen Mode:
   - Card expands to full viewport
   - Other cards hidden
   - Larger fonts and spacing
   - Dedicated close button

4. Change Calculation:
   - Date picker to select start date
   - Defaults to 5 days before latest entry (or earliest if less data)
   - Displays cumulative change from selected date to latest
   - Shows number of days in compact badge
   - Auto-recalculates on data changes

## Behaviors
- Adding a Contract:
  - Trim whitespace; empty → ignored
  - Case-insensitive uniqueness check
  - Show duplicate warning if exists
  - Initialize with today's date and empty value
  - Auto-calculate default date range
  
- Excel/CSV Upload:
  - File name (without extension) becomes contract name
  - Row 1: Headers (Date, Change)
  - Row 2+: Data entries
  - Validates contract doesn't already exist
  - Handles Excel date serial numbers and string dates
  - Shows success message with entry count
  
- Adding an Entry:
  - Validate number field (non-null)
  - Check for duplicate dates within card
  - Unshift entry to beginning (newest first)
  - Immediately persist to localStorage
  - Recalculate change metrics
  
- Deleting an Entry:
  - Remove by index
  - Persist to storage
  - Recalculate change metrics
  
- Deleting a Card:
  - Confirmation dialog with contract name
  - Removes entire card and all entries
  - Persists to storage
  
- Change Calculation:
  - Filters entries between selected date and latest date
  - Sums all change values in range
  - Calculates number of days between dates
  - Updates on any data change (add/delete entries, date picker change)
  
- Fullscreen Toggle:
  - Expands single card to viewport
  - Hides all other cards
  - Larger UI elements
  - ESC key to exit (optional)
  
- Persistence:
  - Load on component init
  - Save after every mutation
  - Google Drive sync on demand

## LocalStorage
- Key: `changeTrackData`
- Format: `{ version: string, lastModified: string, data: { [contractName: string]: ChangeEntry[] } }`
- Read: `JSON.parse(localStorage.getItem(key) || '{}')`
- Write: `localStorage.setItem(key, JSON.stringify(object))`
- Resilience: try/catch around JSON parse/stringify

## Google Drive Integration
- File name: `change-track-data.json`
- Stores file ID in localStorage for quick access
- Manual sync button (not auto-sync to avoid conflicts)
- Upload: saves current state to Drive
- Download: merges Drive data with local (preserves local changes)
- Conflict resolution: shows status messages

## Excel/CSV Import Format
- **File name**: Contract name (e.g., `WIPRO.csv` → contract "WIPRO")
- **Sheet structure**:
  ```
  Row 1: Date | Change | Open | Close | Volume (headers)
  Row 2: 2025-12-01 | 150.50 | 1250.00 | 1275.25 | 125000
  Row 3: 2025-12-02 | -75.25 | 1275.25 | 1200.00 | 98500
  ...
  ```
- Columns C, D, E (Open, Close, Volume) are optional
- Supports both `.xlsx`, `.xls`, and `.csv` formats
- Validates contract uniqueness before import
- Handles Excel date serial numbers automatically

## Tooltip Feature
- **Trigger**: Hover over change value in entry list
- **Display**: Shows bubble tooltip above the value
- **Content**: 
  - Open price (if available)
  - Close price (if available)
  - Volume (if available)
- **Styling**: 
  - Dark background with golden border
  - Arrow pointer to value
  - Smooth fade-in/out animation
  - Z-index above other elements

## Edge Cases
- Large number of cards: grid layout with scroll
- Same contract name different casing: case-insensitive duplicate check
- Invalid numeric input: ignored with validation feedback
- Date missing: auto-inject today
- Duplicate date in card: shows warning, entry rejected
- Empty Excel file: error message
- Google Drive disconnected: sync button hidden
- No entries in card: shows "No changes recorded yet"

## Styling Guidelines
- Dark theme with gradient background (#1a2332 to #0f1419)
- Card minimum width: 550px (accommodates all header and input elements)
- Primary color: #ffc107 (yellow/gold)
- Profit color: #4caf50 (green)
- Loss color: #f44336 (red)
- Days badge: yellow text (#ffc107) on black background with white border
- Calculated change badge: colored by profit/loss
- Compact spacing for data density
- Single-row header with all controls aligned
- Entry input row: 5 columns (Date: 110px, Change: flex, Open/Close/Volume: 0.8fr each)
- Tooltip: dark bubble with golden border, smooth transitions

## Implemented Features ✅
1. ✅ Create standalone `ChangeTrackComponent` with inline template/styles
2. ✅ Implement state model & localStorage load/save helpers
3. ✅ Implement add contract flow with duplicate guard
4. ✅ Implement add entry & delete entry functions
5. ✅ Render cards with entry list (newest first)
6. ✅ Add Change Track tab in navigation
7. ✅ Responsive grid layout with scroll
8. ✅ Validation & feedback messages
9. ✅ Google Drive sync integration
10. ✅ Fullscreen card expansion
11. ✅ Date-range change calculation
12. ✅ Days count display
13. ✅ Excel/CSV upload functionality
14. ✅ Delete individual card functionality
15. ✅ Single-row header design with all controls
16. ✅ Additional data fields (open, close, volume)
17. ✅ Hover tooltip showing open/close/volume
18. ✅ 5-column input row with compact sizing
19. ✅ Excel import with 5 columns support

## Future Enhancements (Roadmap)
- Auto-sync with Google Drive (optional setting)
- Export individual card to CSV
- Bulk export all cards to single Excel file
- Search/filter contracts by name
- Sort cards (alphabetical, by total change, by last update)
- Chart visualization of change over time
- Tags or categories per contract
- Date range filter for entries
- Aggregate metrics dashboard (total profit/loss across all contracts)
- Multi-select and bulk operations
- Keyboard shortcuts (Enter to add entry, Esc to close fullscreen)

## Acceptance Criteria
- ✅ User can add a contract and see a new empty card
- ✅ User can add dated change entries; entries display immediately
- ✅ Data persists after reload (localStorage + optional Drive sync)
- ✅ No duplicate cards for same (case-insensitive) name
- ✅ Delete button removes entry and persists
- ✅ Delete card button removes entire card with confirmation
- ✅ Feature isolated to its own tab; other tabs unaffected
- ✅ Fullscreen mode works correctly
- ✅ Change calculation accurate and updates in real-time
- ✅ Excel/CSV import creates card with all entries
- ✅ File name becomes contract name
- ✅ Duplicate contract on upload shows error
- ✅ All header controls fit in single row on 500px+ cards

## Out of Scope (Current Iteration)
- Auto-sync with Drive (manual sync only)
- Individual card CSV export
- Bulk export functionality
- Chart visualizations
- Advanced filtering/search

## Technical Notes
- Uses `xlsx` library for Excel/CSV parsing
- Google Drive service handles authentication and file operations
- NgZone for async UI updates
- ChangeDetectorRef for manual change detection
- Card width: minimum 500px to prevent layout overflow
- Responsive grid with `repeat(auto-fill, minmax(500px, 1fr))`
- Status messages auto-dismiss after 4 seconds

## Testing Checklist
- ✅ Add contract with valid name
- ✅ Attempt duplicate contract (should show warning)
- ✅ Add entry with date and value
- ✅ Add entry with all fields (date, change, open, close, volume)
- ✅ Add entry with partial fields (some optional fields empty)
- ✅ Add entry with duplicate date (should show warning)
- ✅ Hover over change value to see tooltip (if optional data present)
- ✅ Delete entry (should remove and recalculate)
- ✅ Delete card (should show confirmation and remove)
- ✅ Upload Excel/CSV with 2 columns (date, change only)
- ✅ Upload Excel/CSV with 5 columns (date, change, open, close, volume)
- ✅ Upload with duplicate contract name (should show error)
- ✅ Upload with invalid file format (should show error)
- ✅ Change calculation with date picker
- ✅ Days count displays correctly
- ✅ Fullscreen expansion and close
- ✅ Data persistence across reload
- ✅ Google Drive sync (if connected)
- ✅ All UI elements fit in card header without overflow
- ✅ All 5 input fields fit in entry row without overflow
