import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let serverProcess;
let baseUrl;
let serverOutput = '';
let startupError;

async function getAvailablePort() {
  const portServer = createServer();
  await new Promise((resolveListen, reject) => {
    portServer.once('error', reject);
    portServer.listen(0, '127.0.0.1', resolveListen);
  });
  const { port } = portServer.address();
  await new Promise((resolveClose, reject) => {
    portServer.close(error => (error ? reject(error) : resolveClose()));
  });
  return port;
}

async function waitForServer() {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    if (startupError) {
      throw new Error(`Could not start backend process: ${startupError.message}`);
    }
    if (serverProcess.exitCode !== null || serverProcess.signalCode !== null) {
      throw new Error(`Backend exited before becoming ready.\n${serverOutput}`);
    }

    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      await new Promise(resolveDelay => setTimeout(resolveDelay, 100));
    }
  }

  throw new Error(`Backend did not become ready in time.\n${serverOutput}`);
}

async function requestJson(path, { method = 'GET', token, body, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  return { response, data: await response.json() };
}

beforeAll(async () => {
  const port = await getAvailablePort();
  baseUrl = `http://127.0.0.1:${port}`;

  serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(port),
      JWT_SECRET: 'isolated-integration-test-secret',
      MONGODB_URI: '',
      FOOTBALL_DATA_KEY: '',
      VITE_FOOTBALL_API_KEY: '',
      CRICAPI_KEY: '',
      GEMINI_API_KEY: '',
      OPENAI_API_KEY: '',
      NEWSAPI_KEY: '',
      SMTP_HOST: '',
      SMTP_USER: '',
      SMTP_PASS: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const captureOutput = chunk => {
    serverOutput = `${serverOutput}${chunk}`.slice(-4000);
  };
  serverProcess.once('error', error => {
    startupError = error;
  });
  serverProcess.stdout.on('data', captureOutput);
  serverProcess.stderr.on('data', captureOutput);

  await waitForServer();
}, 65_000);

afterAll(async () => {
  if (!serverProcess || serverProcess.exitCode !== null) return;

  const exited = new Promise(resolveExit => serverProcess.once('exit', resolveExit));
  serverProcess.kill();
  await Promise.race([
    exited,
    new Promise(resolveTimeout => setTimeout(resolveTimeout, 2_000)),
  ]);
}, 5_000);

describe('backend API integration', () => {
  it('reports health without exposing configured secrets', async () => {
    const { response, data } = await requestJson('/api/health', {
      headers: { Origin: 'https://untrusted.example' },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(data).toMatchObject({
      status: 'ok',
      apis: { database: 'in-memory' },
    });
    expect(JSON.stringify(data)).not.toContain('isolated-integration-test-secret');
  });

  it('registers users, authenticates them, and protects account actions', async () => {
    const username = `api-test-${Date.now()}`;
    const password = 'integration-password';

    const invalidRegistration = await requestJson('/api/register', {
      method: 'POST',
      body: { username: 'ab', password },
    });
    expect(invalidRegistration.response.status).toBe(400);

    const registration = await requestJson('/api/register', {
      method: 'POST',
      body: { username, password },
    });
    expect(registration.response.status).toBe(201);
    expect(registration.data.user.username).toBe(username);
    expect(registration.data.user).not.toHaveProperty('password');
    expect(registration.data.token).toEqual(expect.any(String));

    const duplicate = await requestJson('/api/register', {
      method: 'POST',
      body: { username, password },
    });
    expect(duplicate.response.status).toBe(409);

    const login = await requestJson('/api/login', {
      method: 'POST',
      body: { username, password },
    });
    expect(login.response.status).toBe(200);
    expect(login.data.token).toEqual(expect.any(String));

    const unauthenticatedAward = await requestJson('/api/fanpoints/award', {
      method: 'POST',
      body: { username, action: 'cheer' },
    });
    expect(unauthenticatedAward.response.status).toBe(401);

    const award = await requestJson('/api/fanpoints/award', {
      method: 'POST',
      token: login.data.token,
      body: { username, action: 'cheer' },
    });
    expect(award.response.status).toBe(200);
    expect(award.data.totalPoints).toBe(5);
    expect(award.data.user.fanPoints).toBe(5);

    const crossAccountAward = await requestJson('/api/fanpoints/award', {
      method: 'POST',
      token: login.data.token,
      body: { username: `${username}-other`, action: 'cheer' },
    });
    expect(crossAccountAward.response.status).toBe(403);
  });
});
