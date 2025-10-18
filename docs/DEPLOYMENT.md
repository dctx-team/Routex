# Routex 部署指南

本文档提供 Routex 的详细部署说明，包括 Docker 部署、源码部署和生产环境配置。

## 目录

- [快速开始](#快速开始)
- [Docker 部署（推荐）](#docker-部署推荐)
- [源码部署](#源码部署)
- [生产环境配置](#生产环境配置)
- [健康检查](#健康检查)
- [监控和日志](#监控和日志)
- [常见问题](#常见问题)

---

## 快速开始

### 使用 Docker Compose（最简单）

```bash
# 下载 docker-compose.yml
wget https://raw.githubusercontent.com/dctx-team/Routex/main/docker-compose.yml

# 创建 .env 文件
cat > .env <<EOF
MASTER_PASSWORD=your-strong-password-here
SIGNATURE_SECRET=your-signature-secret-here
EOF

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

服务将在 `http://localhost:3000` 启动。

---

## Docker 部署（推荐）

### 前提条件

- Docker >= 20.10
- Docker Compose >= 2.0（可选）

### 方式 1：使用 Docker Compose

**1. 下载配置文件**

```bash
wget https://raw.githubusercontent.com/dctx-team/Routex/main/docker-compose.yml
wget https://raw.githubusercontent.com/dctx-team/Routex/main/.env.example -O .env
```

**2. 编辑环境变量**

```bash
# 编辑 .env 文件，设置必要的环境变量
vi .env
```

必须修改的变量：
- `MASTER_PASSWORD` - 加密主密码（至少 32 个字符）
- `SIGNATURE_SECRET` - 签名密钥（至少 32 个字符）

**3. 启动服务**

```bash
docker-compose up -d
```

**4. 验证运行状态**

```bash
# 检查容器状态
docker-compose ps

# 查看日志
docker-compose logs -f routex

# 健康检查
curl http://localhost:3000/health
```

### 方式 2：使用 Docker 命令

**1. 拉取镜像**

```bash
docker pull dctx/routex:latest
```

**2. 创建数据卷**

```bash
docker volume create routex-data
docker volume create routex-logs
```

**3. 运行容器**

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

**4. 查看日志**

```bash
docker logs -f routex
```

### 方式 3：从源码构建镜像

```bash
# 克隆仓库
git clone https://github.com/dctx-team/Routex.git
cd Routex

# 构建镜像
docker build -t routex:local .

# 运行容器
docker run -d \
  --name routex \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  -e MASTER_PASSWORD=your-strong-password \
  routex:local
```

---

## 源码部署

### 前提条件

- Bun >= 1.2.23 或 Node.js >= 20
- Git

### 安装步骤

**1. 克隆仓库**

```bash
git clone https://github.com/dctx-team/Routex.git
cd Routex
```

**2. 安装依赖**

```bash
# 使用 Bun（推荐）
bun install

# 或使用 npm
npm install
```

**3. 配置环境变量**

```bash
cp .env.example .env
vi .env
```

必须修改的变量：
- `MASTER_PASSWORD`
- `SIGNATURE_SECRET`
- `DATABASE_PATH`（可选，默认 `./data/routex.db`）

**4. 创建数据目录**

```bash
mkdir -p data logs
```

**5. 运行测试（可选）**

```bash
bun test
```

**6. 启动服务**

```bash
# 开发模式
bun run src/server.ts

# 生产模式
NODE_ENV=production bun run src/server.ts

# 使用 PM2（推荐）
pm2 start src/server.ts --name routex --interpreter bun
```

---

## 生产环境配置

### 环境变量配置

创建 `.env` 文件：

```bash
# ============================================================================
# 安全配置（必须修改！）
# ============================================================================

# 加密主密码（至少 32 个字符，包含大小写字母、数字和特殊字符）
MASTER_PASSWORD=YourSuperStrongMasterPassword123!@#WithSpecialChars

# 加密盐值（可选，使用以下命令生成）
# openssl rand -hex 32
ENCRYPTION_SALT=a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890

# 签名验证密钥（至少 32 个字符）
SIGNATURE_SECRET=YourSignatureSecretForHMACVerification123!@#

# ============================================================================
# 服务器配置
# ============================================================================

NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# ============================================================================
# 数据库配置
# ============================================================================

DATABASE_PATH=./data/routex.db
DATABASE_ENCRYPTION=false

# ============================================================================
# 日志配置
# ============================================================================

LOG_LEVEL=info
LOG_SENSITIVE_DATA=false  # 生产环境必须为 false

# ============================================================================
# CORS 配置
# ============================================================================

CORS_ORIGINS=https://yourdomain.com,https://dashboard.yourdomain.com

# ============================================================================
# 速率限制
# ============================================================================

RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# ============================================================================
# 代理配置
# ============================================================================

PROXY_TIMEOUT=300000
PROXY_MAX_RETRIES=3

# ============================================================================
# 监控配置
# ============================================================================

METRICS_ENABLED=true
METRICS_PATH=/metrics
TRACING_ENABLED=true
TRACING_MAX_SPANS=10000
```

### 使用 PM2 管理（推荐）

**1. 安装 PM2**

```bash
npm install -g pm2
```

**2. 创建 PM2 配置文件**

`ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'routex',
    script: 'src/server.ts',
    interpreter: 'bun',
    instances: 'max',  // 使用所有 CPU 核心
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

**3. 启动服务**

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**4. 管理服务**

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs routex

# 重启服务
pm2 restart routex

# 停止服务
pm2 stop routex

# 监控
pm2 monit
```

### 使用 Systemd（Linux）

**1. 创建 systemd 服务文件**

`/etc/systemd/system/routex.service`:

```ini
[Unit]
Description=Routex API Gateway
After=network.target

[Service]
Type=simple
User=routex
WorkingDirectory=/opt/routex
Environment="NODE_ENV=production"
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

**2. 启动服务**

```bash
sudo systemctl daemon-reload
sudo systemctl enable routex
sudo systemctl start routex
```

**3. 管理服务**

```bash
# 查看状态
sudo systemctl status routex

# 查看日志
sudo journalctl -u routex -f

# 重启服务
sudo systemctl restart routex
```

### Nginx 反向代理

`/etc/nginx/sites-available/routex`:

```nginx
upstream routex {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    # 强制 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL 证书
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 日志
    access_log /var/log/nginx/routex-access.log;
    error_log /var/log/nginx/routex-error.log;

    # 代理设置
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

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Prometheus metrics
    location /metrics {
        proxy_pass http://routex/metrics;
        allow 10.0.0.0/8;  # 仅内网访问
        deny all;
    }

    # 健康检查
    location /health {
        proxy_pass http://routex/health;
        access_log off;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/routex /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 健康检查

Routex 提供健康检查端点：

```bash
# 基本健康检查
curl http://localhost:3000/health

# 响应示例
{
  "status": "healthy",
  "timestamp": "2025-10-18T01:30:00.000Z",
  "uptime": 3600,
  "version": "1.1.0"
}
```

### Docker 健康检查

Docker 容器内置健康检查，会自动监控服务状态：

```bash
# 查看健康状态
docker inspect --format='{{.State.Health.Status}}' routex

# 查看健康检查历史
docker inspect --format='{{json .State.Health}}' routex | jq
```

---

## 监控和日志

### Prometheus 指标

访问 `/metrics` 端点获取 Prometheus 格式的指标：

```bash
curl http://localhost:3000/metrics
```

### 日志管理

**日志位置：**
- Docker: `/app/logs/` (挂载到宿主机)
- 源码部署: `./logs/`

**日志级别：**
- `debug` - 调试信息
- `info` - 一般信息（生产环境推荐）
- `warn` - 警告信息
- `error` - 错误信息

**查看日志：**

```bash
# Docker
docker-compose logs -f routex

# PM2
pm2 logs routex

# Systemd
sudo journalctl -u routex -f

# 文件
tail -f logs/routex.log
```

---

## 常见问题

### Q: 如何生成强密码？

```bash
# 使用 openssl
openssl rand -base64 32

# 使用 pwgen
pwgen -s 32 1

# 使用 Routex 内置工具
bun -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Q: 如何备份数据？

```bash
# Docker
docker exec routex sh -c 'tar -czf - /app/data' > routex-backup.tar.gz

# 源码部署
tar -czf routex-backup-$(date +%Y%m%d).tar.gz data/
```

### Q: 如何恢复数据？

```bash
# Docker
docker exec -i routex sh -c 'tar -xzf - -C /' < routex-backup.tar.gz

# 源码部署
tar -xzf routex-backup-20251018.tar.gz
```

### Q: 如何升级到新版本？

**Docker：**

```bash
docker-compose pull
docker-compose up -d
```

**源码部署：**

```bash
git pull
bun install
pm2 restart routex
```

### Q: 端口 3000 已被占用怎么办？

**Docker Compose：**

编辑 `docker-compose.yml`，修改端口映射：

```yaml
ports:
  - "8080:3000"  # 使用 8080 端口
```

**Docker 命令：**

```bash
docker run -p 8080:3000 ...  # 使用 8080 端口
```

**源码部署：**

修改 `.env` 文件：

```bash
PORT=8080
```

### Q: 如何查看性能指标？

访问 Prometheus metrics 端点或使用 Grafana 可视化：

```bash
# 获取指标
curl http://localhost:3000/metrics

# 使用 Grafana（需要先设置 Prometheus）
# 导入 Routex Dashboard JSON
```

---

## 安全建议

1. ✅ 使用强密码（`MASTER_PASSWORD`, `SIGNATURE_SECRET`）
2. ✅ 启用 HTTPS（使用 Nginx + Let's Encrypt）
3. ✅ 限制 `/metrics` 端点访问（仅内网）
4. ✅ 定期备份数据库
5. ✅ 定期轮换密钥（90 天）
6. ✅ 监控安全日志
7. ✅ 使用防火墙限制访问
8. ✅ 启用速率限制

---

## 支持

- 文档：[GitHub Docs](https://github.com/dctx-team/Routex/tree/main/docs)
- Issues：[GitHub Issues](https://github.com/dctx-team/Routex/issues)
- Discord：[Join our community](https://discord.gg/routex)

---

**文档版本**：1.0.0
**最后更新**：2025-10-18
**Routex 版本**：1.1.0-beta
