# Trading Dashboard

A comprehensive Angular-based trading performance dashboard for tracking and analyzing trading contracts with profit/loss visualization. This application helps traders monitor their regular and NIFTY contract performances with an intuitive interface.

## Features

### 📊 Dual Interface
- **Input Data Tab**: Add trading contracts manually or via Excel import
- **Dashboard Tab**: Visualize performance metrics and analytics

### 📝 Data Entry Options
- **Manual Entry**: Add individual contracts with month/year, contract name, type (Regular/NIFTY), and P&L
- **Excel Import**: Bulk upload contracts using Excel files (2-column format: Symbol, Realized P&L)
- **Auto Type Detection**: Contract type automatically inferred from symbol name (NIFTY symbols detected automatically)
- **Template Download**: Get a pre-formatted Excel template for easy data entry

### 📈 Dashboard Analytics
- **Overall Realized P&L**: Compact display of total profit/loss
- **Major Profit Contributors**: Top 12 profitable regular contracts
- **Major Loss Contributors**: Top 12 loss-making regular contracts
- **NIFTY Futures Performance**: Consolidated P&L with top movers
- **NIFTY Options Performance**: Consolidated P&L with top movers
### 🚀 V2 Dashboard (Experimental)
- Compact performance snapshot with initial metrics
- Advanced analytics foundation: max drawdown, win/loss streaks
- Lightweight equity curve sparkline (placeholder)

#### Metrics, Calculations & Usefulness
- **Net P&L**: Sum of all `pnl`. Positive → net profit; negative → net loss.
- **Total Trades**: Count of loaded contracts.
- **Winning Trades**: Count where `pnl > 0`.
- **Losing Trades**: Count where `pnl < 0`.
- **Win Rate (%)**: `(Winning Trades / Total Trades) * 100`. Gauges consistency.
- **Average Win (₹)**: `Sum(pnl > 0) / Winning Trades`. Typical profitable trade size.
- **Average Loss (₹)**: `Abs(Sum(pnl < 0)) / Losing Trades`. Typical losing trade size.
- **Profit Factor**: `Sum(pnl > 0) / Abs(Sum(pnl < 0))`. >1 indicates quality of returns vs losses.
- **Max Drawdown (₹)**: Max peak-to-trough decline of cumulative P&L. Critical for risk tolerance.
- **Longest Win Streak**: Max consecutive `pnl > 0`. Signals positive momentum.
- **Longest Loss Streak**: Max consecutive `pnl < 0`. Highlights risk of tilt/regime shift.

#### Equity Curve Sparkline (Placeholder)
- Built from the cumulative sum of `pnl`, normalized to fit a compact visual. Intended as a stopgap before full charting.

See `docs/dashboardv2.md` for the full V2 roadmap and design.
- **Monthly Summary**: Concise overview of total profit, loss, and net P&L

### � Change Track
Track daily price changes per contract with extended metrics:
- **Contract Cards**: One card per unique contract name
- **Pin/Star Feature**: Pin important contracts to top with star (⭐) icon
- **Daily Entries**: Record change, open, close, and volume data
- **Inline Editing**: Edit entries directly with ✎ button
- **Column View**: Organized display with headers (Date, Change, Open, Close, Volume, Actions)
- **Volume Formatting**: Indian number system (K/L/Cr) with tooltip for exact values
- **5-Day Default**: Shows exactly 5 trading days by default (ignoring weekends)
- **Change Calculator**: Date range picker with cumulative change badge
- **Excel Import**: Bulk import contract data from Excel/CSV files
- **Fullscreen Mode**: Expand any card to full viewport for detailed analysis
- **Google Drive Sync**: Backup and sync data across devices
- **Hover Actions**: Edit and delete buttons appear on row hover
- **Auto-Sort**: Pinned cards first (alphabetically), then unpinned (alphabetically)

### �💡 Key Capabilities
- Real-time P&L calculations
- Color-coded profit/loss indicators (green/red)
- Contract type differentiation (Regular vs NIFTY)
- Month-wise tracking
- Priority management with pin/star feature
- Inline data editing
- Delete individual contracts or entries
- Clear all data functionality
- Persistent storage with auto-save
- Indian currency formatting (₹)

## Technology Stack

- **Framework**: Angular 21.0.0 (Standalone Components)
- **Language**: TypeScript 5.9.2
- **Build Tool**: Angular CLI 21.0.1
- **Testing**: Vitest 4.0.8
- **Excel Processing**: XLSX 0.18.5
- **Styling**: Component-scoped CSS with gradient effects
- **Storage**: localStorage with Google Drive sync

## Prerequisites

- Node.js (v18 or higher recommended)
- npm 11.6.2 or higher

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd trading-dashboard
```

2. Install dependencies:
```bash
npm install
```

## Development

### Start Development Server

```bash
npm start
# or
ng serve
```

Navigate to `http://localhost:4200/`. The application will automatically reload when you modify source files.

### Code Scaffolding

Generate new components using Angular CLI:

```bash
ng generate component component-name
```

For available schematics:
```bash
ng generate --help
```

## Building

Build for production:

```bash
npm run build
# or
ng build
```

Build artifacts will be stored in the `dist/` directory with optimizations for performance.

### Watch Mode

Build in watch mode for development:
```bash
npm run watch
```

## Testing

Run unit tests using Vitest:

```bash
npm test
# or
ng test
```

## Excel File Format

When importing data via Excel, use the following simplified format:

| Column A | Column B |
|----------|----------|
| Symbol | Realized P&L |
| WIPRO25DECFUT | 18600 |
| NIFTY25N112450PE | -7946.25 |
| KAYNES25DECFUT | 7500 |

- **Column A**: Symbol/Contract name (e.g., WIPRO25DECFUT, NIFTY25N112450PE)
- **Column B**: Realized P&L amount (positive for profit, negative for loss)

**Note**: Contract type (Regular/NIFTY) is automatically detected from the symbol name. If the symbol contains "NIFTY" (case-insensitive), it's classified as a NIFTY contract; otherwise, it's classified as Regular.

Download the template from the application for the correct format.

## Project Structure

```
trading-dashboard/
├── src/
│   ├── app/
│   │   ├── app.ts              # Main component with all logic and inline template
│   │   ├── app.config.ts       # Application configuration
│   │   ├── app.routes.ts       # Routing configuration
│   │   └── app.spec.ts         # Unit tests
│   ├── main.ts                 # Application entry point
│   ├── index.html              # HTML shell
│   └── styles.css              # Global styles
├── public/                     # Static assets
├── angular.json                # Angular CLI configuration
├── package.json                # Dependencies and scripts
└── tsconfig.json              # TypeScript configuration
```

## Usage Guide

### Adding Contracts

1. Navigate to the "Input Data" tab
2. Choose between:
   - **Excel Upload**: Click "Choose Excel File" and select your formatted Excel file
   - **Manual Entry**: Fill in the form fields and click "Add Contract"

### Viewing Dashboard

1. Add contracts in the Input Data tab
2. Switch to the "Dashboard" tab to view:
   - Overall P&L summary
   - Major profit/loss contributors
   - NIFTY-specific performance
   - Monthly summary statistics

### Managing Data

- **Delete Contract**: Click the "Delete" button next to any contract in the list
- **Clear All**: Remove all contracts at once (with confirmation)
- **Download Template**: Get an Excel template with the correct format

## Configuration

### Prettier Configuration

The project includes Prettier with the following settings:
- Print width: 100 characters
- Single quotes: enabled
- Angular HTML parser for `.html` files

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ JavaScript support required

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is private and not licensed for public use.

## Additional Resources

- [Angular Documentation](https://angular.dev)
- [Angular CLI Reference](https://angular.dev/tools/cli)
- [Vitest Documentation](https://vitest.dev/)
- [XLSX Library](https://docs.sheetjs.com/)
