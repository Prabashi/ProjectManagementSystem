export default {
  paths: ['e2e/features/**/*.feature'],
  import: [
    'e2e/support/world.ts',
    'e2e/support/hooks.ts',
    'e2e/steps/**/*.ts',
  ],
  format: ['progress-bar'],
  timeout: 30_000,
  worldParameters: {
    baseUrl: process.env.BASE_URL ?? 'http://localhost:5173',
    apiUrl: process.env.API_URL ?? 'http://localhost:5231/api',
  },
};
