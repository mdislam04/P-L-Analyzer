# Trading Dashboard V2 Specification

## 1. Vision
Elevate the trading dashboard from a static P&L ledger into an insight engine: compact, analytical, and immediately actionable. V2 introduces advanced metrics, visual micro-patterns, and alerting while preserving the simplicity of the existing single-component architecture. All additions are non-invasive and run side-by-side with the current implementation.

## 2. Guiding Principles
- **Non-Disruptive**: V1 remains untouched; V2 is isolated in its own component.
- **Compact Density**: High information per pixel without clutter.
- **Progressive Enhancement**: Start with core metrics; layer advanced analytics.
- **Pure Calculations**: Metrics implemented as pure functions for testability.
- **Performance Conscious**: Derivations computed on-demand; future memoization.
- **Export Ready**: Reuse existing image export concept later for V2 snapshots.

## 3. Initial Scope (Phase 1)
Focus only on foundational performance metrics derived from existing `Contract` data:
- Net P&L
- Total trades
- Winning trades count
- Losing trades count
- Win rate (%)
- Average winning trade
- Average losing trade
- Profit factor (gross wins / gross losses)

These provide a baseline to validate structure before layering complexity.

## 4. Future Metrics (Deferred)
To be introduced in later phases:
- Max drawdown & recovery factor
- Consecutive win/loss streaks
- Average risk:reward ratio
- Equity curve (intra-period progression)
- Category exposure ratios (Regular vs NIFTY Futures vs NIFTY Options)
- Volatility-adjusted performance (e.g., Sharpe-lite using std dev of returns)
- Pattern-based alerts (e.g., 3+ losses > threshold)

## 5. Component Layout (Phase 1)
Standalone component `DashboardV2Component` with a compact grid:
- **Header Bar**: Period label (latest month), net P&L highlight, win rate badge.
- **Metrics Grid**: Cards for each metric (uniform styling, minimal chrome).
- **Info Footer**: Notes about experimental status & link to spec.

Responsive strategy: 2 columns on narrow (< 900px), 3 columns on wide screens.

## 6. Data Model (Current vs Extended)
Current `Contract` interface suffices for Phase 1.
Future extension (Phase 2+):
```ts
interface ExtendedContract extends Contract {
  entryDate?: string;      // ISO timestamp
  exitDate?: string;       // ISO timestamp
  strategyTag?: string;    // Optional classification
  riskAmount?: number;     // Initial risk capital per trade
  grossPnL?: number;       // Before fees
  fees?: number;           // Brokerage/transaction costs
}
```

## 7. Separation Strategy
- V2 resides in `src/app/dashboard-v2.component.ts`.
- Added as a new tab inside existing `App` component (no routing disruption).
- Receives `contracts` via `@Input()` for one-way, read-only consumption.
- No mutation or side effects on parent state.

## 8. Metrics Definitions
- **Net P&L**: `Σ pnl`
- **Total Trades**: `count(contracts)`
- **Winning Trades**: `count(pnl > 0)`
- **Losing Trades**: `count(pnl < 0)`
- **Win Rate**: `(winning / total) * 100`
- **Average Win**: `Σ (pnl > 0) / winningCount` (0 if none)
- **Average Loss**: `Σ |pnl < 0| / losingCount` (0 if none)
- **Profit Factor**: `Σ (pnl > 0) / Σ |pnl < 0|` ("—" if losses = 0)

## 9. Phased Roadmap
| Phase | Focus | Output |
|-------|-------|--------|
| 1 | Core metrics + layout | Component + basic cards |
| 2 | Advanced analytics foundation | Drawdown, streak logic, equity curve placeholder |
| 3 | Visual enhancements | Sparklines, category mini-cards, trend badges |
| 4 | Alerts & thresholds | Configurable risk/event triggers |
| 5 | Export + persistence | Image/PDF export, optional localStorage or API hook |

## 10. Dependencies
Phase 1: No new external dependencies.
Phase 2+: Potential additions:
- **Charting**: `chart.js` (simple integration) or `uplot` (lightweight performance)
- **Sparklines**: Custom inline SVG (preferred for footprint)

## 11. Performance Notes
- Small datasets: Direct calculation acceptable.
- Larger (5k+) records (future): Introduce memoization keyed by data hash.
- Avoid repeated map/reduce passes—combine scans for advanced metrics later.

## 12. Testing Strategy
Vitest unit tests (later) for metric edge cases:
- Zero trades
- All wins / all losses
- Mixed distribution
- Large numeric ranges (formatting stability)

## 13. Success Criteria (Phase 1)
- Component renders without affecting existing dashboard.
- All metrics correct for sample contract sets.
- No runtime errors when `contracts` is empty.
- Layout remains responsive and readable.

## 14. Extensibility Hooks
- Placeholder region for future equity curve container.
- Config object for alert thresholds (to be added Phase 4).
- Strategy tags enable grouping metrics later without refactor.

## 15. Styling Guidelines
- Reuse dark theme + accent colors (#ffc107, #4caf50, #f44336, #2196f3).
- Compact card paddings (12–16px).
- Typography scale: 0.75em labels, 1.2em values.
- High contrast numeric badges for key metrics.

## 16. Access & Navigation
- Available via new tab "V2 Dashboard" in `App`.
- Does not require route change (can add `/v2` route later if needed).

## 17. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Metric miscalculation | Pure functions + unit tests |
| UI redundancy | Minimal, metric-focused layout |
| Scope creep | Phased roadmap enforcement |
| Performance degradation (later) | Introduce memoization only when required |

## 18. Next Step
Implement `dashboard-v2.component.ts` with initial metrics & embed tab.

---
_This specification is versioned separately from V1 to enable iterative enhancement without destabilizing the existing dashboard._
