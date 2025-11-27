# Trading Dashboard - GitHub Copilot Instructions

## Project Overview

This is an Angular 21 standalone component application for tracking and analyzing trading contract performance. The application uses a single-component architecture with inline templates and styles.

## Architecture Principles

### Component Structure
- **Standalone Components**: All components use Angular's standalone API
- **Inline Templates**: The main app component uses inline template strings for maintainability
- **Inline Styles**: Component styles are defined inline using template literals
- **No NgModules**: Project uses standalone components exclusively

### State Management
- **Local State**: All state managed through component properties (no external state management)
- **Signal-based**: Uses Angular signals for reactive state (`signal()`)
- **Two-way Binding**: Forms use `[(ngModel)]` for two-way data binding

## Key Features & Implementation

### Data Model
```typescript
interface Contract {
  monthYear: string;      // Format: "YYYY-MM"
  name: string;           // Contract name (e.g., "WIPRO25DECFUT")
  type: 'regular' | 'nifty';
  pnl: number;           // Profit/Loss amount
}
```

### Excel Integration
- Uses `xlsx` library for Excel import/export
- Import format: Column A (Symbol), Column B (Realized P&L)
- Contract type auto-detected: if symbol contains "NIFTY" (case-insensitive) → nifty type, otherwise → regular type
- Export generates 2-column template with sample data

### Styling Approach
- **Dark Theme**: Gradient background (#1a2332 to #0f1419)
- **Color Scheme**: 
  - Primary: #ffc107 (yellow/gold)
  - Profit: #4caf50 (green)
  - Loss: #f44336 (red)
  - NIFTY: #2196f3 (blue)
- **Animations**: Fade-in effects for dashboard
- **Responsive**: Grid-based layouts
- **Compact Design**: Reduced padding and font sizes for space efficiency

## Development Guidelines

### When Adding Features

1. **Forms & Inputs**
   - Always use `[(ngModel)]` for form bindings
   - Include proper validation before processing
   - Show user feedback via alerts or UI messages

2. **Calculations**
   - All P&L calculations should be centralized in component methods
   - Use `.reduce()` for aggregations
   - Format numbers using `toLocaleString('en-IN')` for Indian currency format

3. **Excel Operations**
   - Validate Excel data structure before processing (2 columns expected)
   - Auto-detect contract type from symbol name (case-insensitive NIFTY check)
   - Handle errors gracefully with try-catch
   - Provide clear feedback on import success/failure

4. **Dashboard Visualizations**
   - Sort data before display (e.g., profits descending, losses ascending)
   - Limit lists to top 12 items for readability
   - Use color coding consistently (green=profit, red=loss)
   - Keep font sizes compact to display more information

### Code Style

- **TypeScript**: Strict typing, use interfaces for data structures
- **Template Syntax**: Use Angular's modern template syntax
- **Formatting**: Follow Prettier configuration (100 char width, single quotes)
- **Comments**: Add comments for complex calculations or business logic

### Component Methods Pattern

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
```

## Testing Strategy

- **Test Runner**: Vitest
- **Test Files**: `*.spec.ts` files alongside components
- **Focus Areas**:
  - Calculation accuracy (P&L totals, profits, losses)
  - Excel import/export functionality
  - Form validation
  - Data filtering and sorting

## Common Tasks

### Adding New Dashboard Cards

1. Add new method to filter/calculate data
2. Update template with new card in grid
3. Maintain consistent styling with existing cards
4. Include empty state handling

### Modifying Excel Format

1. Update `onFileChange()` parsing logic (currently expects 2 columns)
2. Update `downloadTemplate()` structure
3. Update auto-detection logic if needed
4. Update documentation in upload section
5. Test with various Excel formats

### Adding New Contract Types

1. Update `Contract` interface type union
2. Add new color/badge styling
3. Update dashboard filters
4. Update form options

## Performance Considerations

- Use `*ngFor` with trackBy for large lists (if needed in future)
- Calculations are performed on-demand (no unnecessary recalculations)
- Excel operations use ArrayBuffer for efficiency

## Browser Compatibility

- Target: Modern browsers with ES6+ support
- Tested on: Chrome, Firefox, Safari, Edge
- No IE11 support required

## Dependencies

### Core Dependencies
- `@angular/*`: Angular framework packages (v21.0.0)
- `rxjs`: Reactive programming (v7.8.0)
- `xlsx`: Excel file processing (v0.18.5)

### Dev Dependencies
- `typescript`: v5.9.2
- `vitest`: v4.0.8
- `jsdom`: v27.1.0

## File Organization

```
src/app/
  ├── app.ts           # Main component (831 lines) - ALL UI & logic
  ├── app.config.ts    # App configuration & providers
  ├── app.routes.ts    # Route definitions (currently empty)
  └── app.spec.ts      # Unit tests
```

## Future Enhancement Areas

- Data persistence (localStorage/backend API)
- User authentication
- Multiple month/year views
- Chart visualizations (Chart.js/D3.js)
- Export dashboard as PDF
- Compare month-over-month performance
- Filter contracts by date range
- Search/filter functionality in contract lists

## Common Pitfalls to Avoid

1. **Don't** mutate arrays directly - use spread operator or array methods
2. **Don't** forget to validate Excel data before adding to contracts array
3. **Don't** hardcode colors - use CSS variables or consistent color constants
4. **Don't** skip user confirmations for destructive actions (Clear All)
5. **Don't** forget to reset form fields after successful addition

## Debugging Tips

- Check browser console for Excel parsing errors
- Verify date format in monthYear fields (must be "YYYY-MM")
- Ensure contract type is exactly "regular" or "nifty" (case-sensitive in logic)
- Test calculations with both positive and negative P&L values

## Angular-Specific Notes

- Uses Angular 21's latest features (standalone components, signals)
- No routing currently implemented (single view with tabs)
- FormsModule imported for template-driven forms
- CommonModule imported for *ngIf, *ngFor directives

## When Making Changes

1. **Test locally** with `ng serve`
2. **Verify calculations** with sample data
3. **Check responsive layout** at different screen sizes
4. **Validate Excel import/export** with actual Excel files
5. **Run tests** with `ng test`
6. **Build for production** with `ng build` to catch any build errors

## Contact & Support

For questions about architecture decisions or implementation details, refer to this document first. When in doubt, maintain consistency with existing patterns in the codebase.