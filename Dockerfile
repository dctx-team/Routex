# Multi-stage Dockerfile for Routex
# Routex 的多阶段 Dockerfile
# Optimized for minimal size and fast startup
# 优化以实现最小大小和快速启动

# ============================================================================
# Builder stage / 构建阶段
# ============================================================================
FROM oven/bun:1.2.8-alpine AS builder

WORKDIR /app

# Copy package files / 复制包文件
COPY package.json bun.lockb* ./

# Install dependencies / 安装依赖
RUN bun install --frozen-lockfile --production

# Copy source code / 复制源代码
COPY . .

# Build application / 构建应用
RUN bun run build

# ============================================================================
# Runtime stage / 运行时阶段
# ============================================================================
FROM oven/bun:1.2.8-alpine

WORKDIR /app

# Create non-root user / 创建非 root 用户
RUN addgroup -g 1001 -S routex && \
    adduser -S routex -u 1001

# Copy built artifacts from builder / 从构建器复制构建产物
COPY --from=builder --chown=routex:routex /app/dist ./dist
COPY --from=builder --chown=routex:routex /app/node_modules ./node_modules
COPY --from=builder --chown=routex:routex /app/package.json ./

# Create data directory / 创建数据目录
RUN mkdir -p /data && chown routex:routex /data

# Switch to non-root user / 切换到非 root 用户
USER routex

# Expose port / 暴露端口
EXPOSE 8080

# Health check / 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://localhost:8080/health').then(r => r.ok ? process.exit(0) : process.exit(1))"

# Start server / 启动服务器
CMD ["bun", "run", "dist/server.js"]
