#!/usr/bin/env node
/* Small local preview server for the SIZER web edition.
 *
 *   node serve.js
 *   node serve.js --port 8080
 *   node serve.js --host 0.0.0.0     (open it from a phone on the same Wi-Fi)
 *
 * No dependencies. Adds the correct .wasm / .webmanifest MIME types and
 * supports byte ranges so the ONNX runtime can fetch the model efficiently.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DEFAULT_PORT = 4173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.onnx': 'application/octet-stream',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function argValue(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const host = argValue('--host', '127.0.0.1');
const startPort = parseInt(argValue('--port', String(DEFAULT_PORT)), 10) || DEFAULT_PORT;

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  if (body) res.end(body);
  else res.end();
}

function serveFile(req, res, filePath, stat) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const isLargeAsset = ext === '.onnx' || ext === '.wasm';
  const headers = {
    'Content-Type': type,
    'Cache-Control': isLargeAsset ? 'public, max-age=86400' : 'no-store',
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff'
  };

  const range = req.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match) {
      let start = match[1] === '' ? null : parseInt(match[1], 10);
      let end = match[2] === '' ? null : parseInt(match[2], 10);
      if (start === null && end !== null) {
        start = Math.max(0, stat.size - end);
        end = stat.size - 1;
      } else {
        if (start === null) start = 0;
        if (end === null || end >= stat.size) end = stat.size - 1;
      }
      if (start > end || start >= stat.size) {
        send(res, 416, { 'Content-Range': 'bytes */' + stat.size });
        return;
      }
      headers['Content-Range'] = 'bytes ' + start + '-' + end + '/' + stat.size;
      headers['Content-Length'] = String(end - start + 1);
      res.writeHead(206, headers);
      fs.createReadStream(filePath, { start: start, end: end }).pipe(res);
      return;
    }
  }

  headers['Content-Length'] = String(stat.size);
  res.writeHead(200, headers);
  if (req.method === 'HEAD') {
    res.end();
  } else {
    fs.createReadStream(filePath).pipe(res);
  }
}

const server = http.createServer(function (req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, { Allow: 'GET, HEAD' }, 'Method not allowed');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname || '/');
  } catch (e) {
    send(res, 400, {}, 'Bad request');
    return;
  }

  if (pathname.endsWith('/')) pathname += 'index.html';

  const filePath = path.resolve(ROOT, '.' + pathname);
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    send(res, 403, {}, 'Forbidden');
    return;
  }

  fs.stat(filePath, function (err, stat) {
    if (err) {
      send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not found: ' + pathname);
      return;
    }
    if (stat.isDirectory()) {
      const index = path.join(filePath, 'index.html');
      fs.stat(index, function (indexErr, indexStat) {
        if (indexErr) {
          send(res, 403, {}, 'Directory listing is disabled');
          return;
        }
        serveFile(req, res, index, indexStat);
      });
      return;
    }
    serveFile(req, res, filePath, stat);
  });
});

function listen(port, attemptsLeft) {
  server.once('error', function (err) {
    if (err && err.code === 'EADDRINUSE' && attemptsLeft > 1) {
      listen(port + 1, attemptsLeft - 1);
      return;
    }
    console.error('Could not start the server:', err.message);
    process.exit(1);
  });
  server.listen(port, host, function () {
    const shown = (host === '0.0.0.0' || host === '::') ? '127.0.0.1' : host;
    console.log('');
    console.log('  SIZER web edition is running at:');
    console.log('    http://' + shown + ':' + port + '/');
    if (host === '0.0.0.0' || host === '::') {
      const nets = require('os').networkInterfaces();
      Object.keys(nets).forEach(function (name) {
        (nets[name] || []).forEach(function (net) {
          if (net.family === 'IPv4' && !net.internal) {
            console.log('  On your phone (same Wi-Fi): http://' + net.address + ':' + port + '/');
          }
        });
      });
    }
    console.log('');
    console.log('  Press Ctrl+C to stop.');
    console.log('');
  });
}

if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
  console.error('ERROR: index.html was not found next to serve.js.');
  process.exit(1);
}

listen(startPort, 20);
