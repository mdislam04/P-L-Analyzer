# Change Track Feature Requirements

## Overview
A new "Change Track" tab enables manual tracking of day-to-day price change values (or custom deltas) per unique contract name. Users can create multiple contract cards, each holding dated change entries. Data persists locally (localStorage) and is prepared for future migration to a free backend API.

## Goals
- Rapid manual entry of daily change values per contract.
- Visual separation: one card per unique contract name.
- Persistent storage across sessions (localStorage key: `changeTrackData`).
- Scalable design for future API sync.

## Data Model
```
interface ChangeEntry { date: string; value: number; }
interface ChangeCard { name: string; entries: ChangeEntry[]; }
LocalStorage Shape: { [contractName: string]: ChangeEntry[] }
```

## UI Elements
1. Top Input Bar:
   - Textbox: contract name input (`newContractName`)
   - Button: ADD → creates card if not existing (case-insensitive uniqueness recommended)
   - Feedback: small inline message if duplicate
2. Card Layout (one per contract):
   - Header: Contract name
   - Entry Row Inputs:
     - Date picker (`type=date`) default: today (YYYY-MM-DD)
     - Number input for change value (supports negatives)
     - Add (+) icon button to append entry
   - Entries List:
     - Chronological (newest first) or date ascending toggle (initial: newest first)
     - Each entry: date (formatted) + value with sign
     - Delete (−) icon removes entry
3. Optional Future Controls (not implemented now):
   - Export card to CSV
   - Filter by date range
   - Aggregate metrics (sum, avg, volatility)

## Behaviors
- Adding a Contract:
  - Trim whitespace; empty → ignored
  - Normalize name for uniqueness (store original casing for display)
  - If exists → show duplicate message
- Adding an Entry:
  - Validate number field (non-null)
  - Validate date (default provided)
  - Push `{ date, value }` to card entries
  - Immediately persist to localStorage
- Deleting an Entry:
  - Remove by index; persist
- Deleting a Card (Phase 2 idea): not implemented now
- Persistence:
  - Load on component init
  - Save after every mutation

## LocalStorage
- Key: `changeTrackData`
- Read: `JSON.parse(localStorage.getItem(key) || '{}')`
- Write: `localStorage.setItem(key, JSON.stringify(object))`
- Resilience: try/catch around JSON parse/stringify

## Edge Cases
- Large number of cards: add scroll container
- Same contract name with different casing: treat case-insensitive as duplicate
- Invalid numeric input: ignore and show subtle validation state
- Date missing: auto-inject today

## Styling Guidelines
- Match dark theme (use existing palette)
- Card: subtle border + header accent (#ffc107 or contract-specific accent)
- Icons: minimalist (Unicode + / −)
- Compact spacing to fit many cards

## Future Enhancements (Documented for roadmap)
- Remote sync (find free API or serverless endpoint)
- Aggregated daily diff dashboard
- CSV export per card and bulk export
- Search/filter contracts
- Tags or categories per contract

## Tasks Breakdown
1. Requirements doc (this file)
2. Create standalone `ChangeTrackComponent` with inline template/styles
3. Implement state model & localStorage load/save helpers
4. Implement add contract flow with duplicate guard
5. Implement add entry & delete entry functions
6. Render cards with entry list
7. Add new tab before Help in `app.ts` and wire component
8. Basic styles + responsive scroll area
9. Add minimal validation & feedback messages
10. Smoke test & refine minor UX details

## Acceptance Criteria
- User can add a contract and see a new empty card.
- User can add dated change entries; entries display immediately.
- Data persists after reload (manual test).
- No duplicate cards for same (case-insensitive) name.
- Delete button removes entry and persists.
- Feature isolated to its own tab; other tabs unaffected.

## Out of Scope (Current Iteration)
- Bulk delete cards
- Data aggregation metrics
- API integration
- CSV export

## Notes
Keep implementation minimal, clear, and consistent with existing inline component pattern. Avoid premature optimization.
