# Deployment Guide

Complete guide for deploying Routex to various platforms.
Routex

## Quick Start

### Local Development

```bash
# Clone repository
git clone https://github.com/dctx-team/Routex.git
cd Routex

# Install dependencies
bun install

# Start development server
bun run dev

# Or start production server
bun start
```

Server will be available at `http://localhost:8080`.
`http://localhost:8080`

---

## Docker Deployment / Docker

### Build and Run

```bash
# Build image
docker build -t routex .

# Run container
docker run -d \
  --name routex \
  -p 8080:8080 \
  -v $(pwd)/data:/data \
  routex
```

### Docker Compose

```yaml
version: '3.8'

services:
  routex:
    build: .
    ports:
      - "8080:8080"
    volumes:
      - ./data:/data
    environment:
      - LOAD_BALANCE_STRATEGY=priority
      - DASHBOARD_PASSWORD=your_password
    restart: unless-stopped
```

```bash
docker-compose up -d
```

---

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (v1.19+)
- kubectl configured
- (Optional) Helm 3 installed

### Quick Deploy with Kubectl

```bash
# Deploy using full configuration
kubectl apply -f deploy/kubernetes.yaml

# Or use minimal configuration
kubectl apply -f deploy/kubernetes-minimal.yaml

# Check deployment status
kubectl get all -n routex

# View logs
kubectl logs -f -n routex -l app=routex
```

### Deploy with Helm

```bash
# Install Routex with Helm
helm install routex ./deploy/helm/routex -n routex --create-namespace

# Upgrade existing deployment
helm upgrade routex ./deploy/helm/routex -n routex

# Customize with values
helm install routex ./deploy/helm/routex \
  -n routex \
  --create-namespace \
  --set image.tag=1.1.0-beta \
  --set service.type=LoadBalancer \
  --set persistence.size=5Gi
```

### Access the Service

**Port Forward (Development):**
```bash
kubectl port-forward -n routex svc/routex 8080:8080
```

**NodePort / LoadBalancer (Production):**
```bash
# Get service details
kubectl get svc -n routex
```

**Ingress (with SSL):**
Configure in `values.yaml` or `kubernetes.yaml`:
```yaml
ingress:
  enabled: true
  className: nginx
  hosts:
    - host: routex.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: routex-tls
      hosts:
        - routex.yourdomain.com
```

### Configuration

**Environment Variables:**
```yaml
env:
  PORT: "8080"
  HOST: "0.0.0.0"
  NODE_ENV: "production"
  DB_PATH: "/data/routex.db"
```

**Persistent Storage:**
```yaml
persistence:
  enabled: true
  storageClass: "standard"
  size: 1Gi
```

**Resource Limits:**
```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### Monitoring

```bash
# Check pod status
kubectl get pods -n routex

# View detailed pod info
kubectl describe pod -n routex -l app=routex

# Check events
kubectl get events -n routex

# Access logs
kubectl logs -f -n routex -l app=routex
```

### Backup & Restore

```bash
# Backup database
kubectl cp routex/<pod-name>:/data/routex.db ./routex-backup.db -n routex

# Restore database
kubectl cp ./routex-backup.db routex/<pod-name>:/data/routex.db -n routex
kubectl rollout restart deployment/routex -n routex
```

### Uninstall

```bash
# With kubectl
kubectl delete -f deploy/kubernetes.yaml

# With Helm
helm uninstall routex -n routex

# Delete namespace
kubectl delete namespace routex
```

For detailed Kubernetes deployment guide, see [deploy/KUBERNETES.md](../deploy/KUBERNETES.md).

---

## Platform Deployments

### claw.run (Free Tier Available / )

claw.run offers free credits for eligible users.
claw.run

**Prerequisites / :**
- claw.run account / claw.run
- claw CLI installed /  claw CLI

**Steps / :**

```bash
# 1. Login to claw.run /  claw.run
claw login

# 2. Deploy
claw deploy

# Configuration is in deploy/claw.yaml
#  deploy/claw.yaml
```

**Configuration / :**

The deployment uses `deploy/claw.yaml`:
`deploy/claw.yaml`

```yaml
name: routex
runtime: bun
resources:
memory: 512MB  # Free tier compatible
  cpu: 0.5
volumes:
  - path: /data
    size: 1GB
```

**Cost / :**
- Free tier: $0/month (with credits / )
- Paid: ~$3/month after credits /  $3/

---

### Railway (Free Trial / )

Railway offers $5 free credits per month.
Railway  $5

**Prerequisites / :**
- Railway account / Railway
- Railway CLI or GitHub integration / Railway CLI  GitHub

**Steps / :**

**Method 1: Using CLI /  CLI**

```bash
# 1. Install Railway CLI /  Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Initialize project
railway init

# 4. Deploy
railway up
```

**Method 2: GitHub Integration / GitHub **

1. Push code to GitHub /  GitHub
2. Go to [railway.app](https://railway.app) /  [railway.app](https://railway.app)
3. Click New Project → Deploy from GitHub / → GitHub
4. Select your repository
5. Railway will auto-detect Dockerfile / Railway  Dockerfile

**Environment Variables / :**

Set in Railway dashboard:
Railway

```
PORT=8080 (automatically set)
LOAD_BALANCE_STRATEGY=priority
DASHBOARD_PASSWORD=your_password
```

**Cost / :**
- Free: $5 credits/month /  $5
- After credits: ~$8/month for 1GB RAM /  1GB RAM  $8/

---

### Fly.io (Free Tier Available / )

Fly.io offers 3 free VMs with 256MB RAM each.
Fly.io  3  256MB RAM

**Prerequisites / :**
- Fly.io account / Fly.io
- flyctl CLI installed /  flyctl CLI

**Steps / :**

```bash
# 1. Install flyctl /  flyctl
curl -L https://fly.io/install.sh | sh

# 2. Login
fly auth login

# 3. Launch app (uses deploy/fly.toml) /  deploy/fly.toml
fly launch

# 4. Create volume for database
fly volumes create routex_data --size 1

# 5. Deploy
fly deploy
```

**Configuration / :**

Edit `deploy/fly.toml` if needed:
`deploy/fly.toml`

```toml
[[vm]]
memory = '512mb'  # Adjust based on needs
  cpu_kind = 'shared'
  cpus = 1

[[mounts]]
  source = "routex_data"
  destination = "/data"
```

**Cost / :**
- Free: 3 × 256MB VMs / 3  256MB
- Paid: $5/month for 1GB VM / 1GB  $5/

---

### Render (Free Tier Available / )

Render offers free tier for web services.
Render  Web

**Steps / :**

1. Push code to GitHub /  GitHub
2. Go to [render.com](https://render.com) /  [render.com](https://render.com)
3. Click New + → Web Service /  +→Web
4. Connect your repository
5. Configure:
   - **Environment**: Docker / Docker
- **Build Command**: (auto-detected)
   - **Start Command**: `bun run dist/server.js`

**Environment Variables / :**

```
PORT=8080
LOAD_BALANCE_STRATEGY=priority
```

**Limitations / :**
- Free tier spins down after inactivity
- 512MB RAM limit / 512MB RAM

**Cost / :**
- Free tier: $0/month / $0/
- Starter: $7/month / $7/

---

### Self-Hosted VPS /  VPS

Best for production with full control.

**Recommended Providers / :**
- Hetzner: $3.5/month (2GB RAM) / $3.5/2GB RAM
- DigitalOcean: $6/month (1GB RAM) / $6/1GB RAM
- Vultr: $5/month (1GB RAM) / $5/1GB RAM
- Linode: $5/month (1GB RAM) / $5/1GB RAM

**Steps (Ubuntu 22.04+) / Ubuntu 22.04+:**

```bash
# 1. Install Bun /  Bun
curl -fsSL https://bun.sh/install | bash

# 2. Clone repository
git clone https://github.com/dctx-team/Routex.git
cd Routex

# 3. Install dependencies
bun install

# 4. Build
bun run build

# 5. Create systemd service /  systemd
sudo nano /etc/systemd/system/routex.service
```

**systemd service file / systemd :**

```ini
[Unit]
Description=Routex AI API Router
After=network.target

[Service]
Type=simple
User=routex
WorkingDirectory=/opt/routex
ExecStart=/home/routex/.bun/bin/bun run dist/server.js
Restart=always
RestartSec=10
Environment="PORT=8080"
Environment="LOAD_BALANCE_STRATEGY=priority"

[Install]
WantedBy=multi-user.target
```

```bash
# 6. Enable and start service
sudo systemctl enable routex
sudo systemctl start routex

# 7. Check status
sudo systemctl status routex
```

**Nginx Reverse Proxy / Nginx :**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**SSL with Certbot /  Certbot  SSL:**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port /  | 8080 |
| `LOAD_BALANCE_STRATEGY` | Load balancing strategy /  | priority |
| `DASHBOARD_PASSWORD` | Dashboard password /  | (none) |
| `DATA_DIR` | Data directory path /  | ./data |

---

## Persistent Storage

Routex uses SQLite for data storage. Ensure the database is persisted:
Routex  SQLite

### Docker
```bash
-v $(pwd)/data:/data
```

### Cloud Platforms
- Most platforms support volume mounts
- Configure in platform dashboard or config files

---

## Health Checks

All platforms should use:

```
Path: /health
Method: GET
Expected Status: 200
```

---

## Monitoring

### Logs

**Docker:**
```bash
docker logs -f routex
```

**Systemd:**
```bash
sudo journalctl -u routex -f
```

### Metrics

Access analytics via API:
API

```bash
curl http://localhost:8080/api/analytics
```

---

## Scaling

### Vertical Scaling

Increase resources based on load:

| Users | RAM | CPU | Cost/month |
|-------|-----|-----|------------|
| < 100 | 512MB | 0.5 | $0-5 |
| 100-1000 | 1GB | 1 | $5-10 |
| 1000-10000 | 2GB | 2 | $10-20 |

### Horizontal Scaling

For high availability, run multiple instances with:

- Load balancer (Nginx/HAProxy) / Nginx/HAProxy
- Shared database volume
- Session affinity

---

## Troubleshooting

### Port Already in Use

```bash
# Change port
PORT=3000 bun start
```

### Database Locked

```bash
# Check if another instance is running
ps aux | grep routex

# Stop all instances
pkill -f routex
```

### No Channels Available

```bash
# Add a channel via API /  API
curl -X POST http://localhost:8080/api/channels \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Channel",
    "type": "anthropic",
    "apiKey": "sk-ant-***",
    "models": ["claude-sonnet-4-20250514"]
  }'
```

---

## Security Best Practices

1. **Use HTTPS**: Always use SSL/TLS in production /  SSL/TLS
2. **Firewall**: Restrict access to necessary ports
3. **API Keys**: Store API keys securely (environment variables) /  API
4. **Updates**: Keep dependencies up to date
5. **Backup**: Regularly backup database

---

## Performance Tips

1. **Database**: Use SSD for better SQLite performance /  SSD  SQLite
2. **Memory**: Allocate at least 512MB RAM /  512MB RAM
3. **Caching**: Bun has built-in optimizations / Bun
4. **Monitoring**: Use `/health` endpoint for uptime checks /  `/health`

---

For more information, see the [API Reference](./api.md) or visit [GitHub](https://github.com/dctx-team/Routex).

[API ](./api.md)  [GitHub](https://github.com/dctx-team/Routex)
