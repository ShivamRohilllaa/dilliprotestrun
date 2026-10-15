#!/usr/bin/env bash
set -euo pipefail

# Run as the normal Ubuntu user, from the project checkout. sudo is used only for installation.
if [[ "$(uname -s)" != "Linux" || "$(id -u)" == "0" ]]; then
  echo "Run this on Lightsail as your normal Ubuntu user: bash deploy/install-presence.sh"
  exit 1
fi
GAME_PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GAME_NODE_PATH="$(command -v node)"
GAME_SERVICE_USER="$(id -un)"
GAME_PRESENCE_ORIGIN="$(node -e 'const u=new URL(process.argv[1]); if(!["http:","https:"].includes(u.protocol)||u.username||u.password) process.exit(1); console.log(u.origin)' "${1:-https://example.com}")"

sudo install -d -m 755 /opt/dilli-presence /etc/nginx/snippets
sudo install -m 644 "$GAME_PROJECT_DIR/server/presence.mjs" /opt/dilli-presence/presence.mjs
sudo install -m 644 "$GAME_PROJECT_DIR/deploy/presence-nginx.conf" /etc/nginx/snippets/dilli-presence.conf
sudo tee /etc/systemd/system/dilli-presence.service > /dev/null <<EOF
[Unit]
Description=Dilli Protest Run live player counter
After=network.target

[Service]
Type=simple
User=$GAME_SERVICE_USER
WorkingDirectory=/opt/dilli-presence
ExecStart="$GAME_NODE_PATH" /opt/dilli-presence/presence.mjs
Environment=PRESENCE_PORT=3001
Environment=PRESENCE_ORIGIN=$GAME_PRESENCE_ORIGIN
Environment=PRESENCE_TRUST_PROXY=true
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
UMask=0077

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable dilli-presence
sudo systemctl restart dilli-presence
curl --retry 5 --retry-connrefused --retry-delay 1 --fail --silent http://127.0.0.1:3001/api/presence
printf '\nPresence service installed. Add this line inside the HTTPS server block in your Nginx game configuration:\n\n    include /etc/nginx/snippets/dilli-presence.conf;\n\nThen run: sudo nginx -t && sudo systemctl reload nginx\n'
