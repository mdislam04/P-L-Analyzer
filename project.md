# Trading Dashboard - Project Understanding

## Executive Summary

This is a comprehensive **Angular 21 standalone component application** designed for traders to track, analyze, and visualize trading contract performance. The application provides multiple specialized views for P&L analysis, contract tracking, technical analysis, and performance metrics with Google Drive integration for cloud backup and sync.

**Repository**: P-L-Analyzer (GitHub: mdislam04)  
**Current Branch**: master  
**Tech Stack**: Angular 21 + TypeScript 5.9 + Vitest + XLSX + Chart.js  
**Architecture**: Single-page application with standalone components (no NgModules)

---

## Project Architecture

### Core Design Principles

1. **Standalone Component Architecture**
   - No NgModules - uses Angular 21's standalone API exclusively
   - Each major feature is a standalone component with its own template and styles
   - Component isolation with clear data flow and dependencies

2. **Inline Templates & Styles**
   - Main components use inline template strings for maintainability
   - Component-scoped styles using template literals
   - Enables quick modifications without file switching

3. **Local-First with Cloud Sync**
   - Primary data storage in browser's localStorage
   - Optional Google Drive integration for backup and cross-device sync
   - Offline-capable with cloud synchronization when connected

4. **Signal-Based State Management**
   - Uses Angular signals for reactive state (`signal()`)
   - Two-way binding with `[(ngModel)]` for forms
   - No external state management libraries (Redux, NgRx, etc.)
   - All state managed through component properties

---

## Application Structure

### File Organization

```
trading-dashboard/
├── src/
│   ├── app/
│   │   ├── app.ts                        # Main app container (1482 lines)
│   │   ├── app.config.ts                 # Application configuration & providers
│   │   ├── app.routes.ts                 # Route definitions (empty - tabs used instead)
│   │   ├── app.spec.ts                   # Unit tests
│   │   ├── change-track.component.ts     # Daily change tracking (814 lines)
│   │   ├── dashboard-v2.component.ts     # Advanced analytics dashboard (764 lines)
│   │   ├── stock-radar.component.ts      # Technical levels tracker (1417 lines)
│   │   ├── help.component.ts             # Help documentation component
│   │   └── google-drive.service.ts       # Google Drive API integration (248 lines)
│   ├── environments/
│   │   ├── environment.example.ts        # Template for credentials
│   │   ├── environment.ts                # Development environment config
│   │   └── environment.prod.ts           # Production environment config
│   ├── types/
│   │   └── chartjs.d.ts                  # Chart.js type definitions
│   ├── main.ts                           # Application bootstrap
│   ├── index.html                        # HTML entry point
│   └── styles.css                        # Global styles
├── docs/
│   ├── change-track-requirements.md      # Change Track feature specification
│   ├── dashboardv2.md                    # V2 Dashboard design document
│   ├── stockradar.md                     # Stock Radar feature specification
│   └── GOOGLE_DRIVE_SETUP.md            # Google Drive setup guide
├── .github/
│   └── copilot-instructions.md           # GitHub Copilot context & guidelines
├── package.json                          # Dependencies & scripts
├── angular.json                          # Angular CLI configuration
├── tsconfig.json                         # TypeScript configuration
├── features.md                           # Pending features & enhancements
└── enhancements.md                       # Future improvement ideas
```

---

## Core Components

### 1. App Component (`app.ts`) - Main Container
**Role**: Primary application shell with tab-based navigation  
**Size**: 1482 lines  
**Key Features**:
- Tab navigation system (Input Data, Dashboard, V2 Dashboard, Change Track, Stock Radar, Help)
- Contract data management (add, delete, clear)
- Excel import/export functionality
- Google Drive connection controls
- P&L calculations and aggregations
- Dashboard visualizations

**Data Model**:
```typescript
interface Contract {
  monthYear: string;      // Format: "YYYY-MM"
  name: string;           // Contract name (e.g., "WIPRO25DECFUT")
  type: 'regular' | 'nifty';
  pnl: number;           // Profit/Loss amount
}
```

**Key Methods**:
- `getTotalPnL()`: Calculate total P&L across all contracts
- `getTotalProfit()`: Sum of all positive P&L
- `getTotalLoss()`: Sum of all negative P&L
- `getMajorProfits()`: Top 12 profitable contracts
- `getMajorLosses()`: Top 12 loss-making contracts
- `getNiftyProfits()`: NIFTY contracts with profits
- `getNiftyLosses()`: NIFTY contracts with losses
- `onFileChange()`: Parse and import Excel files
- `downloadTemplate()`: Generate Excel template

**Excel Integration**:
- **Import Format**: 2 columns (Symbol, Realized P&L)
- **Auto Type Detection**: If symbol contains "NIFTY" (case-insensitive) → nifty type, else → regular
- **Export Template**: Generates 2-column template with sample data

**LocalStorage Key**: `tradingContracts`

---

### 2. Dashboard V2 Component (`dashboard-v2.component.ts`)
**Role**: Advanced performance analytics with comprehensive metrics  
**Size**: 764 lines  
**Key Features**:
- Advanced trading metrics calculation
- Performance snapshot visualization
- Monthly data selection and filtering
- Google Drive sync for historical data
- Image export functionality
- Compact grid layout for metrics

**Advanced Metrics**:
- **Net P&L**: Total profit/loss
- **Total Trades**: Count of all contracts
- **Winners/Losers**: Count of profitable/losing trades
- **Win Rate (%)**: `(Winners / Total Trades) × 100`
- **Average Win (₹)**: Mean profit of winning trades
- **Average Loss (₹)**: Mean loss of losing trades
- **Profit Factor**: `Total Wins / Total Losses` (quality ratio)
- **Max Drawdown (₹)**: Largest peak-to-trough decline
- **Longest Win Streak**: Maximum consecutive wins
- **Longest Loss Streak**: Maximum consecutive losses

**Data Management**:
```typescript
interface V2DashboardData {
  version: string;
  month: string;          // YYYY-MM
  lastModified: string;
  contracts: Contract[];
}
```

**Google Drive Integration**:
- Saves monthly snapshots to Drive
- Filename format: `v2-dashboard-YYYY-MM.json`
- Loads historical data by month selection
- Auto-sync current month data

**LocalStorage Key**: `v2DashboardData`

---

### 3. Change Track Component (`change-track.component.ts`)
**Role**: Manual tracking of day-to-day price changes per contract  
**Size**: 814 lines  
**Key Features**:
- Contract card system (one card per contract)
- Daily change value entry with date picker
- Extended data fields (open, close, volume)
- Excel/CSV bulk import
- Fullscreen mode for detailed analysis
- Date-range based change calculation
- Google Drive sync

**Data Model**:
```typescript
interface ChangeEntry { 
  date: string;           // YYYY-MM-DD
  value: number;          // Change value (supports negatives)
  open?: number;          // Optional: Opening price
  close?: number;         // Optional: Closing price
  volume?: number;        // Optional: Volume
  isEditing?: boolean;    // UI state flag
}

interface ChangeCard { 
  name: string;                 // Contract name
  entries: ChangeEntry[];       // Chronological entries
  expanded?: boolean;           // Fullscreen toggle state
  selectedFromDate?: string;    // Start date for change calculation
  calculatedChange?: number;    // Computed change from selected date
  daysCount?: number;          // Number of days in calculation
}
```

**Key Behaviors**:
- **Add Contract**: Case-insensitive uniqueness check
- **Add Entry**: Validates date uniqueness, sorts newest first
- **Excel Import**: Filename becomes contract name, parses dated entries
- **Change Calculation**: Cumulative change from selected date to latest
- **Fullscreen Mode**: Expands card to full viewport with larger text
- **Inline Editing**: Edit entries directly in the list

**Excel Format**:
- Column A: Date (YYYY-MM-DD)
- Column B: Change value
- Optional columns: Open, Close, Volume

**LocalStorage Key**: `changeTrackData`  
**Google Drive Filename**: `change-track-data.json`

---

### 4. Stock Radar Component (`stock-radar.component.ts`)
**Role**: Technical analysis tracking with support/resistance levels and notes  
**Size**: 1417 lines  
**Key Features**:
- Stock card system (one per stock symbol)
- Support level tracking with auto-labeling (Support1, Support2, ...)
- Resistance level tracking with auto-labeling (Resistance1, Resistance2, ...)
- Rich text notes with Markdown support
- Markdown preview mode
- Expandable/collapsible cards
- Date context tracking
- Google Drive sync

**Data Model**:
```typescript
interface StockLevel {
  id: string;             // Unique identifier
  label: string;          // Auto-generated: "Support1", "Support2", etc.
  value: number;          // Price level
  timestamp: Date;        // When added
}

interface StockNote {
  id: string;
  text: string;           // Markdown-formatted text
  timestamp: Date;
  format?: 'plain' | 'markdown';  // Default: 'markdown'
}

interface StockCard {
  name: string;                    // Stock symbol (e.g., "WIPRO")
  dateContext: string;             // YYYY-MM-DD (context date)
  supports: StockLevel[];          // Support levels array
  resistances: StockLevel[];       // Resistance levels array
  notes: StockNote[];              // Notes/developments array
  expanded: boolean;               // Card expansion state
}
```

**Key Features**:
- **Auto-Labeling**: Supports and resistances automatically numbered (Support1, Support2, etc.)
- **Markdown Editor**: Formatting toolbar with bold, italic, code, lists, links, headings
- **Preview Mode**: Toggle between edit and rendered Markdown view
- **Keyboard Shortcuts**: 
  - Ctrl+B: Bold
  - Ctrl+I: Italic
  - Ctrl+K: Insert link
- **Tooltips**: Hover over levels to see timestamp

**LocalStorage Key**: `stockRadarData`  
**Google Drive Filename**: `stock-radar-data.json`

---

### 5. Help Component (`help.component.ts`)
**Role**: User documentation and metric definitions  
**Key Features**:
- Explains all dashboard metrics with examples
- Provides formulas for calculations
- Offers usage tips
- Describes Excel format requirements

**Covered Topics**:
- Net P&L definition and calculation
- Win Rate formula and interpretation
- Average Win/Loss calculations
- Profit Factor meaning and thresholds
- Max Drawdown explanation
- Win/Loss Streak significance
- Category splits (Regular vs NIFTY)

---

### 6. Google Drive Service (`google-drive.service.ts`)
**Role**: Cloud storage integration for data backup and sync  
**Size**: 248 lines  
**Key Features**:
- OAuth 2.0 authentication via Google Identity Services
- Token management with expiration handling
- File CRUD operations (create, read, update, search)
- Automatic token refresh (5-minute buffer)
- Error handling and fallback

**API Methods**:
- `initiateAuth()`: Start OAuth flow
- `isConnected()`: Check connection status
- `ensureValidToken()`: Validate/refresh token
- `searchFile(fileName)`: Find file by name
- `createFile(fileName, content)`: Create new Drive file
- `updateFile(fileId, content)`: Update existing file
- `downloadFile(fileId)`: Retrieve file content
- `disconnect()`: Clear credentials

**Storage Keys**:
- `googleDriveConfig`: Stores access token and expiration

**Configuration**:
```typescript
environment.googleDrive = {
  clientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
  redirectUri: 'http://localhost:4200',
  scope: 'https://www.googleapis.com/auth/drive.file'
}
```

---

## Data Flow Architecture

### Component Communication
```
App Component (Parent)
│
├─→ Dashboard V2 Component (@Input: contracts)
│   └─→ Receives contract data for metrics calculation
│
├─→ Change Track Component (Standalone)
│   └─→ Independent localStorage + Drive sync
│
├─→ Stock Radar Component (Standalone)
│   └─→ Independent localStorage + Drive sync
│
├─→ Help Component (Static)
│   └─→ No data dependencies
│
└─→ Google Drive Service (Injected)
    └─→ Shared across all components needing sync
```

### Data Persistence Flow

1. **Local Storage (Primary)**
   ```
   User Action → Component State Update → localStorage.setItem()
   ```

2. **Google Drive Sync (Secondary)**
   ```
   User Clicks Sync → Service.ensureValidToken() → 
   Service.searchFile() → Create/Update File → 
   localStorage.setItem() (backup) → Show Success Message
   ```

3. **Cross-Device Sync**
   ```
   Device A: Save to Drive → 
   Device B: Load from Drive → 
   Merge/Overwrite Local Data → 
   Update Component State
   ```

---

## Key Technologies & Libraries

### Core Framework
- **Angular 21.0.0**: Latest Angular with standalone components
- **TypeScript 5.9.2**: Strict typing and modern JS features
- **RxJS 7.8.0**: Reactive programming (minimal usage)

### UI & Visualization
- **Chart.js 4.5.1**: Chart rendering for V2 dashboard
- **ngx-markdown 21.0.1**: Markdown rendering in Stock Radar
- **marked 17.0.1**: Markdown parsing library

### Data Processing
- **XLSX 0.18.5**: Excel file import/export
- **html2canvas 1.4.1**: Screenshot/export functionality
- **html-to-image 1.11.11**: Alternative image export

### Testing & Development
- **Vitest 4.0.8**: Fast unit testing framework
- **jsdom 27.1.0**: DOM implementation for testing
- **Angular CLI 21.0.1**: Build and development tools

### Build & Tooling
- **Angular Build 21.0.1**: Build system
- **Prettier**: Code formatting (100 char width, single quotes)
- **npm 11.6.2**: Package management

---

## Color Scheme & Styling

### Theme Colors
```css
Background Gradient: #1a2332 → #0f1419 (dark blue-gray)
Primary Accent:      #ffc107 (yellow/gold)
Profit Indicator:    #4caf50 (green)
Loss Indicator:      #f44336 (red)
NIFTY Badge:         #2196f3 (blue)
Regular Badge:       #ffc107 (yellow)
Card Background:     rgba(255,255,255,0.04)
Border:              rgba(255,255,255,0.1)
```

### Design Patterns
- **Dark Theme**: Professional trading interface aesthetic
- **Gradient Backgrounds**: Depth and visual hierarchy
- **Compact Density**: Maximum information per screen
- **Color-Coded Values**: Instant profit/loss recognition
- **Animations**: Smooth transitions and fade-ins
- **Responsive Grid**: Adapts to screen sizes

---

## Business Logic & Calculations

### P&L Aggregation
```typescript
// Total P&L
getTotalPnL(): number {
  return this.contracts.reduce((sum, c) => sum + c.pnl, 0);
}

// Separate profits and losses
getTotalProfit(): number {
  return this.contracts
    .filter(c => c.pnl > 0)
    .reduce((sum, c) => sum + c.pnl, 0);
}

getTotalLoss(): number {
  return this.contracts
    .filter(c => c.pnl < 0)
    .reduce((sum, c) => sum + c.pnl, 0);
}
```

### Advanced Metrics (V2 Dashboard)
```typescript
// Win Rate
winRate = (winners / totalTrades) * 100

// Average Win
avgWin = totalWinAmount / winnersCount

// Average Loss
avgLoss = Math.abs(totalLossAmount) / losersCount

// Profit Factor
profitFactor = totalWinAmount / Math.abs(totalLossAmount)

// Max Drawdown
maxDrawdown = max(peak - trough) across cumulative equity curve

// Streaks
longestWinStreak = max consecutive trades with pnl > 0
longestLossStreak = max consecutive trades with pnl < 0
```

### Change Calculation (Change Track)
```typescript
// Calculate change from selected date to latest
calculateChange(card: ChangeCard) {
  if (!card.selectedFromDate || card.entries.length === 0) return;
  
  const fromEntry = card.entries.find(e => e.date === card.selectedFromDate);
  const latestEntry = card.entries[0]; // Newest first
  
  if (fromEntry && latestEntry) {
    card.calculatedChange = latestEntry.value - fromEntry.value;
    card.daysCount = daysBetween(card.selectedFromDate, latestEntry.date);
  }
}
```

---

## Excel Integration

### Import Format (Main App)
**Expected Columns**: 2  
**Column A**: Symbol (contract name)  
**Column B**: Realized P&L (number)

**Auto Type Detection**:
```typescript
const contractName = String(row[0]).trim();
const pnl = Number(row[1]);
const contractType = contractName.toUpperCase().includes('NIFTY') 
  ? 'nifty' 
  : 'regular';
```

### Import Format (Change Track)
**Expected Columns**: 2-5  
**Column A**: Date (YYYY-MM-DD or Excel serial)  
**Column B**: Change value (number)  
**Column C**: Open (optional number)  
**Column D**: Close (optional number)  
**Column E**: Volume (optional number)

**Filename**: Becomes the contract name (extension removed)

### Export Template
```typescript
// Main app template
[
  ['Symbol', 'Realized P&L'],
  ['WIPRO25DECFUT', 18600],
  ['NIFTY25N112450PE', -7946.25],
  ['KAYNES25DECFUT', 7500]
]
```

### File Handling
- Uses `XLSX.read()` for parsing
- Uses `XLSX.utils.sheet_to_json()` for data extraction
- Uses `XLSX.utils.book_new()` and `XLSX.writeFile()` for export
- Supports `.xlsx` and `.xls` formats
- Handles Excel date serial numbers

---

## Google Drive Integration

### Authentication Flow
1. User clicks "Connect Drive" button
2. `GoogleDriveService.initiateAuth()` called
3. Google OAuth popup appears
4. User grants permissions
5. Access token stored in localStorage
6. Token expiration tracked (with 5-minute buffer)
7. Auto-refresh on subsequent operations

### File Structure in Drive
```
Google Drive/
├── change-track-data.json          # Change Track data
├── stock-radar-data.json           # Stock Radar data
├── v2-dashboard-2024-12.json       # V2 Dashboard Dec 2024
├── v2-dashboard-2024-11.json       # V2 Dashboard Nov 2024
└── v2-dashboard-2024-10.json       # V2 Dashboard Oct 2024
```

### Sync Strategy
- **On-Demand**: User triggers sync manually
- **Conflict Resolution**: Last write wins (no merge logic)
- **File Search**: Search by exact filename before create/update
- **Error Handling**: Graceful fallback to local-only mode

### Data Format (JSON)
```json
{
  "version": "1.0",
  "lastModified": "2024-12-12T10:30:00.000Z",
  "data": {
    "WIPRO25DECFUT": [
      { "date": "2024-12-12", "value": 150, "open": 550, "close": 555, "volume": 1200 }
    ]
  }
}
```

---

## LocalStorage Schema

### Main App Contracts
**Key**: `tradingContracts`  
**Format**: `Contract[]`
```json
[
  {
    "monthYear": "2024-12",
    "name": "WIPRO25DECFUT",
    "type": "regular",
    "pnl": 18600
  }
]
```

### Change Track Data
**Key**: `changeTrackData`  
**Format**: `{ [contractName: string]: ChangeEntry[] }`
```json
{
  "WIPRO25DECFUT": [
    { "date": "2024-12-12", "value": 150, "open": 550, "close": 555, "volume": 1200 }
  ]
}
```

### Stock Radar Data
**Key**: `stockRadarData`  
**Format**: `StockCard[]`
```json
[
  {
    "name": "WIPRO",
    "dateContext": "2024-12-12",
    "supports": [
      { "id": "s1", "label": "Support1", "value": 250, "timestamp": "2024-12-12T10:00:00Z" }
    ],
    "resistances": [
      { "id": "r1", "label": "Resistance1", "value": 260, "timestamp": "2024-12-12T10:05:00Z" }
    ],
    "notes": [
      { "id": "n1", "text": "**Strong breakout** above 255", "timestamp": "2024-12-12T10:10:00Z" }
    ]
  }
]
```

### V2 Dashboard Data
**Key**: `v2DashboardData`  
**Format**: `V2DashboardData`
```json
{
  "version": "1.0",
  "month": "2024-12",
  "lastModified": "2024-12-12T10:30:00Z",
  "contracts": [...]
}
```

### Google Drive Config
**Key**: `googleDriveConfig`  
**Format**: `GoogleDriveConfig`
```json
{
  "accessToken": "ya29.a0AfB_...",
  "expiresAt": 1702387200000
}
```

---

## User Workflows

### 1. Adding Trading Data
**Manual Entry**:
1. Navigate to "Input Data" tab
2. Select month/year
3. Enter contract name
4. Select type (Regular/NIFTY)
5. Enter P&L value
6. Click "Add Contract"
7. Data saved to localStorage immediately

**Excel Import**:
1. Click "Choose Excel File"
2. Select Excel file (2 columns: Symbol, Realized P&L)
3. File parsed automatically
4. Type auto-detected from symbol name
5. Progress indicator shown
6. Success/error message displayed
7. Data merged with existing contracts

### 2. Viewing Dashboard Analytics
**Main Dashboard**:
1. Click "Dashboard" tab
2. View overall realized P&L (large display)
3. Scroll to see:
   - Top 12 profit contributors
   - Top 12 loss contributors
   - NIFTY Futures performance
   - NIFTY Options performance
   - Monthly summary

**V2 Dashboard**:
1. Click "V2 Dashboard" tab
2. View compact metrics grid:
   - Total trades, Win rate, Winners/Losers
   - Average win/loss, Profit factor
   - Max drawdown, Streaks
3. Export as image (📸 button)
4. Select historical month (if Drive connected)

### 3. Tracking Daily Changes
1. Click "Change Track" tab
2. Enter contract name → Click "ADD"
3. Select date (defaults to today)
4. Enter change value
5. Optional: Add open, close, volume
6. Click "+" to add entry
7. Use date picker to calculate change over range
8. View calculated change and days count
9. Optional: Click fullscreen (⛶) for detailed view
10. Optional: Upload Excel with historical data

### 4. Technical Level Tracking
1. Click "Stock Radar" tab
2. Enter stock name + date → Click "Add Stock Card"
3. Card created (first card expanded by default)
4. Add support level (number) → Click "+"
5. Add resistance level (number) → Click "+"
6. Add notes (Markdown formatted) → Click "+"
7. Toggle between edit/preview mode (👁️ button)
8. Use formatting toolbar for rich text
9. Delete levels/notes individually (−)
10. Optional: Clear entire card

### 5. Google Drive Sync
**Initial Setup**:
1. Click "Connect Drive" button (top navigation)
2. Google OAuth popup appears
3. Grant permissions to access Drive files
4. Connection confirmed (✅ Drive Connected)

**Syncing Data**:
1. Ensure Drive is connected
2. Click "🔄 Sync Drive" in any tab
3. Wait for sync completion
4. Success/error message shown
5. Data backed up to Google Drive

**Loading Historical Data** (V2 Dashboard):
1. Connect to Drive
2. Select month from dropdown
3. Data automatically loaded
4. Metrics recalculated for selected month

---

## Feature Flags & Variations

### Implemented Features
✅ Manual contract entry  
✅ Excel import/export  
✅ Auto type detection (NIFTY vs Regular)  
✅ Main dashboard with P&L visualization  
✅ V2 Dashboard with advanced metrics  
✅ Change Track with daily entries  
✅ Stock Radar with support/resistance/notes  
✅ Markdown support in notes  
✅ Google Drive integration  
✅ Image export for V2 Dashboard  
✅ Fullscreen mode (Change Track)  
✅ Inline editing (Change Track)  
✅ Date-range change calculation  

### Pending Features (from features.md)
⏳ Increase contract listing from 6 to 12 (partially done - code shows 12)  
⏳ Further UI compacting (reduce font sizes)  
⏳ Chart visualizations (Chart.js integrated but limited use)  
⏳ Data persistence to backend API  
⏳ User authentication  
⏳ Multiple month/year views  
⏳ Export dashboard as PDF  
⏳ Compare month-over-month performance  
⏳ Filter contracts by date range  
⏳ Search/filter functionality in contract lists  

---

## Development Guidelines

### Code Style
- **TypeScript**: Strict typing with interfaces
- **Formatting**: Prettier (100 char width, single quotes)
- **Naming**: camelCase for variables/methods, PascalCase for classes/interfaces
- **Comments**: Business logic and complex calculations documented

### Component Method Pattern
```typescript
// Calculation methods (pure functions)
getTotalPnL(): number { }
getTotalProfit(): number { }

// Filter/Sort methods (return new arrays)
getMajorProfits(): Contract[] { }

// Formatting methods (presentation logic)
formatNumber(num: number): string { }
formatMonth(monthYear: string): string { }

// User actions (side effects)
addContract(): void { }
deleteContract(index: number): void { }

// Lifecycle hooks
ngOnInit(): void { }
ngOnDestroy(): void { }
```

### Testing Strategy
- **Framework**: Vitest (configured, tests in `*.spec.ts`)
- **Focus Areas**:
  - P&L calculation accuracy
  - Excel parsing edge cases
  - Form validation
  - Data filtering/sorting
  - LocalStorage operations
  - Google Drive error handling

### Performance Considerations
- On-demand calculations (no unnecessary recalculations)
- ArrayBuffer for Excel processing
- No memoization yet (small datasets)
- Future: Introduce memoization for 5k+ records
- Lazy loading not needed (single-page app with tabs)

---

## Browser Compatibility
- **Target**: Modern browsers with ES6+ support
- **Tested**: Chrome, Firefox, Safari, Edge
- **No IE11 Support**: Uses modern Angular features

---

## Build & Deployment

### Development
```bash
npm start          # Start dev server on http://localhost:4200
npm run watch      # Build with watch mode
```

### Production Build
```bash
npm run build      # Outputs to dist/ directory
```

### Testing
```bash
npm test           # Run Vitest tests
```

### Package Manager
```bash
npm 11.6.2         # Locked via packageManager field
```

---

## Security Considerations

### Google Drive OAuth
- Client ID stored in environment files (not committed)
- Access tokens stored in localStorage (potential XSS risk)
- Token refresh mechanism with 5-minute buffer
- Scope limited to `drive.file` (app-created files only)

### Data Privacy
- All data stored locally by default
- Google Drive sync is optional
- No backend server (no data transmission except Drive API)
- No user tracking or analytics

### Input Validation
- Contract name trimming and sanitization
- Number validation for P&L values
- Date format validation
- Excel file type checking (`.xlsx`, `.xls`)

---

## Common Pitfalls & Best Practices

### ❌ Don't
- Mutate arrays directly (use spread operator or array methods)
- Skip Excel data validation before importing
- Hardcode colors (use consistent color variables)
- Skip user confirmations for destructive actions (Clear All)
- Forget to reset form fields after successful addition

### ✅ Do
- Use `trackBy` for large `*ngFor` lists
- Validate date formats strictly (YYYY-MM-DD)
- Ensure contract type is exactly "regular" or "nifty"
- Test calculations with both positive and negative P&L
- Handle Excel date serial numbers correctly
- Provide user feedback for all async operations
- Gracefully handle Google Drive connection failures

---

## Debugging Tips

### Console Errors
- Check browser console for Excel parsing errors
- Verify date formats in monthYear fields (must be "YYYY-MM")
- Ensure contract type matches exactly ("regular" or "nifty")

### LocalStorage Inspection
```javascript
// View stored data in browser console
localStorage.getItem('tradingContracts')
localStorage.getItem('changeTrackData')
localStorage.getItem('stockRadarData')
localStorage.getItem('v2DashboardData')
localStorage.getItem('googleDriveConfig')
```

### Google Drive Issues
- Check token expiration: `driveService.isConnected()`
- Verify OAuth configuration in `environment.ts`
- Check network tab for API errors (401 = auth, 404 = file not found)
- Ensure `https://www.googleapis.com/auth/drive.file` scope granted

---

## Future Roadmap

### Phase 1: Current State ✅
- Core P&L tracking
- Excel import/export
- Basic dashboards
- Google Drive sync
- Change tracking
- Technical level tracking

### Phase 2: Enhancements 🚧
- Backend API integration
- User authentication
- Multi-user support
- Real-time collaboration
- Enhanced charting (equity curves, candlesticks)
- PDF export

### Phase 3: Advanced Analytics 🔮
- AI-powered pattern recognition
- Risk management alerts
- Strategy backtesting
- Performance attribution
- Correlation analysis
- Sharpe ratio, Sortino ratio calculations

### Phase 4: Integrations 🌐
- Broker API integration (live data)
- Tax report generation
- Calendar view for trades
- Mobile app (PWA or native)
- Desktop app (Electron)

---

## Documentation Files

### Primary Documentation
- **README.md**: User-facing guide with features and setup
- **project.md** (this file): Comprehensive project understanding
- **.github/copilot-instructions.md**: GitHub Copilot context

### Feature Specifications
- **docs/dashboardv2.md**: V2 Dashboard design and metrics
- **docs/change-track-requirements.md**: Change Track feature spec
- **docs/stockradar.md**: Stock Radar feature spec
- **docs/GOOGLE_DRIVE_SETUP.md**: Google Drive integration guide

### Planning Documents
- **features.md**: Pending feature implementations
- **enhancements.md**: Future enhancement ideas

---

## Key Metrics & Numbers

### Codebase Statistics
- **Total Lines**: ~5,500+ lines across all components
- **Largest Component**: Stock Radar (1,417 lines)
- **Main App Component**: 1,482 lines
- **Change Track**: 814 lines
- **V2 Dashboard**: 764 lines
- **Google Drive Service**: 248 lines

### Data Limits
- **Contract Listings**: Top 12 displayed (user-facing)
- **LocalStorage**: ~5-10MB browser limit (thousands of contracts)
- **Excel Import**: No hard limit (memory-dependent)
- **Google Drive**: 15GB free storage

### Performance Targets
- **Initial Load**: < 1 second
- **Excel Import**: ~100ms per 100 rows
- **Dashboard Render**: < 200ms
- **Google Drive Sync**: 1-3 seconds per file

---

## Contact & Contribution

### Repository Information
- **GitHub Repo**: P-L-Analyzer
- **Owner**: mdislam04
- **Branch**: master
- **License**: Not specified (check repo)

### Development Workflow
1. Read copilot-instructions.md for guidelines
2. Follow existing code patterns
3. Test locally with `ng serve`
4. Run tests with `npm test`
5. Build for production with `ng build`
6. Commit with descriptive messages

---

## Conclusion

This Trading Dashboard is a sophisticated Angular 21 application built for serious traders who need:
- **Comprehensive P&L tracking** across multiple contract types
- **Advanced performance analytics** with industry-standard metrics
- **Technical analysis tools** for level tracking and note-taking
- **Cloud backup** via Google Drive integration
- **Offline-first** design with local storage primacy
- **Flexible data input** via manual entry or Excel import

The architecture emphasizes **component isolation**, **type safety**, and **user experience** while maintaining a **compact, information-dense interface** suitable for professional trading analysis.

Key strengths:
- ✅ Standalone component architecture (future-proof)
- ✅ Comprehensive metric calculations
- ✅ Multiple specialized views for different use cases
- ✅ Offline-capable with cloud sync
- ✅ Rich text support (Markdown)
- ✅ Excel integration for bulk operations

Areas for growth:
- 🚀 Backend API for multi-device real-time sync
- 🚀 Enhanced charting and visualization
- 🚀 AI-powered insights and alerts
- 🚀 Mobile app development
- 🚀 Broker integration for live data

This project demonstrates mastery of modern Angular development, TypeScript, cloud integration, and domain-specific application design for financial analysis.
