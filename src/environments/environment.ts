export const environment = {
  production: false,
  googleClientId: '324607101110-jm62j15nm96l1pn0u4dtapr0iie6u5ei.apps.googleusercontent.com',
  
  // Build metadata (development environment)
  build: {
    buildId: 'dev',
    deployId: 'dev',
    shortDeployId: 'dev',
    commitRef: 'local',
    shortCommit: 'local',
    context: 'development',
    deployTime: new Date().toISOString(),
    deployUrl: 'http://localhost:4200',
    version: '0.0.0'
  }
};
