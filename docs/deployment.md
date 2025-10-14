# Deployment Guide

Complete guide for deploying Routex to various platforms.
在各种平台上部署 Routex 的完整指南。

## Quick Start / 快速开始

### Local Development / 本地开发

```bash
# Clone repository / 克隆仓库
git clone https://github.com/dctx-team/Routex.git
cd Routex

# Install dependencies / 安装依赖
bun install

# Start development server / 启动开发服务器
bun run dev

# Or start production server / 或启动生产服务器
bun start
```

Server will be available at `http://localhost:8080`.
服务器将在 `http://localhost:8080` 可用。

---

## Docker Deployment / Docker 部署

### Build and Run / 构建并运行

```bash
# Build image / 构建镜像
docker build -t routex .

# Run container / 运行容器
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

## Platform Deployments / 平台部署

### claw.run (Free Tier Available / 提供免费层)

claw.run offers free credits for eligible users.
claw.run 为符合条件的用户提供免费积分。

**Prerequisites / 先决条件:**
- claw.run account / claw.run 账户
- claw CLI installed / 已安装 claw CLI

**Steps / 步骤:**

```bash
# 1. Login to claw.run / 登录到 claw.run
claw login

# 2. Deploy / 部署
claw deploy

# Configuration is in deploy/claw.yaml
# 配置在 deploy/claw.yaml 中
```

**Configuration / 配置:**

The deployment uses `deploy/claw.yaml`:
部署使用 `deploy/claw.yaml`：

```yaml
name: routex
runtime: bun
resources:
  memory: 512MB  # Free tier compatible / 兼容免费层
  cpu: 0.5
volumes:
  - path: /data
    size: 1GB
```

**Cost / 成本:**
- Free tier: $0/month (with credits / 使用积分)
- Paid: ~$3/month after credits / 积分用完后约 $3/月

---

### Railway (Free Trial / 免费试用)

Railway offers $5 free credits per month.
Railway 每月提供 $5 免费积分。

**Prerequisites / 先决条件:**
- Railway account / Railway 账户
- Railway CLI or GitHub integration / Railway CLI 或 GitHub 集成

**Steps / 步骤:**

**Method 1: Using CLI / 使用 CLI**

```bash
# 1. Install Railway CLI / 安装 Railway CLI
npm install -g @railway/cli

# 2. Login / 登录
railway login

# 3. Initialize project / 初始化项目
railway init

# 4. Deploy / 部署
railway up
```

**Method 2: GitHub Integration / GitHub 集成**

1. Push code to GitHub / 将代码推送到 GitHub
2. Go to [railway.app](https://railway.app) / 访问 [railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub" / 点击"新项目"→"从 GitHub 部署"
4. Select your repository / 选择您的仓库
5. Railway will auto-detect Dockerfile / Railway 将自动检测 Dockerfile

**Environment Variables / 环境变量:**

Set in Railway dashboard:
在 Railway 仪表板中设置：

```
PORT=8080 (automatically set)
LOAD_BALANCE_STRATEGY=priority
DASHBOARD_PASSWORD=your_password
```

**Cost / 成本:**
- Free: $5 credits/month / 每月 $5 积分
- After credits: ~$8/month for 1GB RAM / 积分用完后 1GB RAM 约 $8/月

---

### Fly.io (Free Tier Available / 提供免费层)

Fly.io offers 3 free VMs with 256MB RAM each.
Fly.io 提供 3 个免费虚拟机，每个 256MB RAM。

**Prerequisites / 先决条件:**
- Fly.io account / Fly.io 账户
- flyctl CLI installed / 已安装 flyctl CLI

**Steps / 步骤:**

```bash
# 1. Install flyctl / 安装 flyctl
curl -L https://fly.io/install.sh | sh

# 2. Login / 登录
fly auth login

# 3. Launch app (uses deploy/fly.toml) / 启动应用（使用 deploy/fly.toml）
fly launch

# 4. Create volume for database / 为数据库创建卷
fly volumes create routex_data --size 1

# 5. Deploy / 部署
fly deploy
```

**Configuration / 配置:**

Edit `deploy/fly.toml` if needed:
如需要，编辑 `deploy/fly.toml`：

```toml
[[vm]]
  memory = '512mb'  # Adjust based on needs / 根据需要调整
  cpu_kind = 'shared'
  cpus = 1

[[mounts]]
  source = "routex_data"
  destination = "/data"
```

**Cost / 成本:**
- Free: 3 × 256MB VMs / 3 个 256MB 虚拟机
- Paid: $5/month for 1GB VM / 1GB 虚拟机 $5/月

---

### Render (Free Tier Available / 提供免费层)

Render offers free tier for web services.
Render 为 Web 服务提供免费层。

**Steps / 步骤:**

1. Push code to GitHub / 将代码推送到 GitHub
2. Go to [render.com](https://render.com) / 访问 [render.com](https://render.com)
3. Click "New +" → "Web Service" / 点击"新建 +"→"Web 服务"
4. Connect your repository / 连接您的仓库
5. Configure:
   - **Environment**: Docker / Docker
   - **Build Command**: (auto-detected) / （自动检测）
   - **Start Command**: `bun run dist/server.js`

**Environment Variables / 环境变量:**

```
PORT=8080
LOAD_BALANCE_STRATEGY=priority
```

**Limitations / 限制:**
- Free tier spins down after inactivity / 免费层在不活动后休眠
- 512MB RAM limit / 512MB RAM 限制

**Cost / 成本:**
- Free tier: $0/month / 免费层：$0/月
- Starter: $7/month / 入门版：$7/月

---

### Self-Hosted VPS / 自托管 VPS

Best for production with full control.
最适合完全控制的生产环境。

**Recommended Providers / 推荐提供商:**
- Hetzner: $3.5/month (2GB RAM) / $3.5/月（2GB RAM）
- DigitalOcean: $6/month (1GB RAM) / $6/月（1GB RAM）
- Vultr: $5/month (1GB RAM) / $5/月（1GB RAM）
- Linode: $5/month (1GB RAM) / $5/月（1GB RAM）

**Steps (Ubuntu 22.04+) / 步骤（Ubuntu 22.04+）:**

```bash
# 1. Install Bun / 安装 Bun
curl -fsSL https://bun.sh/install | bash

# 2. Clone repository / 克隆仓库
git clone https://github.com/dctx-team/Routex.git
cd Routex

# 3. Install dependencies / 安装依赖
bun install

# 4. Build / 构建
bun run build

# 5. Create systemd service / 创建 systemd 服务
sudo nano /etc/systemd/system/routex.service
```

**systemd service file / systemd 服务文件:**

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
# 6. Enable and start service / 启用并启动服务
sudo systemctl enable routex
sudo systemctl start routex

# 7. Check status / 检查状态
sudo systemctl status routex
```

**Nginx Reverse Proxy / Nginx 反向代理:**

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

**SSL with Certbot / 使用 Certbot 配置 SSL:**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Environment Variables / 环境变量

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port / 服务器端口 | 8080 |
| `LOAD_BALANCE_STRATEGY` | Load balancing strategy / 负载均衡策略 | priority |
| `DASHBOARD_PASSWORD` | Dashboard password / 仪表板密码 | (none) |
| `DATA_DIR` | Data directory path / 数据目录路径 | ./data |

---

## Persistent Storage / 持久存储

Routex uses SQLite for data storage. Ensure the database is persisted:
Routex 使用 SQLite 进行数据存储。确保数据库被持久化：

### Docker
```bash
-v $(pwd)/data:/data
```

### Cloud Platforms
- Most platforms support volume mounts / 大多数平台支持卷挂载
- Configure in platform dashboard or config files / 在平台仪表板或配置文件中配置

---

## Health Checks / 健康检查

All platforms should use:
所有平台应使用：

```
Path: /health
Method: GET
Expected Status: 200
```

---

## Monitoring / 监控

### Logs / 日志

**Docker:**
```bash
docker logs -f routex
```

**Systemd:**
```bash
sudo journalctl -u routex -f
```

### Metrics / 指标

Access analytics via API:
通过 API 访问分析：

```bash
curl http://localhost:8080/api/analytics
```

---

## Scaling / 扩展

### Vertical Scaling / 垂直扩展

Increase resources based on load:
根据负载增加资源：

| Users | RAM | CPU | Cost/month |
|-------|-----|-----|------------|
| < 100 | 512MB | 0.5 | $0-5 |
| 100-1000 | 1GB | 1 | $5-10 |
| 1000-10000 | 2GB | 2 | $10-20 |

### Horizontal Scaling / 水平扩展

For high availability, run multiple instances with:
为实现高可用性，运行多个实例：

- Load balancer (Nginx/HAProxy) / 负载均衡器（Nginx/HAProxy）
- Shared database volume / 共享数据库卷
- Session affinity / 会话亲和性

---

## Troubleshooting / 故障排除

### Port Already in Use / 端口已被占用

```bash
# Change port / 更改端口
PORT=3000 bun start
```

### Database Locked / 数据库锁定

```bash
# Check if another instance is running / 检查是否有其他实例正在运行
ps aux | grep routex

# Stop all instances / 停止所有实例
pkill -f routex
```

### No Channels Available / 无可用渠道

```bash
# Add a channel via API / 通过 API 添加渠道
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

## Security Best Practices / 安全最佳实践

1. **Use HTTPS**: Always use SSL/TLS in production / 生产环境中始终使用 SSL/TLS
2. **Firewall**: Restrict access to necessary ports / 限制对必要端口的访问
3. **API Keys**: Store API keys securely (environment variables) / 安全存储 API 密钥（环境变量）
4. **Updates**: Keep dependencies up to date / 保持依赖最新
5. **Backup**: Regularly backup database / 定期备份数据库

---

## Performance Tips / 性能提示

1. **Database**: Use SSD for better SQLite performance / 使用 SSD 以获得更好的 SQLite 性能
2. **Memory**: Allocate at least 512MB RAM / 分配至少 512MB RAM
3. **Caching**: Bun has built-in optimizations / Bun 具有内置优化
4. **Monitoring**: Use `/health` endpoint for uptime checks / 使用 `/health` 端点进行正常运行时间检查

---

For more information, see the [API Reference](./api.md) or visit [GitHub](https://github.com/dctx-team/Routex).

更多信息，请参阅 [API 参考](./api.md) 或访问 [GitHub](https://github.com/dctx-team/Routex)。
