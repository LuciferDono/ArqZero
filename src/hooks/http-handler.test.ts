import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { executeHttpHook } from './http-handler.js';
import type { HookDefinition, HookPayload } from './types.js';

const basePayload: HookPayload = {
  event: 'PostToolUse',
  toolName: 'Bash',
  toolResult: { content: 'output' },
  timestamp: Date.now(),
};

function createServer(
  handler: (req: http.IncomingMessage, res: http.ServerResponse) => void,
): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      resolve({ server, port: addr.port });
    });
  });
}

function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

describe('executeHttpHook', () => {
  let server: http.Server | undefined;

  afterEach(async () => {
    if (server) {
      await closeServer(server);
      server = undefined;
    }
  });

  it('should POST payload and parse JSON response', async () => {
    let receivedBody = '';
    const s = await createServer((req, res) => {
      let data = '';
      req.on('data', (chunk) => (data += chunk));
      req.on('end', () => {
        receivedBody = data;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ action: 'deny', message: 'not allowed' }));
      });
    });
    server = s.server;

    const hook: HookDefinition = {
      event: 'PostToolUse',
      type: 'http',
      url: `http://127.0.0.1:${s.port}/hook`,
    };

    const result = await executeHttpHook(hook, basePayload);
    assert.equal(result.action, 'deny');
    assert.equal(result.message, 'not allowed');

    // Verify payload was sent
    const parsed = JSON.parse(receivedBody);
    assert.equal(parsed.event, 'PostToolUse');
    assert.equal(parsed.toolName, 'Bash');
  });

  it('should return continue on HTTP error status', async () => {
    const s = await createServer((_req, res) => {
      res.writeHead(500);
      res.end('Internal Server Error');
    });
    server = s.server;

    const hook: HookDefinition = {
      event: 'PostToolUse',
      type: 'http',
      url: `http://127.0.0.1:${s.port}/hook`,
    };

    const result = await executeHttpHook(hook, basePayload);
    assert.equal(result.action, 'continue');
  });

  it('should return continue on network error', async () => {
    const hook: HookDefinition = {
      event: 'PostToolUse',
      type: 'http',
      url: 'http://127.0.0.1:1/nonexistent',  // port 1 should fail
    };

    const result = await executeHttpHook(hook, basePayload);
    assert.equal(result.action, 'continue');
  });

  it('should return continue on timeout', async () => {
    const s = await createServer((_req, _res) => {
      // Never respond
    });
    server = s.server;

    const hook: HookDefinition = {
      event: 'PostToolUse',
      type: 'http',
      url: `http://127.0.0.1:${s.port}/hook`,
      timeout: 200,
    };

    const result = await executeHttpHook(hook, basePayload);
    assert.equal(result.action, 'continue');
  });

  it('should return continue on invalid JSON response', async () => {
    const s = await createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('not json');
    });
    server = s.server;

    const hook: HookDefinition = {
      event: 'PostToolUse',
      type: 'http',
      url: `http://127.0.0.1:${s.port}/hook`,
    };

    const result = await executeHttpHook(hook, basePayload);
    assert.equal(result.action, 'continue');
  });
});
