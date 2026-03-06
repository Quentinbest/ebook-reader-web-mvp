import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const host = process.env.DESIGN_HOST || '127.0.0.1';
const port = Number(process.env.DESIGN_PORT || '4174');
const rootDir = process.env.DESIGN_ROOT || '/Users/quentin/workspace/design-reader-figma/desktop-site';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function contentType(filePath) {
  return mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function safeJoin(root, requestPath) {
  const cleaned = requestPath === '/' ? '/index.html' : requestPath;
  const resolved = path.resolve(root, `.${cleaned}`);
  if (!resolved.startsWith(path.resolve(root))) {
    throw new Error('Path traversal blocked');
  }
  return resolved;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${host}:${port}`);
    const filePath = safeJoin(rootDir, url.pathname);
    const data = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType(filePath) });
    res.end(data);
  } catch (error) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(error instanceof Error ? error.message : 'Not found');
  }
});

server.listen(port, host, () => {
  console.log(`Frozen design server running at http://${host}:${port}`);
  console.log(`Serving ${rootDir}`);
});
