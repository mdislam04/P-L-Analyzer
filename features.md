# Pending Features Implementation

## Feature 1: Increase Contract Listing from 6 to 12

### Description
Increase the number of contracts displayed in all dashboard cards from top 6 to top 12, and reduce the font size of listed contracts for better readability.

### Changes Required

#### File: `src/app/app.ts`

1. **Update all filter methods to show 12 items instead of 6:**
   - `getMajorProfits()`: Change `.slice(0, 6)` to `.slice(0, 12)`
   - `getMajorLosses()`: Change `.slice(0, 6)` to `.slice(0, 12)`
   - `getNiftyProfits()`: Change `.slice(0, 6)` to `.slice(0, 12)`
   - `getNiftyLosses()`: Change `.slice(0, 6)` to `.slice(0, 12)`

2. **Reduce font size in styles section:**
   - Locate `.contract-list-item` class
   - Update `.contract-name` font-size from `1em` to `0.85em` or `0.9em`
   - Update `.contract-value` font-size from `1.1em` to `0.95em` or `1em`

### Impact
- Dashboard will show more contracts per card
- Text will be smaller but more information will be visible
- Cards may need to be scrollable if all 12 items don't fit

---

## Feature 2: Simplified Excel Format with Auto Type Detection

### Description
Simplify Excel import to only require 2 columns (Symbol and Realized P&L). The contract type (regular/nifty) will be automatically inferred based on the symbol name - if it contains "NIFTY" (case-insensitive), it's a NIFTY contract, otherwise it's regular.

### Changes Required

#### File: `src/app/app.ts`

1. **Update `onFileChange()` method:**
   - Change Excel parsing logic to read only 2 columns (A and B)
   - Add auto-detection logic:
     ```typescript
     const contractName = String(row[0]).trim();
     const pnl = Number(row[1]);
     const contractType = contractName.toUpperCase().includes('NIFTY') ? 'nifty' : 'regular';
     ```
   - Update validation to check only 2 columns instead of 3
   - Remove the explicit type column check

2. **Update `downloadTemplate()` method:**
   - Change template header from `['Contract Name', 'Type', 'Profit/Loss']` to `['Symbol', 'Realized P&L']`
   - Update sample data to remove the middle column:
     ```typescript
     ['Symbol', 'Realized P&L'],
     ['WIPRO25DECFUT', 18600],
     ['NIFTY25N112450PE', -7946.25],
     ['KAYNES25DECFUT', 7500]
     ```

3. **Update template UI text:**
   - Change upload label text from "(Columns: Contract Name, Type, Profit/Loss)" to "(Columns: Symbol, Realized P&L)"
   - Update `.upload-info` text from "Column A: Contract Name, Column B: Type (regular/nifty), Column C: Profit/Loss" to "Column A: Symbol, Column B: Realized P&L (Type auto-detected from symbol name)"

### Impact
- Simpler Excel format for users
- Less manual work (no need to specify type)
- Automatic type detection based on naming convention
- Backward compatible (old format with 3 columns may break)

---

## Feature 3: Reduce Size of Overall P&L and Summary Sections

### Description
Make the "OVERALL REALIZED P&L" box and "NOVEMBER 2025 SUMMARY" box smaller to save screen space and make the dashboard more compact.

### Changes Required

#### File: `src/app/app.ts`

1. **Update `.overall-pnl` styles:**
   - Reduce `padding` from `40px` to `25px` or `30px`
   - Reduce `.overall-pnl h2` font-size from `1.2em` to `1em` or `1.1em`
   - Reduce `.overall-pnl .amount` font-size from `3.5em` to `2.5em` or `3em`
   - Reduce `.overall-pnl .label` font-size from `1.1em` to `0.95em` or `1em`
   - Consider reducing `margin-bottom` from `40px` to `30px`

2. **Update `.summary-section` styles:**
   - Reduce `padding` from `30px` to `20px` or `25px`
   - Reduce `.summary-section h2` font-size from `1.8em` to `1.3em` or `1.5em`
   - Reduce `.summary-stat .stat-value` font-size from `1.8em` to `1.4em` or `1.5em`
   - Reduce `.summary-stat .stat-label` font-size from `0.9em` to `0.85em`

3. **Update `.dashboard-header` styles:**
   - Reduce `.dashboard-header h1` font-size from `2.5em` to `2em` or `2.2em`
   - Reduce `margin-bottom` from `40px` to `30px`

### Impact
- More compact dashboard layout
- More visible content without excessive scrolling
- Maintains readability while saving space
- Better use of screen real estate

---

## Testing Checklist

After implementing all features, test the following:

- [ ] Dashboard shows 12 contracts in each card (or less if fewer exist)
- [ ] Contract list items have smaller font and are still readable
- [ ] Excel import works with new 2-column format (Symbol, Realized P&L)
- [ ] Type auto-detection works correctly (NIFTY symbols → nifty type)
- [ ] Type auto-detection is case-insensitive
- [ ] Downloaded template has new 2-column format
- [ ] Overall P&L box is smaller but still readable
- [ ] Summary section is smaller but still clear
- [ ] Dashboard header is proportionally sized
- [ ] All calculations still work correctly
- [ ] Responsive layout still works on different screen sizes

---

## Implementation Order

1. **Feature 3** (Size reduction) - Easiest, only CSS changes
2. **Feature 1** (12 items + smaller font) - Simple logic changes
3. **Feature 2** (Excel format) - More complex, requires testing

---

## Notes

- All changes are in `src/app/app.ts` since it's a single-component application
- After implementation, update `README.md` to reflect new Excel format
- Update `.github/copilot-instructions.md` with new patterns
- Consider adding a card height limit with scrolling for 12-item lists

---

## Feature 4: NIFTY Options Performance Card

### Description
Add a new dashboard card to track NIFTY Options contracts separately. NIFTY Options are identified by having "NIFTY" with either "CE" (Call Option) or "PE" (Put Option) in the contract name. This card will show overall NIFTY Options P&L and top 3 profit/loss contracts.

### NIFTY Options Detection Logic
A contract is considered a NIFTY Option if:
- Contract name contains "NIFTY" (case-insensitive)
- AND contract name contains "CE" OR "PE" (case-insensitive)
- Examples: `NIFTY25N112450PE`, `NIFTY25JAN24500CE`

### Changes Required

#### File: `src/app/app.ts`

1. **Add new filter methods for NIFTY Options:**
   ```typescript
   // Check if contract is a NIFTY Option
   isNiftyOption(contract: Contract): boolean {
     const name = contract.name.toUpperCase();
     return name.includes('NIFTY') && (name.includes('CE') || name.includes('PE'));
   }

   // Get overall NIFTY Options P&L
   getNiftyOptionsTotal(): number {
     return this.contracts
       .filter(c => this.isNiftyOption(c))
       .reduce((sum, c) => sum + c.pnl, 0);
   }

   // Get top 3 NIFTY Option profits
   getNiftyOptionTopProfits(): Contract[] {
     return this.contracts
       .filter(c => this.isNiftyOption(c) && c.pnl > 0)
       .sort((a, b) => b.pnl - a.pnl)
       .slice(0, 3);
   }

   // Get top 3 NIFTY Option losses
   getNiftyOptionTopLosses(): Contract[] {
     return this.contracts
       .filter(c => this.isNiftyOption(c) && c.pnl < 0)
       .sort((a, b) => a.pnl - b.pnl)
       .slice(0, 3);
   }
   ```

2. **Add new card in the template after NIFTY Loss card:**
   - Position: After the 4th card (NIFTY Loss), before the summary section
   - Card should span full width if using grid layout
   - Include overall P&L in bold
   - Show top 3 profits and top 3 losses in two columns within the card

3. **Template structure for the new card:**
   ```html
   <div class="card nifty-options-card">
     <div class="card-header">
       <span class="card-icon">📈</span>
       <span class="card-title">NIFTY OPTIONS PERFORMANCE</span>
     </div>
     <div class="nifty-options-overall">
       <strong>Overall NIFTY Options P&L:</strong>
       <span [class.profit]="getNiftyOptionsTotal() >= 0" 
             [class.loss]="getNiftyOptionsTotal() < 0"
             style="font-weight: bold; font-size: 1.2em; margin-left: 10px;">
         {{ getNiftyOptionsTotal() >= 0 ? '+' : '' }}₹{{ formatNumber(getNiftyOptionsTotal()) }}
       </span>
     </div>
     <div class="nifty-options-grid">
       <div>
         <h4 style="color: #4caf50; margin: 15px 0 10px 0;">Top 3 Profits</h4>
         <!-- List top 3 profits -->
       </div>
       <div>
         <h4 style="color: #f44336; margin: 15px 0 10px 0;">Top 3 Losses</h4>
         <!-- List top 3 losses -->
       </div>
     </div>
   </div>
   ```

4. **Add CSS styles for the new card:**
   ```css
   .nifty-options-card {
     grid-column: 1 / -1; /* Span full width */
   }

   .nifty-options-overall {
     padding: 15px;
     background: rgba(255, 193, 7, 0.1);
     border-radius: 10px;
     margin-bottom: 15px;
     text-align: center;
   }

   .nifty-options-grid {
     display: grid;
     grid-template-columns: 1fr 1fr;
     gap: 20px;
   }
   ```

5. **Update existing NIFTY Profit/Loss cards logic (IMPORTANT):**
   - Modify `getNiftyProfits()` and `getNiftyLosses()` to EXCLUDE NIFTY Options
   - This ensures no overlap between NIFTY Futures and NIFTY Options
   ```typescript
   getNiftyProfits(): Contract[] {
     return this.contracts
       .filter(c => c.type === 'nifty' && c.pnl > 0 && !this.isNiftyOption(c))
       .sort((a, b) => b.pnl - a.pnl)
       .slice(0, 12);
   }

   getNiftyLosses(): Contract[] {
     return this.contracts
       .filter(c => c.type === 'nifty' && c.pnl < 0 && !this.isNiftyOption(c))
       .sort((a, b) => a.pnl - b.pnl)
       .slice(0, 12);
   }
   ```

### Impact
- NIFTY Options will be tracked separately from NIFTY Futures
- Existing NIFTY Profit/Loss cards will show only NIFTY Futures (no CE/PE)
- New card provides focused view on options trading performance
- No impact on Regular contracts or other functionality
- Overall P&L calculations remain unchanged (includes all contracts)

### Testing Checklist

After implementation:
- [ ] NIFTY Options card appears after NIFTY Loss card
- [ ] Overall NIFTY Options P&L is calculated correctly
- [ ] Top 3 profits show correct contracts with CE/PE
- [ ] Top 3 losses show correct contracts with CE/PE
- [ ] NIFTY Profit/Loss cards no longer show options (CE/PE contracts)
- [ ] Contract type detection still works (NIFTY → nifty, others → regular)
- [ ] Empty state handling (no options, no profits, no losses)
- [ ] Color coding works (green for profit, red for loss)
- [ ] All existing functionality remains unchanged

### Example Contracts
- **NIFTY Options**: `NIFTY25N112450PE`, `NIFTY25JAN24500CE`
- **NIFTY Futures**: `NIFTY25DECFUT`, `NIFTYFEB25FUT`
- **Regular**: `WIPRO25DECFUT`, `TCS25JANFUT`

---

## Feature 5: Export Dashboard as Image

### Description
Add functionality to export the entire dashboard view as a PNG or JPG image. This allows users to save and share their trading performance dashboard as a screenshot.

### Library Required
- **html2canvas**: Converts HTML elements to canvas and exports as image
- Install: `npm install html2canvas`
- Import: `import html2canvas from 'html2canvas';`

### Changes Required

#### File: `package.json`
1. Add dependency:
   ```json
   "html2canvas": "^1.4.1"
   ```

#### File: `src/app/app.ts`

1. **Import html2canvas at the top:**
   ```typescript
   import html2canvas from 'html2canvas';
   ```

2. **Add export button in dashboard template:**
   - Position: Top-right corner of dashboard header, or below the month title
   - Button should only appear in Dashboard tab
   ```html
   <div class="dashboard-header">
     <h1>{{ getMonthName() }} TRADING PERFORMANCE DASHBOARD</h1>
     <button class="btn export-btn" (click)="exportDashboardAsImage()">
       📸 Export as Image
     </button>
   </div>
   ```

3. **Add wrapper div with ID for the dashboard content:**
   - Wrap the entire dashboard content in a div with id="dashboard-content"
   - This allows html2canvas to target the specific area
   ```html
   <div *ngIf="contracts.length > 0" class="dashboard" id="dashboard-content">
     <!-- All dashboard content -->
   </div>
   ```

4. **Implement exportDashboardAsImage method:**
   ```typescript
   async exportDashboardAsImage() {
     const dashboardElement = document.getElementById('dashboard-content');
     if (!dashboardElement) {
       alert('Dashboard not found');
       return;
     }

     try {
       // Show loading indicator (optional)
       const originalText = 'Generating image...';
       
       // Capture the dashboard as canvas
       const canvas = await html2canvas(dashboardElement, {
         backgroundColor: '#0f1419', // Match dashboard background
         scale: 2, // Higher quality (2x resolution)
         logging: false,
         useCORS: true
       });

       // Convert canvas to blob
       canvas.toBlob((blob) => {
         if (blob) {
           // Create download link
           const url = URL.createObjectURL(blob);
           const link = document.createElement('a');
           const fileName = `trading-dashboard-${this.getMonthName().replace(/\s/g, '-')}.png`;
           link.download = fileName;
           link.href = url;
           link.click();
           
           // Clean up
           URL.revokeObjectURL(url);
         }
       }, 'image/png');

     } catch (error) {
       console.error('Error exporting dashboard:', error);
       alert('Failed to export dashboard. Please try again.');
     }
   }
   ```

5. **Add CSS styles for export button:**
   ```css
   .dashboard-header {
     text-align: center;
     margin-bottom: 30px;
     position: relative;
   }

   .export-btn {
     position: absolute;
     top: 0;
     right: 0;
     padding: 10px 20px;
     background: #2196f3;
     color: #fff;
     font-size: 14px;
   }

   .export-btn:hover {
     background: #1976d2;
   }
   ```

### Alternative: Export as JPG
To export as JPG instead of PNG, change the blob type:
```typescript
canvas.toBlob((blob) => {
  // ... same code
  link.download = `trading-dashboard-${this.getMonthName().replace(/\s/g, '-')}.jpg`;
  // ... same code
}, 'image/jpeg', 0.95); // 0.95 = 95% quality
```

### Features of the Export
- **High Quality**: 2x scale for better resolution
- **Proper Background**: Matches dashboard dark theme
- **Auto Filename**: Includes month/year (e.g., "trading-dashboard-NOVEMBER-2025.png")
- **One-Click**: Simple button press downloads the image
- **No External API**: All processing done in browser

### Optional Enhancements

1. **Format Selector:**
   - Add dropdown to choose PNG or JPG
   - Different quality settings for JPG

2. **Loading Indicator:**
   - Show spinner/text while generating image
   - Can take 1-2 seconds for large dashboards

3. **Custom Settings:**
   - Allow user to choose scale (1x, 2x, 3x)
   - Include/exclude certain sections

4. **Copy to Clipboard:**
   - Alternative to download: copy image to clipboard
   - Use: `navigator.clipboard.write()`

### Testing Checklist

After implementation:
- [ ] Export button appears only in Dashboard tab
- [ ] Clicking button generates PNG file
- [ ] Image includes all dashboard elements (Overall P&L, cards, summary)
- [ ] Image background matches dashboard theme
- [ ] Image quality is good (text readable, colors correct)
- [ ] Filename includes month/year
- [ ] Large dashboards (many contracts) export successfully
- [ ] Export works on different screen sizes
- [ ] Error handling works if export fails
- [ ] Button doesn't interfere with existing layout

### Browser Compatibility
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: May have limitations on large images

### Impact
- No impact on existing functionality
- New dependency added (html2canvas ~500KB)
- Useful for sharing performance reports
- Works entirely client-side (no server needed)

---

## Notes

- All changes are in `src/app/app.ts` since it's a single-component application
- After implementation, update `README.md` to reflect new Excel format
- Update `.github/copilot-instructions.md` with new patterns
- Consider adding a card height limit with scrolling for 12-item lists
