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

---

## Google Drive Integration - Implementation Plan

### Overview
Sync Stock Radar data to Google Drive for cloud backup, cross-device access, and data portability. Uses OAuth 2.0 for secure authentication and Google Drive API v3 for file operations.

### Goals
- **Secure Authentication**: OAuth 2.0 flow with user consent
- **Automatic Sync**: Save to Google Drive on demand (Submit button)
- **Conflict Resolution**: Handle concurrent edits gracefully
- **Offline Support**: Work offline, sync when online
- **Privacy**: Data stored in user's personal Google Drive
- **Minimal Dependencies**: Use native Fetch API, no heavy SDKs

### Architecture

#### 1. Google Cloud Setup (Prerequisites)
```
Project: Trading Dashboard
OAuth 2.0 Client ID: [ALREADY OBTAINED]
Client Secret: [ALREADY OBTAINED]
Authorized Redirect URIs: 
  - http://localhost:4200/auth/callback (dev)
  - https://yourdomain.com/auth/callback (prod)
Scopes Required:
  - https://www.googleapis.com/auth/drive.file (Create/modify app-owned files only)
```

#### 2. Security Best Practices

**Environment Variables** (DO NOT commit to repo):
```typescript
// src/environments/environment.ts (git-ignored)
export const environment = {
  production: false,
  googleDrive: {
    clientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
    clientSecret: 'YOUR_CLIENT_SECRET', // Backend only, never expose in frontend
    redirectUri: 'http://localhost:4200/auth/callback',
    scope: 'https://www.googleapis.com/auth/drive.file'
  }
};
```

**IMPORTANT Security Notes**:
- ⚠️ **Client Secret** should NEVER be in frontend code
- Use PKCE (Proof Key for Code Exchange) for public clients (SPAs)
- Store tokens in memory only (not localStorage for production)
- Implement token refresh logic before expiration
- Use HTTPS in production
- Validate redirect URIs strictly

#### 3. Data Model Enhancement

```typescript
interface GoogleDriveConfig {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null; // Unix timestamp
  fileId: string | null; // Drive file ID for stockradar.json
}

interface StockRadarData {
  version: string; // e.g., "1.0"
  lastModified: string; // ISO timestamp
  cards: StockCard[];
}

// Add to component
googleDrive: GoogleDriveConfig = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  fileId: null
};
```

#### 4. OAuth 2.0 Flow (PKCE for SPA)

**Step 1: Generate Code Verifier & Challenge**
```typescript
// Crypto-secure random string
generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

// SHA256 hash of verifier
async generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}
```

**Step 2: Initiate Authorization**
```typescript
async initiateGoogleAuth(): Promise<void> {
  const verifier = this.generateCodeVerifier();
  sessionStorage.setItem('code_verifier', verifier);
  
  const challenge = await this.generateCodeChallenge(verifier);
  
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', environment.googleDrive.clientId);
  authUrl.searchParams.set('redirect_uri', environment.googleDrive.redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', environment.googleDrive.scope);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('access_type', 'offline'); // Get refresh token
  authUrl.searchParams.set('prompt', 'consent'); // Force consent to get refresh token
  
  // Open auth popup or redirect
  window.location.href = authUrl.toString();
}
```

**Step 3: Handle Callback & Exchange Code**
```typescript
async handleAuthCallback(code: string): Promise<void> {
  const verifier = sessionStorage.getItem('code_verifier');
  if (!verifier) throw new Error('No code verifier found');
  
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const body = new URLSearchParams({
    code: code,
    client_id: environment.googleDrive.clientId,
    redirect_uri: environment.googleDrive.redirectUri,
    grant_type: 'authorization_code',
    code_verifier: verifier
  });
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  
  const data = await response.json();
  
  this.googleDrive.accessToken = data.access_token;
  this.googleDrive.refreshToken = data.refresh_token;
  this.googleDrive.expiresAt = Date.now() + (data.expires_in * 1000);
  
  sessionStorage.removeItem('code_verifier');
  this.saveGoogleDriveConfig();
}
```

**Step 4: Refresh Token**
```typescript
async refreshAccessToken(): Promise<void> {
  if (!this.googleDrive.refreshToken) {
    throw new Error('No refresh token available');
  }
  
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const body = new URLSearchParams({
    client_id: environment.googleDrive.clientId,
    refresh_token: this.googleDrive.refreshToken,
    grant_type: 'refresh_token'
  });
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  
  const data = await response.json();
  
  this.googleDrive.accessToken = data.access_token;
  this.googleDrive.expiresAt = Date.now() + (data.expires_in * 1000);
  
  this.saveGoogleDriveConfig();
}

async ensureValidToken(): Promise<void> {
  if (!this.googleDrive.accessToken) {
    throw new Error('Not authenticated');
  }
  
  // Refresh if expires in less than 5 minutes
  if (this.googleDrive.expiresAt && this.googleDrive.expiresAt - Date.now() < 300000) {
    await this.refreshAccessToken();
  }
}
```

#### 5. Google Drive API Operations

**Create/Update File**
```typescript
async saveToGoogleDrive(): Promise<void> {
  try {
    await this.ensureValidToken();
    
    const data: StockRadarData = {
      version: '1.0',
      lastModified: new Date().toISOString(),
      cards: this.stockCards
    };
    
    const metadata = {
      name: 'stockradar.json',
      mimeType: 'application/json'
    };
    
    let fileId = this.googleDrive.fileId;
    let url: string;
    let method: string;
    
    if (fileId) {
      // Update existing file
      url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
      method = 'PATCH';
    } else {
      // Create new file
      url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      method = 'POST';
    }
    
    // Multipart upload (metadata + content)
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;
    
    const multipartBody = 
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(data) +
      closeDelim;
    
    const response = await fetch(url, {
      method: method,
      headers: {
        'Authorization': `Bearer ${this.googleDrive.accessToken}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`
      },
      body: multipartBody
    });
    
    if (!response.ok) {
      throw new Error(`Google Drive API error: ${response.status}`);
    }
    
    const result = await response.json();
    if (!fileId) {
      this.googleDrive.fileId = result.id;
      this.saveGoogleDriveConfig();
    }
    
    console.log('✅ Saved to Google Drive successfully');
    this.showSuccessMessage('Data synced to Google Drive!');
    
  } catch (error) {
    console.error('❌ Google Drive save error:', error);
    this.showErrorMessage('Failed to sync to Google Drive. Please try again.');
  }
}
```

**Load from Drive**
```typescript
async loadFromGoogleDrive(): Promise<void> {
  try {
    await this.ensureValidToken();
    
    if (!this.googleDrive.fileId) {
      // Search for existing file
      const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='stockradar.json' and trashed=false`;
      const searchResponse = await fetch(searchUrl, {
        headers: { 'Authorization': `Bearer ${this.googleDrive.accessToken}` }
      });
      
      const searchData = await searchResponse.json();
      if (searchData.files && searchData.files.length > 0) {
        this.googleDrive.fileId = searchData.files[0].id;
        this.saveGoogleDriveConfig();
      } else {
        console.log('No existing file found on Google Drive');
        return;
      }
    }
    
    // Download file content
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${this.googleDrive.fileId}?alt=media`;
    const response = await fetch(downloadUrl, {
      headers: { 'Authorization': `Bearer ${this.googleDrive.accessToken}` }
    });
    
    if (!response.ok) {
      throw new Error(`Google Drive API error: ${response.status}`);
    }
    
    const data: StockRadarData = await response.json();
    
    // Merge with local data (conflict resolution)
    await this.mergeWithLocalData(data);
    
    console.log('✅ Loaded from Google Drive successfully');
    this.showSuccessMessage('Data loaded from Google Drive!');
    
  } catch (error) {
    console.error('❌ Google Drive load error:', error);
    this.showErrorMessage('Failed to load from Google Drive.');
  }
}

async mergeWithLocalData(cloudData: StockRadarData): Promise<void> {
  // Strategy: Cloud data wins (user explicitly loaded)
  // Future: Implement smart merge based on timestamps
  
  if (this.stockCards.length > 0) {
    const proceed = confirm(
      'Local data exists. Replace with Google Drive data?\n' +
      `Cloud: ${cloudData.cards.length} cards, last modified ${new Date(cloudData.lastModified).toLocaleString()}\n` +
      `Local: ${this.stockCards.length} cards`
    );
    
    if (!proceed) return;
  }
  
  this.stockCards = cloudData.cards;
  this.saveToLocalStorage(); // Update local backup
}
```

#### 6. UI Components

**Top Bar Updates**
```html
<!-- Add after "Add Stock Card" button -->
<div class="google-drive-section">
  <button 
    *ngIf="!isGoogleDriveConnected()" 
    (click)="initiateGoogleAuth()" 
    class="btn-connect-drive">
    🔗 Connect Google Drive
  </button>
  
  <div *ngIf="isGoogleDriveConnected()" class="drive-controls">
    <button 
      (click)="saveToGoogleDrive()" 
      class="btn-submit-drive"
      [disabled]="isSyncing">
      {{ isSyncing ? '⏳ Syncing...' : '📤 Submit to Drive' }}
    </button>
    
    <button 
      (click)="loadFromGoogleDrive()" 
      class="btn-load-drive"
      [disabled]="isSyncing">
      📥 Load from Drive
    </button>
    
    <button 
      (click)="disconnectGoogleDrive()" 
      class="btn-disconnect-drive"
      title="Disconnect Google Drive">
      🔌
    </button>
  </div>
</div>
```

**Styles**
```css
.google-drive-section {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-left: auto;
}

.btn-connect-drive {
  padding: 10px 20px;
  background: linear-gradient(135deg, #4285f4 0%, #3367d6 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(66, 133, 244, 0.3);
}

.btn-connect-drive:hover {
  background: linear-gradient(135deg, #3367d6 0%, #2851b8 100%);
  box-shadow: 0 4px 8px rgba(66, 133, 244, 0.4);
  transform: translateY(-1px);
}

.drive-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.btn-submit-drive {
  padding: 10px 20px;
  background: #2196f3; /* Blue */
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: background 0.2s;
}

.btn-submit-drive:hover:not(:disabled) {
  background: #1976d2;
}

.btn-submit-drive:disabled {
  background: #90caf9;
  cursor: not-allowed;
}

.btn-load-drive {
  padding: 10px 18px;
  background: rgba(33, 150, 243, 0.15);
  color: #2196f3;
  border: 1px solid #2196f3;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-load-drive:hover:not(:disabled) {
  background: rgba(33, 150, 243, 0.25);
}

.btn-disconnect-drive {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.btn-disconnect-drive:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}
```

#### 7. Error Handling & User Feedback

```typescript
// Status messages
showSuccessMessage(message: string): void {
  this.statusMessage = message;
  this.statusType = 'success';
  setTimeout(() => this.statusMessage = '', 3000);
}

showErrorMessage(message: string): void {
  this.statusMessage = message;
  this.statusType = 'error';
  setTimeout(() => this.statusMessage = '', 5000);
}

// Error types to handle
handleGoogleDriveError(error: any): void {
  if (error.status === 401) {
    // Token expired
    this.showErrorMessage('Session expired. Please reconnect Google Drive.');
    this.disconnectGoogleDrive();
  } else if (error.status === 403) {
    this.showErrorMessage('Permission denied. Please grant access to Google Drive.');
  } else if (error.status === 404) {
    this.showErrorMessage('File not found. Creating new file...');
    this.googleDrive.fileId = null;
  } else if (!navigator.onLine) {
    this.showErrorMessage('No internet connection. Please try again when online.');
  } else {
    this.showErrorMessage('An error occurred. Please try again.');
  }
}
```

#### 8. Implementation Checklist

**Phase 1: Setup** ✅
- [x] Obtain Google OAuth credentials
- [x] Plan architecture and security approach
- [ ] Create environment files (git-ignored)
- [ ] Add PKCE helper functions
- [ ] Set up OAuth callback route

**Phase 2: Authentication**
- [ ] Implement `initiateGoogleAuth()`
- [ ] Implement `handleAuthCallback()`
- [ ] Implement token refresh logic
- [ ] Add auth state management
- [ ] Test auth flow in dev environment

**Phase 3: API Integration**
- [ ] Implement `saveToGoogleDrive()`
- [ ] Implement `loadFromGoogleDrive()`
- [ ] Add file search functionality
- [ ] Implement conflict resolution
- [ ] Test API calls with mock data

**Phase 4: UI Integration**
- [ ] Add Connect/Disconnect buttons
- [ ] Add Submit to Drive button (blue)
- [ ] Add Load from Drive button
- [ ] Show sync status indicators
- [ ] Add success/error notifications

**Phase 5: Testing & Polish**
- [ ] Test full auth flow
- [ ] Test save/load operations
- [ ] Test token refresh
- [ ] Test offline behavior
- [ ] Test error scenarios
- [ ] Security audit (no secrets in frontend)
- [ ] Add loading states
- [ ] Polish UI transitions

**Phase 6: Production Readiness**
- [ ] Update redirect URIs for production domain
- [ ] Implement proper token storage (consider secure methods)
- [ ] Add analytics/logging
- [ ] Document setup instructions for users
- [ ] Create troubleshooting guide

#### 9. File Structure Updates

```
src/
  ├── app/
  │   ├── stock-radar.component.ts (update)
  │   ├── services/
  │   │   └── google-drive.service.ts (new, optional for separation)
  │   └── auth/
  │       └── callback.component.ts (new, handle OAuth callback)
  ├── environments/
  │   ├── environment.ts (new, git-ignored)
  │   ├── environment.prod.ts (new, git-ignored)
  │   └── environment.example.ts (new, committed as template)
.gitignore (update to ignore environment files)
docs/
  └── GOOGLE_DRIVE_SETUP.md (new, user guide)
```

#### 10. Security Considerations

**Critical Rules**:
1. ✅ **NEVER** commit `clientSecret` to repository
2. ✅ Use PKCE flow for public clients (no client secret in frontend)
3. ✅ Store tokens securely (consider memory-only for production)
4. ✅ Implement token refresh before expiration
5. ✅ Use HTTPS in production
6. ✅ Validate all API responses
7. ✅ Limit OAuth scope to minimum required (`drive.file` only)
8. ✅ Implement logout/revoke functionality
9. ✅ Add CSRF protection if using backend
10. ✅ Regular security audits

**Token Storage Options**:
- **Development**: sessionStorage (cleared on tab close)
- **Production**: 
  - Memory only (re-auth on reload) - Most secure for SPA
  - HttpOnly cookies (requires backend) - Recommended
  - Encrypted localStorage (less secure) - Avoid if possible

#### 11. Alternative: Backend Proxy (Recommended for Production)

For enhanced security, consider a lightweight backend proxy:

```
Frontend (Angular) → Backend API (Node.js/Express) → Google Drive API
                     ↑
                     Handles client secret
                     Manages token refresh
                     Validates requests
```

Benefits:
- Client secret never exposed
- Centralized token management
- Better error handling
- Can add rate limiting
- Easier to audit

**Simple Express Proxy Example**:
```javascript
// backend/server.js
const express = require('express');
const { google } = require('googleapis');
const app = express();

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

app.post('/api/drive/save', async (req, res) => {
  // Validate token, refresh if needed
  // Call Google Drive API
  // Return result
});
```

#### 12. User Documentation

**Setup Instructions** (for users):
1. Visit [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Google Drive API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs
6. Copy Client ID
7. For backend setup, copy Client Secret
8. Configure environment variables
9. Restart application
10. Click "Connect Google Drive" in Stock Radar

**Privacy Notice**:
> Stock Radar uses Google Drive to sync your trading data. Your data is stored in YOUR personal Google Drive and is never shared with third parties. You can disconnect at any time.

#### 13. Estimated Effort

- **Setup & Config**: 30 min
- **Auth Flow**: 1 hour
- **API Integration**: 1.5 hours
- **UI Components**: 45 min
- **Testing**: 1 hour
- **Documentation**: 30 min
- **Security Audit**: 30 min

**Total: ~5.5 hours**

#### 14. Future Enhancements

- Auto-sync on changes (debounced)
- Sync status indicator (last synced timestamp)
- Version history (use Drive's revision API)
- Share cards with other users
- Multi-file support (one file per stock)
- Backup to multiple cloud providers
- Export to Google Sheets
- Real-time collaboration (Drive Realtime API)

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
