import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createPresenceServer, PresenceStore, PRESENCE_TTL } from '../../server/presence.mjs';

const id = (value) => value.toString(16).padStart(32, '0');
const update = (browser, tab, sequence = 1, active = true) => ({
  browserId: id(browser),
  sessionId: id(tab),
  sequence,
  active,
});

test('counts browsers, not their tabs, and preserves other active tabs on leave', () => {
  const store = new PresenceStore();
  store.update(update(1, 11));
  store.update(update(1, 12));
  store.update(update(2, 21));
  assert.equal(store.count(), 2);
  store.update(update(1, 11, 2, false));
  assert.equal(store.count(), 2);
  store.update(update(1, 12, 2, false));
  assert.equal(store.count(), 1);
});

test('expired heartbeats disappear and fresh ones extend presence', () => {
  let time = 0;
  const store = new PresenceStore({ now: () => time });
  store.update(update(1, 11));
  time = 30_000;
  store.update(update(1, 11, 2));
  store.update(update(2, 21));
  time = 30_000 + PRESENCE_TTL - 1;
  assert.equal(store.count(), 2);
  time += 1;
  assert.equal(store.count(), 0);
  assert.equal(store.sessions.size, 0);
});

test('delayed and duplicate heartbeats cannot undo a pause or extend a lease', () => {
  let time = 0;
  const store = new PresenceStore({ now: () => time });
  store.update(update(1, 11, 2, false));
  store.update(update(1, 11, 1, true));
  assert.equal(store.count(), 0);
  store.update(update(1, 11, 3, true));
  time = 40_000;
  store.update(update(1, 11, 3, true));
  time = 45_000;
  assert.equal(store.count(), 0);
});

test('session capacity is bounded and recovers after expiration', () => {
  let time = 0;
  const store = new PresenceStore({ now: () => time, maxSessions: 1 });
  store.update(update(1, 11));
  assert.throws(() => store.update(update(2, 21)), /capacity/);
  time = PRESENCE_TTL;
  store.update(update(2, 21));
  assert.equal(store.count(), 1);
});

async function service(t, options) {
  const server = createPresenceServer(options);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  const endpoint = `http://127.0.0.1:${server.address().port}/api/presence`;
  return {
    endpoint,
    post: (data, headers = {}) =>
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(data),
      }),
  };
}

test('independent HTTP clients see a shared count and no identifiers are returned', async (t) => {
  const { endpoint, post } = await service(t);
  assert.deepEqual(await (await fetch(endpoint)).json(), { count: 0, windowSeconds: 45 });
  assert.equal((await post(update(1, 11))).status, 200);
  assert.equal((await post(update(2, 21))).status, 200);
  const response = await fetch(endpoint);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { count: 2, windowSeconds: 45 });
  await post(update(1, 11, 2, false));
  assert.equal((await (await fetch(endpoint)).json()).count, 1);
});

test('rejects invalid, oversized and cross-origin writes', async (t) => {
  const { endpoint, post } = await service(t);
  assert.equal((await post({ ...update(1, 11), browserId: [id(1)] })).status, 400);
  assert.equal((await post({ ...update(1, 11), sequence: -1 })).status, 400);
  assert.equal((await post({ ...update(1, 11), active: 'true' })).status, 400);
  assert.equal((await post(update(1, 11), { Origin: 'https://unrelated.example' })).status, 403);
  assert.equal((await post(update(1, 11), { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.equal((await post({ padding: 'x'.repeat(1024) })).status, 413);
  assert.equal((await fetch(endpoint, { method: 'POST', body: 'bad json' })).status, 415);
  assert.equal((await fetch(endpoint, { method: 'DELETE' })).status, 405);
  assert.equal((await (await fetch(endpoint)).json()).count, 0);
});

test('rate limits clients instead of returning a fabricated count', async (t) => {
  const { endpoint } = await service(t, { rateLimit: 2 });
  await fetch(endpoint);
  await fetch(endpoint);
  const response = await fetch(endpoint);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '60');
});
