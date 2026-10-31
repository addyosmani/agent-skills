'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

http.createServer((req, res) => {
  if (req.url === '/api/signup') {
    res.writeHead(500, { 'content-type': 'text/html' });
    res.end('<h1>database unavailable</h1>');
    return;
  }
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(fs.readFileSync(path.join(__dirname, 'index.html')));
}).listen(4173, '127.0.0.1', () => console.log('listening on http://127.0.0.1:4173'));
