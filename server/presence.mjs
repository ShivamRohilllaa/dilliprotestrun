import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

export const PRESENCE_TTL = 45_000;
const ID = /^[a-f0-9]{32}$/;

export class PresenceStore {
  constructor({ now = Date.now, maxSessions = 20_000 } = {}) {
    this.now = now;
    this.maxSessions = maxSessions;
    this.sessions = new Map();
  }

  prune() {
    const cutoff = this.now() - PRESENCE_TTL;
    for (const [id, session] of this.sessions) {
      if (session.seen <= cutoff) this.sessions.delete(id);
    }
  }

  update({ browserId, sessionId, active, sequence }) {
    this.prune();
    const previous = this.sessions.get(sessionId);
    if (previous && (previous.browserId !== browserId || sequence <= previous.sequence)) return;
    if (!previous && this.sessions.size >= this.maxSessions) throw new Error('capacity');
    // Keep inactive tombstones briefly, so a delayed heartbeat cannot resurrect a closed tab.
    this.sessions.set(sessionId, { browserId, active, sequence, seen: this.now() });
  }

  count() {
    this.prune();
    return new Set(
      [...this.sessions.values()]
        .filter((session) => session.active)
        .map((session) => session.browserId),
    ).size;
  }
}

export function createPresenceServer({
  origin = 'https://example.com',
  store = new PresenceStore(),
  trustProxy = false,
  rateLimit = 240,
} = {}) {
  const clients = new Map();
  const send = (res, status, value) => {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(JSON.stringify(value));
  };
  const server = createServer(
    { requestTimeout: 10_000, headersTimeout: 10_000, maxHeaderSize: 8192 },
    async (req, res) => {
      if (req.url?.split('?')[0] !== '/api/presence') return send(res, 404, { error: 'Not found' });
      if (
        req.headers['sec-fetch-site'] === 'cross-site' ||
        (req.headers.origin && req.headers.origin !== origin)
      )
        return send(res, 403, { error: 'Origin not allowed' });
      if (!['GET', 'POST'].includes(req.method))
        return send(res, 405, { error: 'Method not allowed' });

      const ip =
        trustProxy && typeof req.headers['x-real-ip'] === 'string'
          ? req.headers['x-real-ip']
          : req.socket.remoteAddress;
      const now = Date.now();
      const client = clients.get(ip);
      if (!client || client.until <= now) {
        if (!client && clients.size >= 10_000)
          return send(res, 503, { error: 'Busy; retry later' });
        clients.set(ip, { requests: 1, until: now + 60_000 });
      } else if (++client.requests > rateLimit) {
        res.setHeader('Retry-After', '60');
        return send(res, 429, { error: 'Too many requests' });
      }

      if (req.method === 'POST') {
        if (!req.headers['content-type']?.startsWith('application/json'))
          return send(res, 415, { error: 'Expected JSON' });
        if (Number(req.headers['content-length']) > 512)
          return send(res, 413, { error: 'Payload too large' });
        let size = 0;
        const chunks = [];
        try {
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 512) {
              send(res, 413, { error: 'Payload too large' });
              return;
            }
            chunks.push(chunk);
          }
          const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if (
            !data ||
            typeof data.browserId !== 'string' ||
            !ID.test(data.browserId) ||
            typeof data.sessionId !== 'string' ||
            !ID.test(data.sessionId) ||
            typeof data.active !== 'boolean' ||
            !Number.isSafeInteger(data.sequence) ||
            data.sequence < 1
          )
            return send(res, 400, { error: 'Invalid presence update' });
          store.update(data);
        } catch (error) {
          return send(res, error.message === 'capacity' ? 503 : 400, {
            error: 'Presence update rejected',
          });
        }
      }
      send(res, 200, { count: store.count(), windowSeconds: PRESENCE_TTL / 1000 });
    },
  );
  const cleanup = setInterval(() => {
    store.prune();
    for (const [ip, client] of clients) if (client.until <= Date.now()) clients.delete(ip);
  }, 15_000);
  cleanup.unref();
  server.on('close', () => clearInterval(cleanup));
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PRESENCE_PORT || 3001);
  const origin = new URL(process.env.PRESENCE_ORIGIN || 'https://example.com').origin;
  const server = createPresenceServer({
    origin,
    trustProxy: process.env.PRESENCE_TRUST_PROXY === 'true',
  });
  server.listen(port, '127.0.0.1', () =>
    console.log(`Presence API listening on 127.0.0.1:${port}`),
  );
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () => {
      server.close();
      server.closeAllConnections();
    });
}
