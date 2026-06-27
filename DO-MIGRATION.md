# Chatcart → DigitalOcean Migration Guide

This guide walks you through moving Chatcart from Replit to a $6/month DigitalOcean
Droplet. Follow the steps in order. Every command is exact copy-paste — substitute
the values in `<angle brackets>` with your own.

**Estimated time:** 60–90 minutes (most of it is waiting for DNS to propagate).

---

## A. Create the Droplet

1. Log in to [DigitalOcean](https://cloud.digitalocean.com) and click **Create → Droplets**.
2. Choose:
   - **Image:** Ubuntu 24.04 LTS (x64)
   - **Plan:** Basic — $6/mo (1 vCPU, 1 GB RAM, 25 GB SSD)
   - **Region:** Bangalore (BLR1) — closest to your users
   - **Authentication:** SSH key — paste your public key (`cat ~/.ssh/id_rsa.pub`)
   - **Hostname:** `chatcart`
3. Optionally enable **Backups** (+$1.20/mo) for peace of mind.
4. Click **Create Droplet** and note the public IP address.

---

## B. First Login & Server Hardening

```bash
# Log in as root
ssh root@<droplet-ip>

# Create a non-root user
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Set up the firewall
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable

# Switch to the new user for everything from here on
su - deploy
```

### Install Docker Engine

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

# Allow deploy user to run Docker without sudo
sudo usermod -aG docker deploy
newgrp docker
```

### Install Node 20 + pnpm (needed to build the frontends)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo corepack enable
sudo corepack prepare pnpm@latest --activate
```

---

## C. Clone the Repo onto the Droplet

```bash
# Generate a deploy key
ssh-keygen -t ed25519 -C "chatcart-droplet" -f ~/.ssh/deploy_key -N ""
cat ~/.ssh/deploy_key.pub
```

Copy the output, then go to your GitHub repo → **Settings → Deploy keys → Add deploy key**.
Paste the key, call it "chatcart-droplet", and tick **Allow read access**.

```bash
# Clone using the deploy key
GIT_SSH_COMMAND="ssh -i ~/.ssh/deploy_key" \
  git clone git@github.com:<your-github-username>/chatcart.git /opt/chatcart

sudo chown -R deploy:deploy /opt/chatcart
cd /opt/chatcart
```

---

## D. Set Up DigitalOcean Spaces

1. In the DO control panel: **Spaces Object Storage → Create a Space**.
2. Choose:
   - **Region:** BLR1
   - **Name:** `chatcart-uploads`
3. After creation, go to **Settings → CORS** and add:
   - Origin: `https://chatcart.in`
   - Allowed methods: GET, PUT
4. Go to **API → Spaces Keys → Generate New Key** and save:
   - **Key ID** (this is `DO_SPACES_KEY`)
   - **Secret** (this is `DO_SPACES_SECRET`)
5. Note the endpoint: `https://blr1.digitaloceanspaces.com`
   - **Region:** `blr1`
   - **Bucket:** `chatcart-uploads`

---

## E. Create the `.env` File on the Droplet

Open your Replit project → **Tools → Secrets** and copy every value listed below.

```bash
cat > /opt/chatcart/.env << 'EOF'
# Database — points to the local Postgres container
DATABASE_URL=postgresql://chatcart:<POSTGRES_PASSWORD>@postgres:5432/chatcart

# Must match POSTGRES_PASSWORD below
POSTGRES_PASSWORD=<choose-a-strong-password>

# Auth — copy from Replit Secrets
JWT_SECRET=<your-jwt-secret>
ADMIN_JWT_SECRET_SUFFIX=<your-admin-jwt-secret-suffix>

# MSG91 — copy from Replit Secrets
MSG91_AUTH_KEY=<your-msg91-auth-key>
MSG91_TEMPLATE_ID=<your-msg91-template-id>
MSG91_SENDER_ID=<your-msg91-sender-id>

# DigitalOcean Spaces — from step D above
DO_SPACES_KEY=<spaces-key-id>
DO_SPACES_SECRET=<spaces-secret>
DO_SPACES_REGION=blr1
DO_SPACES_BUCKET=chatcart-uploads

# WhatsApp session directory (bind-mounted persistent volume)
WA_SESSION_DIR=/data/wa-session

NODE_ENV=production
PORT=8080
EOF
```

> **Important:** Never commit this `.env` file. It is already in `.gitignore`.

---

## F. Export the Replit Database

In your Replit project, open the **Shell** tab and run:

```bash
pg_dump $DATABASE_URL > chatcart-backup.sql
```

Then download the file: in the **Files** panel, right-click `chatcart-backup.sql`
and choose **Download**.

---

## G. Import into Droplet Postgres

```bash
# From your local machine — upload the dump
scp chatcart-backup.sql deploy@<droplet-ip>:/opt/chatcart/

# On the Droplet — start only Postgres first
cd /opt/chatcart
docker compose up -d postgres

# Wait ~10 seconds for Postgres to become healthy, then import
docker compose exec -T postgres \
  psql -U chatcart -d chatcart < /opt/chatcart/chatcart-backup.sql

# Verify: you should see your tables
docker compose exec postgres psql -U chatcart -d chatcart -c "\dt"
```

---

## H. Migrate Product Images to DO Spaces

This step downloads every product image from the live Replit site and re-uploads it
to your new Spaces bucket. It is **idempotent** — safe to run multiple times.

```bash
cd /opt/chatcart

# Install all workspace dependencies (includes the migration script's deps)
pnpm install --frozen-lockfile

# Load env vars and run the migration via pnpm
export $(grep -v '^#' .env | xargs)
REPLIT_API_BASE=https://chatcart.in/api \
  pnpm --filter @workspace/scripts run migrate-images
```

Check the output — all images should show `OK`. After it finishes, verify one
image loads from Spaces:

```bash
# Replace <uuid> with any UUID from the output
curl -I "https://chatcart-uploads.blr1.digitaloceanspaces.com/uploads/<uuid>"
# Expect: HTTP/1.1 200 OK
```

---

## I. Build Frontends and Start All Services

```bash
cd /opt/chatcart

# Build all four React apps as static files
bash scripts/build-frontends.sh

# Build the Docker image and start everything
docker compose up -d --build

# Confirm the API is healthy
curl http://localhost/api/healthz
# Expect: {"status":"ok"} or similar 200 response
```

If the curl fails, check the logs:

```bash
docker compose logs api --tail 50
docker compose logs nginx --tail 20
```

---

## J. Point the Domain to the Droplet

Before cutting over DNS, lower the TTL:

1. Go to your domain registrar (or wherever chatcart.in DNS is managed).
2. Set the `A` record for `chatcart.in` (and `www.chatcart.in` if needed)
   to **your Droplet IP address**.
3. Set TTL to **300** (5 minutes).
4. Wait for propagation. Check with:

```bash
dig +short chatcart.in
# Should return your Droplet IP
```

---

## K. Set Up HTTPS with Let's Encrypt

```bash
# Install certbot on the host (easiest approach — avoids Docker networking issues)
sudo apt-get install -y certbot

# Stop nginx temporarily so certbot can bind to port 80
docker compose stop nginx

# Issue the certificate
sudo certbot certonly --standalone \
  -d chatcart.in \
  --agree-tos --email <your-email>

# Create the Let's Encrypt directory bind-mount path
mkdir -p /opt/chatcart/docker-data/certbot/conf
mkdir -p /opt/chatcart/docker-data/certbot/www

# Copy the issued certs so nginx can find them
sudo cp -rL /etc/letsencrypt /opt/chatcart/docker-data/certbot/conf/
sudo chown -R deploy:deploy /opt/chatcart/docker-data/certbot/
```

Now edit `nginx.conf` to uncomment the HTTPS server block at the bottom of the file,
then restart nginx:

```bash
# Uncomment the `server { listen 443 ssl; ... }` block in nginx.conf
nano /opt/chatcart/nginx.conf

docker compose up -d nginx
```

Certbot automatically installs a cron job that renews certificates before they expire.
After renewal, run `docker compose restart nginx` to reload the new cert.

---

## L. Final Checks

```bash
# 1. Marketing homepage
curl -I https://chatcart.in/
# Expect: 200 OK, Content-Type: text/html

# 2. API health
curl https://chatcart.in/api/healthz

# 3. Admin panel — open in browser
# https://chatcart.in/admin/

# 4. Seller dashboard — open in browser
# https://chatcart.in/dashboard/

# 5. Storefront — open in browser
# https://chatcart.in/store/sharma-general
```

In the admin panel:
- Log in with `admin@chatcart.in` / your admin password.
- Go to **WhatsApp** → click **Connect** and scan the QR code with your phone.
- Send a test campaign to verify WhatsApp messaging works.
- Confirm product images load (they should now come from DO Spaces).

---

## M. Remove from Replit (After Confirming DO is Stable)

Once you have confirmed the DigitalOcean deployment is stable for at least 24 hours:

1. In your Replit project, go to **Deploy** → **Unpublish**.
2. This stops the always-on deployment and ends the Replit billing for compute.
3. You can keep the Replit project as a code backup without paying for compute.

---

## Ongoing Operations

### Deploy a code update

```bash
cd /opt/chatcart
GIT_SSH_COMMAND="ssh -i ~/.ssh/deploy_key" git pull
bash scripts/build-frontends.sh       # only if frontend changed
docker compose up -d --build api       # only if API changed
docker compose restart nginx           # pick up new frontend builds
```

### View logs

```bash
docker compose logs api -f            # API server live logs
docker compose logs nginx -f          # Nginx access/error logs
docker compose logs postgres -f       # Postgres logs
```

### Restart a single service

```bash
docker compose restart api
docker compose restart nginx
```

### Backup the database

```bash
docker compose exec postgres \
  pg_dump -U chatcart chatcart > chatcart-backup-$(date +%Y%m%d).sql
```
