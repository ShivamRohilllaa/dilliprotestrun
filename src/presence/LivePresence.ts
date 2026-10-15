const ENDPOINT = '/api/presence';
const INTERVAL = 15_000;
const BROWSER_KEY = 'dilli-protest-run.presence-browser';

function randomId(): string {
  return [...crypto.getRandomValues(new Uint8Array(16))]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function browserId(): string {
  const fallback = randomId();
  try {
    const stored = localStorage.getItem(BROWSER_KEY);
    if (stored && /^[a-f0-9]{32}$/.test(stored)) return stored;
    localStorage.setItem(BROWSER_KEY, fallback);
  } catch {
    /* Storage-blocked tabs can still participate with an in-memory ID. */
  }
  return fallback;
}

/** Counts visible gameplay only. Failing presence never prevents local/offline play. */
export function startLivePresence(): () => void {
  const enabled = import.meta.env.VITE_PRESENCE_ENABLED !== 'false';
  let count: number | null = null;
  let sequence = 0;
  let wasPlaying = false;
  let busy = false;
  let queued = false;
  let disposed = false;
  let request: AbortController | undefined;
  const events = new AbortController();
  const identity = enabled ? { browserId: browserId(), sessionId: randomId() } : null;

  function render() {
    const badge = document.querySelector<HTMLElement>('[data-live-presence]');
    if (!badge) return;
    badge.hidden = !enabled;
    badge.dataset.available = String(count !== null);
    badge.querySelector('strong')!.textContent = count === null ? '—' : count.toLocaleString();
    badge.querySelector('[data-presence-label]')!.textContent =
      count === null ? 'live count unavailable' : 'playing now';
    badge.title =
      'Browsers actively playing in a visible tab within the last 45 seconds. Paused runs are excluded.';
  }

  function leave() {
    if (!wasPlaying || !identity) return;
    wasPlaying = false;
    const body = JSON.stringify({ ...identity, active: false, sequence: ++sequence });
    try {
      if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'application/json' }))) return;
    } catch {
      /* Fall back to a short keepalive request. */
    }
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  }

  async function refresh() {
    render();
    if (!enabled || disposed) return;
    const playing = !document.hidden && document.body.dataset.state === 'PLAYING';
    if (!playing) leave();
    if (document.hidden) return;
    if (busy) {
      queued = true;
      return;
    }
    busy = true;
    queued = false;
    request = new AbortController();
    const timeout = window.setTimeout(() => request?.abort(), 6000);
    const update = playing ? { ...identity, active: true, sequence: ++sequence } : null;
    const requestSequence = sequence;
    if (playing) wasPlaying = true;
    try {
      const response = await fetch(ENDPOINT, {
        method: update ? 'POST' : 'GET',
        ...(update
          ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(update) }
          : {}),
        cache: 'no-store',
        signal: request.signal,
      });
      if (!response.ok) throw new Error('Presence unavailable');
      const data = await response.json();
      if (!Number.isSafeInteger(data.count) || data.count < 0) throw new Error('Invalid count');
      if (requestSequence === sequence) count = data.count;
    } catch {
      count = null;
    } finally {
      clearTimeout(timeout);
      busy = false;
      if (!disposed) {
        render();
        if (queued) void refresh();
      }
    }
  }

  const refreshEvent = () => {
    void refresh();
  };
  document.addEventListener('dilli:statechange', refreshEvent, { signal: events.signal });
  document.addEventListener('visibilitychange', refreshEvent, { signal: events.signal });
  window.addEventListener('pagehide', leave, { signal: events.signal });
  window.addEventListener('pageshow', refreshEvent, { signal: events.signal });
  window.addEventListener('online', refreshEvent, { signal: events.signal });
  const timer = window.setInterval(refreshEvent, INTERVAL);
  void refresh();
  return () => {
    leave();
    disposed = true;
    clearInterval(timer);
    events.abort();
    request?.abort();
  };
}
