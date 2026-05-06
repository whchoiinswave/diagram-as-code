#!/usr/bin/env node
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = resolve(fileURLToPath(new URL('../dist', import.meta.url)));
const defaultHost = '127.0.0.1';
const defaultPort = 4173;
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.wasm', 'application/wasm'],
]);

function printHelp() {
  console.log(`diagram-as-code

Usage:
  diagram-as-code [--host 127.0.0.1] [--port 4173]

Options:
  --host <host>  Host to bind. Defaults to ${defaultHost}.
  --port <port>  Port to bind. Defaults to ${defaultPort}.
  --help         Show this help.
`);
}

function parseArgs(argv) {
  const options = {
    host: defaultHost,
    port: defaultPort,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    if (arg === '--host') {
      options.host = argv[index + 1] ?? defaultHost;
      index += 1;
      continue;
    }

    if (arg === '--port') {
      const nextPort = Number(argv[index + 1]);

      if (!Number.isInteger(nextPort) || nextPort < 0 || nextPort > 65535) {
        throw new Error(`Invalid port: ${argv[index + 1] ?? ''}`);
      }

      options.port = nextPort;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function resolveAsset(pathname) {
  const decoded = decodeURIComponent(pathname);
  const relativePath = decoded === '/' ? '/index.html' : decoded;
  const assetPath = resolve(distDir, `.${relativePath}`);

  if (!assetPath.startsWith(distDir)) {
    return null;
  }

  if (existsSync(assetPath) && statSync(assetPath).isFile()) {
    return assetPath;
  }

  return resolve(distDir, 'index.html');
}

function serveFile(response, assetPath) {
  const contentType = contentTypes.get(extname(assetPath)) ?? 'application/octet-stream';

  response.writeHead(200, {
    'Cache-Control': assetPath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
    'Content-Type': contentType,
  });
  createReadStream(assetPath).pipe(response);
}

try {
  const { host, port } = parseArgs(process.argv.slice(2));
  const indexPath = resolve(distDir, 'index.html');

  if (!existsSync(indexPath)) {
    throw new Error(`Missing bundled dist files at ${distDir}`);
  }

  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    const assetPath = resolveAsset(requestUrl.pathname);

    if (!assetPath) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    serveFile(response, assetPath);
  });

  server.listen(port, host, () => {
    const address = server.address();
    const actualPort = typeof address === 'object' && address ? address.port : port;

    console.log(`diagram-as-code is running at http://${host}:${actualPort}/`);
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
