// Copy this file to environment.ts and environment.prod.ts
// Replace with your actual Google OAuth credentials

export const environment = {
  production: false,
  googleDrive: {
    clientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
    redirectUri: 'http://localhost:4200',
    scope: 'https://www.googleapis.com/auth/drive.file'
  }
};
