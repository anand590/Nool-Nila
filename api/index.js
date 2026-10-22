const { createApp } = require('../apps/api/dist/app.js');

// Initialize the Express app at module scope for warm container reuse on Vercel Serverless
const app = createApp();

module.exports = app;
