# Routex 

 Routex  Docker 

## 

- (#)
- [Docker ](#docker-)
- (#)
- (#)
- (#)
- (#)
- (#)

---

## 

###  Docker Compose

```bash
#  docker-compose.yml
wget https://raw.githubusercontent.com/dctx-team/Routex/main/docker-compose.yml

#  .env 
cat > .env <<EOF
MASTER_PASSWORD=your-strong-password-here
SIGNATURE_SECRET=your-signature-secret-here
EOF

# 
docker-compose up -d

# 
docker-compose logs -f
```

 `http://localhost:3000` 

---

## Docker 

### 

- Docker >= 20.10
- Docker Compose >= 2.0

###  1 Docker Compose

**1. **

```bash
wget https://raw.githubusercontent.com/dctx-team/Routex/main/docker-compose.yml
wget https://raw.githubusercontent.com/dctx-team/Routex/main/.env.example -O .env
```

**2. **

```bash
#  .env 
vi .env
```

- `MASTER_PASSWORD` -  32 
- `SIGNATURE_SECRET` -  32 

**3. **

```bash
docker-compose up -d
```

**4. **

```bash
# 
docker-compose ps

# 
docker-compose logs -f routex

# 
curl http://localhost:3000/health
```

###  2 Docker 

**1. **

```bash
docker pull dctx/routex:latest
```

**2. **

```bash
docker volume create routex-data
docker volume create routex-logs
```

**3. **

```bash
docker run -d \
  --name routex \
  -p 3000:3000 \
  -v routex-data:/app/data \
  -v routex-logs:/app/logs \
  -e MASTER_PASSWORD=your-strong-password \
  -e SIGNATURE_SECRET=your-signature-secret \
  --restart unless-stopped \
  dctx/routex:latest
```

**4. **

```bash
docker logs -f routex
```

###  3

```bash
# 
git clone https://github.com/dctx-team/Routex.git
cd Routex

# 
docker build -t routex:local .

# 
docker run -d \
  --name routex \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  -e MASTER_PASSWORD=your-strong-password \
  routex:local
```

---

## 

### 

- Bun >= 1.2.23  Node.js >= 20
- Git

### 

**1. **

```bash
git clone https://github.com/dctx-team/Routex.git
cd Routex
```

**2. **

```bash
#  Bun
bun install

#  npm
npm install
```

**3. **

```bash
cp .env.example .env
vi .env
```

- `MASTER_PASSWORD`
- `SIGNATURE_SECRET`
- `DATABASE_PATH` `./data/routex.db`

**4. **

```bash
mkdir -p data logs
```

**5. **

```bash
bun test
```

**6. **

```bash
# 
bun run src/server.ts

# 
NODE_ENV=production bun run src/server.ts

#  PM2
pm2 start src/server.ts --name routex --interpreter bun
```

---

## 

### 

 `.env` 

```bash
# ============================================================================
# 
# ============================================================================

#  32 
MASTER_PASSWORD=YourSuperStrongMasterPassword123!@#WithSpecialChars

# 
# openssl rand -hex 32
ENCRYPTION_SALT=a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890

#  32 
SIGNATURE_SECRET=YourSignatureSecretForHMACVerification123!@#

# ============================================================================
# 
# ============================================================================

NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# ============================================================================
# 
# ============================================================================

DATABASE_PATH=./data/routex.db
DATABASE_ENCRYPTION=false

# ============================================================================
# 
# ============================================================================

LOG_LEVEL=info
LOG_SENSITIVE_DATA=false  #  false

# ============================================================================
# CORS 
# ============================================================================

CORS_ORIGINS=https://yourdomain.com,https://dashboard.yourdomain.com

# ============================================================================
# 
# ============================================================================

RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# ============================================================================
# 
# ============================================================================

PROXY_TIMEOUT=300000
PROXY_MAX_RETRIES=3

# ============================================================================
# 
# ============================================================================

METRICS_ENABLED=true
METRICS_PATH=/metrics
TRACING_ENABLED=true
TRACING_MAX_SPANS=10000
```

###  PM2 

**1.  PM2**

```bash
npm install -g pm2
```

**2.  PM2 **

`ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'routex',
    script: 'src/server.ts',
    interpreter: 'bun',
    instances: 'max',  //  CPU 
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '1G',
    autorestart: true,
    watch: false,
  }]
};
```

**3. **

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**4. **

```bash
# 
pm2 status

# 
pm2 logs routex

# 
pm2 restart routex

# 
pm2 stop routex

# 
pm2 monit
```

###  SystemdLinux

**1.  systemd **

`/etc/systemd/system/routex.service`:

```ini
[Unit]
Description=Routex API Gateway
After=network.target

[Service]
Type=simple
User=routex
WorkingDirectory=/opt/routex
Environment=NODE_ENV=production
EnvironmentFile=/opt/routex/.env
ExecStart=/usr/local/bin/bun run src/server.ts
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=routex

[Install]
WantedBy=multi-user.target
```

**2. **

```bash
sudo systemctl daemon-reload
sudo systemctl enable routex
sudo systemctl start routex
```

**3. **

```bash
# 
sudo systemctl status routex

# 
sudo journalctl -u routex -f

# 
sudo systemctl restart routex
```

### Nginx 

`/etc/nginx/sites-available/routex`:

```nginx
upstream routex {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    #  HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL 
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # SSL 
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 
    access_log /var/log/nginx/routex-access.log;
    error_log /var/log/nginx/routex-error.log;

    # 
    location / {
        proxy_pass http://routex;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Prometheus metrics
    location /metrics {
        proxy_pass http://routex/metrics;
        allow 10.0.0.0/8;  # 
        deny all;
    }

    # 
    location /health {
        proxy_pass http://routex/health;
        access_log off;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/routex /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 

Routex 

```bash
# 
curl http://localhost:3000/health

# 
{
  status: healthy,
  timestamp: 2025-10-18T01:30:00.000Z,
  uptime: 3600,
  version: 1.1.0
}
```

### Docker 

Docker 

```bash
# 
docker inspect --format='{{.State.Health.Status}}' routex

# 
docker inspect --format='{{json .State.Health}}' routex | jq
```

---

## 

### Prometheus 

 `/metrics`  Prometheus 

```bash
curl http://localhost:3000/metrics
```

### 

****
- Docker: `/app/logs/` 
- : `./logs/`

****
- `debug`
- `info`
- `warn`
- `error`
****

```bash
# Docker
docker-compose logs -f routex

# PM2
pm2 logs routex

# Systemd
sudo journalctl -u routex -f

# 
tail -f logs/routex.log
```

---

## 

### Q: 

```bash
#  openssl
openssl rand -base64 32

#  pwgen
pwgen -s 32 1

#  Routex 
bun -e console.log(require('crypto').randomBytes(32).toString('base64'))
```

### Q: 

```bash
# Docker
docker exec routex sh -c 'tar -czf - /app/data' > routex-backup.tar.gz

# 
tar -czf routex-backup-$(date +%Y%m%d).tar.gz data/
```

### Q: 

```bash
# Docker
docker exec -i routex sh -c 'tar -xzf - -C /' < routex-backup.tar.gz

# 
tar -xzf routex-backup-20251018.tar.gz
```

### Q: 

**Docker**

```bash
docker-compose pull
docker-compose up -d
```

****

```bash
git pull
bun install
pm2 restart routex
```

### Q:  3000 

**Docker Compose**

 `docker-compose.yml`

```yaml
ports:
  - 8080:3000  #  8080 
```

**Docker **

```bash
docker run -p 8080:3000 ...  #  8080 
```

****

 `.env` 

```bash
PORT=8080
```

### Q: 

 Prometheus metrics  Grafana 

```bash
# 
curl http://localhost:3000/metrics

#  Grafana Prometheus
#  Routex Dashboard JSON
```

---

## 

1. ✅ `MASTER_PASSWORD`, `SIGNATURE_SECRET`
2. ✅  HTTPS Nginx + Let's Encrypt
3. ✅  `/metrics` 
4. ✅ 
5. ✅ 90 
6. ✅ 
7. ✅ 
8. ✅ 

---

## 

- [GitHub Docs](https://github.com/dctx-team/Routex/tree/main/docs)
- Issues[GitHub Issues](https://github.com/dctx-team/Routex/issues)
- Discord[Join our community](https://discord.gg/routex)

---

****1.0.0
****2025-10-18
**Routex **1.1.0-beta
