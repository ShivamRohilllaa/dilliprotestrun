# Host Dilli Protest Run on AWS Lightsail

Use a **fresh Ubuntu 24.04 LTS Lightsail instance with Nginx**. Build the game on your Mac and upload the static `dist/` files. Gameplay runs in each player's browser; the server does not need Node.js, a database, or a running Vite process. [Vite's deployment guide](https://vite.dev/guide/static-deploy.html) confirms that `dist/` is the deployment output and `vite preview` is for local previews.

These instructions assume the new instance hosts only this game. They have not been executed against an AWS instance. For an existing server with other sites, use a separate hostname-specific Nginx configuration rather than changing its default site.

## 1. Create the instance and network settings

In the [Lightsail console](https://lightsail.aws.amazon.com/), choose **Create instance → Linux/Unix → OS only → Ubuntu 24.04 LTS**. Choose **dual-stack networking** so the instance has public IPv4. A **$7/month, 1 GB RAM** plan is a reasonable starting recommendation for this static game, subject to actual traffic measurements; it is not a tested capacity guarantee. [AWS instance creation](https://docs.aws.amazon.com/lightsail/latest/userguide/getting-started-with-amazon-lightsail.html), [current bundle specifications](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-bundles.html).

Create and attach a **static IPv4 address** in the same Region. In the instance's **Networking** tab, allow public TCP **80 (HTTP)** and **443 (HTTPS)**. Restrict **22 (SSH)** to your IP; select **Allow Lightsail browser SSH** if you also want the console terminal. No Vite port such as 4173 or 5173 needs to be public. [AWS static IP instructions](https://docs.aws.amazon.com/lightsail/latest/userguide/lightsail-create-static-ip.html), [firewall instructions](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-editing-firewall-rules.html).

Download the matching SSH private key from **Account → SSH keys**, or use the custom key selected when creating the instance. Keep the key on your Mac. Plain Ubuntu uses the SSH username `ubuntu`; packaged Nginx and Bitnami blueprints use different usernames and paths. [AWS SSH/file-transfer instructions](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-transfer-files-between-linux-instances.html).

## 2. Build and upload from your Mac

Use the supported Node version from the [README](../README.md#local-setup). Run:

```sh
cd /path/to/dilli-protest-run
npm ci
VITE_BASE_PATH=/ npm run build
```

This build targets the root of the domain, such as `https://game.example.com/`. Replace the key path and IP below with your values, then run in the same Mac terminal:

```sh
GAME_SSH_KEY="$HOME/Downloads/LightsailDefaultKey-ap-south-1.pem"
GAME_SERVER_IP="YOUR_STATIC_IPV4"

chmod 400 "$GAME_SSH_KEY"
scp -i "$GAME_SSH_KEY" -r dist "ubuntu@$GAME_SERVER_IP:~/"
ssh -i "$GAME_SSH_KEY" "ubuntu@$GAME_SERVER_IP"
```

The rest of the setup commands run **inside that SSH session**.

## 3. Install Nginx and publish the files

```sh
sudo apt update
sudo apt install -y nginx rsync
sudo install -d -m 755 /var/www/dilli-protest-run
sudo rsync -a --exclude=index.html ~/dist/ /var/www/dilli-protest-run/
sudo chmod -R a+rX /var/www/dilli-protest-run
sudo install -m 644 ~/dist/index.html /var/www/dilli-protest-run/index.html.next
sudo mv /var/www/dilli-protest-run/index.html.next /var/www/dilli-protest-run/index.html
```

Assets are copied before the new HTML is published. The commands keep existing hashed assets available for browsers that still have an older page open. [Ubuntu's Nginx installation guide](https://ubuntu.com/server/docs/how-to/web-services/install-nginx/).

Create the game-specific server block. The quoted `EOF` preserves Nginx's `$uri` variables:

```sh
sudo tee /etc/nginx/sites-available/dilli-protest-run > /dev/null <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/dilli-protest-run;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 5;
    gzip_types application/javascript text/javascript text/css application/json image/svg+xml;

    location ^~ /assets/ {
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location = /index.html {
        add_header Cache-Control "no-cache" always;
    }

    location / {
        try_files $uri $uri/ =404;
        add_header Cache-Control "no-cache" always;
    }
}
EOF
```

`/assets/` contains Vite's hashed filenames, so those files receive long caching. HTML must revalidate so updates point to the new asset names. Gzip compresses text assets; already compressed WebP portraits do not need it. [Nginx gzip directives](https://nginx.org/en/docs/http/ngx_http_gzip_module.html), [cache-header directives](https://nginx.org/en/docs/http/ngx_http_headers_module.html).

On this **fresh, single-site instance only**, disable Ubuntu's supplied default-site symlink and enable the game as the sole default. The underlying default configuration is retained; no other site files are removed:

```sh
sudo unlink /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/dilli-protest-run /etc/nginx/sites-enabled/dilli-protest-run
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
```

Proceed with the reload only if `nginx -t` succeeds. Open `http://YOUR_STATIC_IPV4/` and check avatar selection, gameplay, portraits, and reload. Ubuntu documents this `sites-available` / `sites-enabled` structure in its [Nginx configuration guide](https://ubuntu.com/server/docs/how-to/web-services/configure-nginx/).

## 4. Add your domain and HTTPS

At your current DNS provider, add an **A record** for the intended hostname pointing to the static IPv4. For `game.example.com`, the record name is usually `game`. You can keep DNS at the existing provider; moving nameservers is optional. [AWS domain-mapping guidance](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-quick-start-guide-nginx.html).

After `http://game.example.com/` reaches your game, replace `game.example.com` below with your real hostname and run on the server:

```sh
sudo sed -i 's/server_name _;/server_name game.example.com;/' /etc/nginx/sites-available/dilli-protest-run
sudo nginx -t
sudo systemctl reload nginx

sudo apt install -y snapd
sudo snap install --classic certbot
sudo /snap/bin/certbot --nginx -d game.example.com --redirect
sudo /snap/bin/certbot renew --dry-run
```

Follow Certbot's prompts, then verify `https://game.example.com/`. The Nginx plugin installs the certificate and redirects HTTP to HTTPS; the snap provides scheduled renewal. Keep port 80 available for the HTTP validation method. [Official Certbot instructions](https://certbot.eff.org/instructions?os=snap&ws=nginx).

## 5. Publish later updates

On your Mac, rebuild and upload again. Reuse the two variables from step 2, or set them again in a new terminal:

```sh
cd /path/to/dilli-protest-run
VITE_BASE_PATH=/ npm run build
scp -i "$GAME_SSH_KEY" -r dist "ubuntu@$GAME_SERVER_IP:~/"
ssh -i "$GAME_SSH_KEY" "ubuntu@$GAME_SERVER_IP"
```

Then publish on the server:

```sh
sudo rsync -a --exclude=index.html ~/dist/ /var/www/dilli-protest-run/
sudo chmod -R a+rX /var/www/dilli-protest-run
sudo install -m 644 ~/dist/index.html /var/www/dilli-protest-run/index.html.next
sudo mv /var/www/dilli-protest-run/index.html.next /var/www/dilli-protest-run/index.html
```

Static-file updates do not require restarting Nginx. Do not repeat the initial server-block setup after Certbot has configured HTTPS. Reload the public game and check its latest artwork and a complete start/retry flow. If you add a CDN later, revalidate or invalidate its HTML cache when publishing.

## Capacity and costs

Concurrent **already-loaded players** run on their own devices. The hosting load mainly comes from **new downloads and reloads**, so a player count alone does not establish server capacity. There is no measured maximum concurrent-player claim for this deployment. Overload can slow or fail requests; it does not physically damage the server.

As checked on **14 October 2026**, the **$7/month public-IPv4 Linux plan has 1 GB RAM** and a standard 2 TB transfer allowance. **Mumbai receives half: 1 TB/month**. Both inbound and outbound traffic consume that allowance; excess outbound transfer in Mumbai costs **$0.13/GB**. These are monthly transfer limits, not simultaneous-player limits. [AWS plan specifications](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-bundles.html), [regional transfer rules and charges](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-faq-data-transfer-allowance.html).

The current build is approximately **0.75 MB raw**, or around **0.28 MB for compressed JS/CSS plus the WebP portraits** when text compression is configured correctly. These are build-size estimates, not an actual Lightsail transfer measurement or load benchmark; HTML, headers, other files, retries, and cache behavior affect real usage.

Monitor CPU, remaining burst capacity, and network traffic after launch. Add a CDN before a large promotional traffic spike: caching serves repeated downloads from edge locations and reduces origin load. [AWS burst-capacity monitoring](https://docs.aws.amazon.com/lightsail/latest/userguide/monitoring-cpu-burst-capacity.html), [Lightsail CDN overview](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-faq-cdn-distributions.html).
