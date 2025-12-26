export const environment = {
  production: false,
  googleClientId: '415057442876-1lpa3bgneif4l2gnd6g1anml9o49hl0l.apps.googleusercontent.com',
  
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
