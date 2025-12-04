# Google Drive Setup Guide

## ✅ What's Been Implemented

Your Stock Radar now has **complete Google Drive integration** with secure OAuth 2.0 (PKCE flow).

## 🔐 Security Features

- **PKCE Flow**: No client secret in frontend code
- **Automatic Token Refresh**: Tokens refresh automatically before expiration
- **Secure Storage**: OAuth config stored in localStorage (can be enhanced for production)
- **Environment Variables**: Credentials in git-ignored files

## 📋 Google Cloud Console Setup Required

### 1. Add Redirect URIs

Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Your OAuth 2.0 Client → Edit

Add these **Authorized redirect URIs**:
```
http://localhost:4200
https://pnl-islam.netlify.app
```

### 2. Verify OAuth Consent Screen

Ensure your OAuth consent screen is configured:
- App name: Trading Dashboard (or your choice)
- User support email: Your email
- Scopes: Google Drive API (file scope)
- Test users: Add your email if app is in testing mode

## 🎯 How to Use

### First Time Setup

1. **Start the app** locally or on Netlify
2. Navigate to **📈 Stock Radar** tab
3. Click **🔗 Connect Google Drive** button
4. Sign in with your Google account
5. Grant permission to access Google Drive
6. You'll be redirected back automatically

### Daily Usage

Once connected, you'll see:
- **📤 Submit to Drive** button (blue) - Save your stock radar data to cloud
- **📥 Load** button - Load data from cloud
- **🔌** button - Disconnect Google Drive

### Syncing Data

**To Save:**
1. Add your stock cards, support/resistance levels, and notes
2. Click **📤 Submit to Drive**
3. Wait for "✅ Data synced to Google Drive!" message
4. Your data is now safely backed up

**To Load:**
1. Click **📥 Load** button
2. If local data exists, you'll be asked to confirm replacement
3. Cloud data will replace local data (with confirmation)

## 🗂️ Data Storage

- **Filename**: `stockradar.json` in your Google Drive root
- **Format**: JSON with version, timestamp, and all stock cards
- **Visibility**: Only you can see this file (private to your Google account)
- **Size**: Very small (few KB for dozens of stocks)

## 🔄 Token Management

- **Access Token**: Valid for 1 hour
- **Auto-Refresh**: Happens automatically when needed
- **Refresh Token**: Stored locally, used to get new access tokens
- **Session Expiry**: If refresh fails, you'll need to reconnect

## 🚨 Troubleshooting

### "Failed to complete Google Drive connection"
- Ensure redirect URIs are exactly correct in Google Console
- Check browser console for detailed error messages
- Verify OAuth consent screen is configured

### "Session expired. Please reconnect Google Drive"
- Click 🔌 to disconnect
- Click **🔗 Connect Google Drive** again
- Re-authorize the app

### "No data found on Google Drive"
- You haven't saved any data yet
- Use **📤 Submit to Drive** first

### "File not found on Google Drive"
- The file may have been deleted manually
- Save again with **📤 Submit to Drive** to recreate it

### OAuth Error: redirect_uri_mismatch
- **Cause**: Redirect URI in code doesn't match Google Console
- **Fix**: 
  - For local: Ensure `http://localhost:4200` is added (no trailing slash)
  - For Netlify: Ensure `https://pnl-islam.netlify.app` is added exactly
  - Wait 5 minutes after adding URIs for changes to propagate

## 🔒 Privacy & Security

✅ **What's Safe:**
- Client ID is public (can be in code)
- PKCE flow doesn't expose secrets
- Data only accessible by your Google account
- Tokens expire and auto-refresh

⚠️ **Important Notes:**
- Never commit `environment.ts` or `environment.prod.ts` to public repos (already git-ignored)
- Tokens are in localStorage - clear browser data to remove them
- Disconnect if using shared/public computer

## 📊 What Gets Synced

Everything in Stock Radar:
- All stock cards (WIPRO, etc.)
- All support levels with labels
- All resistance levels with labels
- All development notes
- Date context for each stock
- Last modified timestamp

**Not synced:**
- Card expand/collapse state (resets to first card expanded)
- UI preferences
- Other tabs' data (contracts, change track)

## 🚀 Production Deployment (Netlify)

Your setup is ready! When deploying to Netlify:

1. **Build locally** to test:
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**:
   - Netlify will automatically use `environment.prod.ts` for production builds
   - No environment variables needed in Netlify dashboard (credentials in code are safe for PKCE)

3. **Test on Netlify**:
   - Visit https://pnl-islam.netlify.app
   - Click Connect Google Drive
   - Should redirect to Google OAuth
   - Should redirect back to your Netlify URL

## 🔧 Technical Details

### Files Created/Modified

**New Files:**
- `src/environments/environment.ts` (git-ignored, local config)
- `src/environments/environment.prod.ts` (git-ignored, prod config)
- `src/environments/environment.example.ts` (template, committed)

**Modified Files:**
- `src/app/stock-radar.component.ts` (added Google Drive integration)
- `angular.json` (added fileReplacements for production)
- `.gitignore` (ignore environment files)

### Authentication Flow

1. **User clicks Connect**: Generate PKCE code verifier & challenge
2. **Redirect to Google**: OAuth consent screen
3. **User approves**: Google redirects back with authorization code
4. **Exchange code**: Get access token & refresh token
5. **Store tokens**: Save to localStorage
6. **Auto-refresh**: Before expiration, refresh access token

### API Operations

**Save to Drive:**
- First save: Creates `stockradar.json`
- Subsequent saves: Updates existing file
- Uses multipart upload for metadata + content

**Load from Drive:**
- Search for `stockradar.json` by name
- Download file content
- Parse JSON and merge with local data (with confirmation)

## 📝 API Endpoints Used

- `https://accounts.google.com/o/oauth2/v2/auth` - Authorization
- `https://oauth2.googleapis.com/token` - Token exchange/refresh
- `https://www.googleapis.com/drive/v3/files` - File operations
- `https://www.googleapis.com/upload/drive/v3/files` - Upload operations

## 🎓 Next Steps

1. ✅ Test locally with `ng serve`
2. ✅ Connect Google Drive
3. ✅ Add some stock data
4. ✅ Submit to Drive
5. ✅ Load from Drive to verify
6. ✅ Deploy to Netlify
7. ✅ Test on production URL

## 💡 Tips

- **Backup Strategy**: Use **Submit to Drive** regularly (daily or after major changes)
- **Multiple Devices**: Load from Drive on new device to sync data
- **Data Migration**: If you reset browser, just reconnect and Load from Drive
- **Version Control**: Google Drive keeps revision history (can restore old versions via Drive web interface)

## ❓ Need Help?

If you encounter issues:
1. Check browser console for error details
2. Verify redirect URIs in Google Console
3. Try disconnecting and reconnecting
4. Clear browser cache and try again
5. Check this guide's troubleshooting section

## 🎉 You're All Set!

Your Stock Radar now has enterprise-grade cloud sync with Google Drive. Your trading analysis data is safe, backed up, and accessible from anywhere!
