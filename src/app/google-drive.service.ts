import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

// Google Identity Services type declaration
declare const google: any;

export interface GoogleDriveConfig {
  accessToken: string | null;
  expiresAt: number | null;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class GoogleDriveService {
  private readonly STORAGE_KEY = 'googleDriveConfig';
  private readonly FOLDER_NAME = 'trading-tracker';
  private folderIdCache: string | null = null;
  private config: GoogleDriveConfig = {
    accessToken: null,
    expiresAt: null
  };

  constructor() {
    this.loadConfig();
  }

  /**
   * Check if Google Drive is connected
   */
  isConnected(): boolean {
    return this.config.accessToken !== null && this.config.expiresAt !== null && Date.now() < this.config.expiresAt;
  }

  /**
   * Get current access token (if valid)
   */
  getAccessToken(): string | null {
    if (this.isConnected()) {
      return this.config.accessToken;
    }
    return null;
  }

  /**
   * Initiate Google OAuth authentication using Google Identity Services
   */
  initiateAuth(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google === 'undefined') {
        reject(new Error('Google Identity Services library not loaded'));
        return;
      }

      const client = google.accounts.oauth2.initTokenClient({
        client_id: environment.googleClientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
            return;
          }

          // Store access token and expiration
          const expiresAt = Date.now() + (response.expires_in * 1000);
          this.config.accessToken = response.access_token;
          this.config.expiresAt = expiresAt;
          this.saveConfig();
          resolve();
        },
      });

      client.requestAccessToken();
    });
  }

  /**
   * Disconnect Google Drive
   */
  disconnect(): void {
    this.config = {
      accessToken: null,
      expiresAt: null
    };
    this.folderIdCache = null; // Clear folder cache on disconnect
    this.saveConfig();
  }

  /**
   * Ensure valid token (prompt re-auth if expired)
   */
  async ensureValidToken(): Promise<boolean> {
    const bufferTime = 5 * 60 * 1000; // 5 minutes
    if (this.config.accessToken && this.config.expiresAt && Date.now() < (this.config.expiresAt - bufferTime)) {
      return true;
    }

    // Token expired or about to expire
    try {
      await this.initiateAuth();
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Get or create the trading-tracker folder
   */
  private async ensureFolder(): Promise<string> {
    // Return cached folder ID if available
    if (this.folderIdCache) {
      return this.folderIdCache;
    }

    const token = this.config.accessToken;
    if (!token) {
      throw new Error('Not authenticated with Google Drive');
    }

    // Search for existing folder
    const query = encodeURIComponent(`name='${this.FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;

    const searchResponse = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!searchResponse.ok) {
      throw new Error(`Failed to search for folder: ${searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();
    
    // Folder exists, cache and return its ID
    if (searchData.files && searchData.files.length > 0) {
      const folderId = searchData.files[0].id;
      this.folderIdCache = folderId;
      return folderId;
    }

    // Create new folder
    const metadata = {
      name: this.FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder'
    };

    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create folder: ${createResponse.statusText}`);
    }

    const folderData = await createResponse.json();
    const folderId = folderData.id;
    this.folderIdCache = folderId;
    return folderId;
  }

  /**
   * Search for a file by name in Google Drive
   */
  async searchFile(fileName: string): Promise<GoogleDriveFile | null> {
    const token = await this.ensureValidToken() ? this.config.accessToken : null;
    if (!token) {
      throw new Error('Not authenticated with Google Drive');
    }

    // Ensure folder exists and get its ID
    const folderId = await this.ensureFolder();

    // Search within the trading-tracker folder
    const query = encodeURIComponent(`name='${fileName}' and '${folderId}' in parents and trashed=false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to search file: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0];
    }

    return null;
  }

  /**
   * Create a new file in Google Drive
   */
  async createFile(fileName: string, content: any): Promise<string> {
    const token = await this.ensureValidToken() ? this.config.accessToken : null;
    if (!token) {
      throw new Error('Not authenticated with Google Drive');
    }

    // Ensure folder exists and get its ID
    const folderId = await this.ensureFolder();

    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      parents: [folderId]
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }));

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to create file: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id;
  }

  /**
   * Update an existing file in Google Drive
   */
  async updateFile(fileId: string, content: any): Promise<void> {
    const token = await this.ensureValidToken() ? this.config.accessToken : null;
    if (!token) {
      throw new Error('Not authenticated with Google Drive');
    }

    const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(content, null, 2)
    });

    if (!response.ok) {
      // Parse error response for better error messages
      if (response.status === 404) {
        throw new Error('File not found (404)');
      }
      throw new Error(`Failed to update file: ${response.statusText}`);
    }
  }

  /**
   * Download file content from Google Drive
   */
  async downloadFile(fileId: string): Promise<any> {
    const token = await this.ensureValidToken() ? this.config.accessToken : null;
    if (!token) {
      throw new Error('Not authenticated with Google Drive');
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      // Parse error response for better error messages
      if (response.status === 404) {
        throw new Error('File not found (404)');
      }
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Load config from localStorage
   */
  private loadConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.config = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load Google Drive config from localStorage', e);
    }
  }

  /**
   * Save config to localStorage
   */
  private saveConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.warn('Failed to save Google Drive config to localStorage', e);
    }
  }
}
