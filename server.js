import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, URL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, 'dist');

// GoDaddy / Node.js Hosting automatically injects PORT (fallback to 8080)
const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = '0.0.0.0';

// Backend Proxy Target (defaults to production Airtel Cloud VM gateway)
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8081';
const backendParsed = new URL(BACKEND_URL);
const backendClient = backendParsed.protocol === 'https:' ? https : http;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.bin': 'application/octet-stream',
  '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

const server = http.createServer((req, res) => {
  const reqUrl = req.url || '/';

  // =========================================================================
  // 1. /api/* REVERSE PROXY ROUTING
  // =========================================================================
  if (reqUrl.startsWith('/api/') || reqUrl === '/api') {
    // Strip /api prefix: /api/auth/login -> /auth/login
    const targetPath = reqUrl.replace(/^\/api/, '') || '/';
    const proxyHeaders = { ...req.headers };
    proxyHeaders.host = backendParsed.host;

    // Remove connection-specific headers
    delete proxyHeaders['connection'];
    delete proxyHeaders['keep-alive'];

    const proxyReqOptions = {
      protocol: backendParsed.protocol,
      hostname: backendParsed.hostname,
      port: backendParsed.port || (backendParsed.protocol === 'https:' ? 443 : 80),
      method: req.method,
      path: targetPath,
      headers: proxyHeaders,
      timeout: 30000,
    };

    const proxyReq = backendClient.request(proxyReqOptions, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error(`[API Proxy Error] ${req.method} ${targetPath} ->`, err.message);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, status: 502, message: 'Bad Gateway: backend unreachable' }));
      }
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      if (!res.headersSent) {
        res.writeHead(504, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, status: 504, message: 'Gateway Timeout: backend timed out' }));
      }
    });

    req.pipe(proxyReq);
    return;
  }

  // =========================================================================
  // 2. STATIC ASSETS & SPA ROUTING
  // =========================================================================
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  // Extract clean pathname without query params
  let reqPath = decodeURI(reqUrl.split('?')[0]);
  if (reqPath === '/') {
    reqPath = '/index.html';
  }

  // Prevent directory traversal attacks
  let filePath = path.normalize(path.join(DIST_DIR, reqPath));
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const cacheControl = ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
        'Content-Length': stats.size,
      });

      if (req.method === 'HEAD') {
        res.end();
        return;
      }

      fs.createReadStream(filePath).pipe(res);
    } else {
      // SPA fallback: return index.html for all client-side React routes (e.g. /dashboard, /login)
      const indexPath = path.join(DIST_DIR, 'index.html');
      fs.stat(indexPath, (indexErr, indexStats) => {
        if (indexErr || !indexStats.isFile()) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Application not built yet. Please run npm run build.');
          return;
        }

        res.writeHead(200, {
          'Content-Type': 'text/html; charset=UTF-8',
          'Cache-Control': 'no-cache',
          'Content-Length': indexStats.size,
        });

        if (req.method === 'HEAD') {
          res.end();
          return;
        }

        fs.createReadStream(indexPath).pipe(res);
      });
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Frontend server running on http://${HOST}:${PORT}`);
  console.log(`API proxy routing /api/* -> ${BACKEND_URL}/*`);
});
