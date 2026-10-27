import { existsSync } from 'node:fs';

// Local settings live in .env (ignored by git); .env.example documents them.
if (existsSync('.env')) process.loadEnvFile('.env');

const target = process.env.API_PROXY_TARGET ?? 'http://localhost:8080';

export default {
  '/api': {
    target,
    secure: false,
    changeOrigin: true,
    // The browser only talks to the dev server, so the backend's CORS list does not need this origin.
    configure: proxy => proxy.on('proxyReq', request => request.removeHeader('origin')),
  },
};
