# Live player counter on Lightsail

The homepage's “playing now” badge uses a shared, in-memory Node.js service. It counts browsers with a visible tab in the `PLAYING` state, including your own active run. Menus, setup, paused runs, finished games and hidden tabs do not count. Heartbeats and visible-page reads run every 15 seconds; disconnected sessions expire after 45 seconds. Tabs in the same browser share a random browser ID, and one tab leaving does not remove another active tab. Storage-blocked tabs may count separately. This is an approximate active-browser count, not verified human identity or historical analytics. The endpoint is public and cannot prevent all fabricated clients.

If the service cannot be reached, the badge says “live count unavailable” instead of inventing a number. The game still works. One Node process serves this single Lightsail instance; a restart clears presence until the next heartbeats. Multiple instances would need a shared store before their counts could be combined.

## Install the backend once

Run these in your Lightsail SSH terminal as `ubuntu`, from the updated repository. Use Node 22.13+ or 24+, as for the build:

```sh
cd ~/dilli-protest-run
bash deploy/install-presence.sh
```

The script installs a systemd service using your current Node executable, copies the backend to `/opt/dilli-presence`, and installs an Nginx snippet. It starts the backend on **127.0.0.1:3001** and enables restart on boot. It does not edit your HTTPS or certificate settings. If you later remove that Node version, rerun the script with the new Node version selected.

Open your existing game configuration:

```sh
sudo nano /etc/nginx/sites-available/dilli-protest-run
```

Inside the `server { ... }` block containing `listen 443 ssl`, add this single line alongside `root` and `server_name` (outside other `location` blocks):

```nginx
include /etc/nginx/snippets/dilli-presence.conf;
```

Add it only once in that server block. Then test and reload:

```sh
sudo nginx -t && sudo systemctl reload nginx
curl -fsS https://example.com/api/presence
```

The response should resemble `{"count":0,"windowSeconds":45}` when no one is playing. Do not open port 3001 in the Lightsail firewall; Nginx proxies the existing HTTPS connection. Keep the origin argument aligned with your actual domain if you change it: `bash deploy/install-presence.sh https://game.example.com`.

## Build and publish the frontend

```sh
npm ci
VITE_BASE_PATH=/ VITE_PRESENCE_ENABLED=true npm run build
sudo rsync -a --exclude=index.html dist/ /var/www/dilli-protest-run/
sudo chmod -R a+rX /var/www/dilli-protest-run
sudo install -m 644 dist/index.html /var/www/dilli-protest-run/index.html.next
sudo mv /var/www/dilli-protest-run/index.html.next /var/www/dilli-protest-run/index.html
```

This uses the document root from the project's earlier Nginx setup. If your active Nginx root differs, publish there instead. For later backend updates, rerun the installer; keep the existing Nginx include. Static-only hosts can build with `VITE_PRESENCE_ENABLED=false` to hide the badge and disable presence requests.

To verify, keep the menu open in one browser and start a run in a different browser/device. The menu counter should rise within 15 seconds. Pause the run and it should fall; an abrupt disconnect can take up to 45 seconds plus one viewer refresh. Opening more tabs in the same browser should not inflate the count.

## Local development and checks

In one terminal:

```sh
PRESENCE_ORIGIN=http://127.0.0.1:5173 npm run presence
```

In another, run `npm run dev`. Vite proxies `/api/presence` to port 3001. The endpoint remains at the domain root for subpath deployments too. To use another backend port, set `PRESENCE_PORT` for Node and `PRESENCE_PROXY_TARGET` for Vite. `npm run test:presence` checks HTTP behavior, deduplication, expiration, ordering and input limits; production browser tests start their own isolated backend.

Troubleshooting on Lightsail:

```sh
sudo systemctl status dilli-presence --no-pager
sudo journalctl -u dilli-presence -n 40 --no-pager
curl -fsS http://127.0.0.1:3001/api/presence
curl -fsS https://example.com/api/presence
```

Local success with public 404 means the Nginx include is missing from the active HTTPS server. Public 502 indicates the backend is not reachable. Public 403 on updates usually means `PRESENCE_ORIGIN` differs from the browser's origin. The service keeps identifiers and short-lived IP rate-limit entries in memory only; it exposes only the aggregate count. The supplied Nginx location disables access logging for this endpoint.
