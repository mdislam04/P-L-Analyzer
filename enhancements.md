# Enhancements

## NIFTY Futures Performance Card
- Merge existing NIFTY Profit and NIFTY Loss cards into a single card.
- Title: "NIFTY Futures Performance".
- Content:
  - Overall P&L: Sum of `pnl` for contracts where `type === 'nifty'` and NOT options (exclude symbols containing `CE`/`PE`).
  - Top 5 Profit Makers: Highest positive `pnl` items under NIFTY futures (exclude options).
  - Top 5 Lossers: Lowest negative `pnl` items under NIFTY futures (exclude options).
- Sorting: Descending for profits, ascending for losses.
- Formatting: Use `toLocaleString('en-IN')` for numbers.
- Style: Match compact dashboard card style; reuse NIFTY blue accent.

## Notes
- Keep existing NIFTY Options Performance card untouched.
- Excel import logic remains: auto-detect type by symbol name containing "NIFTY" (case-insensitive).
- Ensure change detection after imports still works (NgZone wrapper).
