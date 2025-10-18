# Multi-stage Dockerfile for Routex
# Routex 的多阶段 Dockerfile
# Optimized for minimal size and fast startup
# 优化以实现最小大小和快速启动

# ============================================================================
# Builder stage / 构建阶段
# ============================================================================
FROM oven/bun:1.2.23-alpine AS builder

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy package files / 复制包文件
COPY package.json bun.lock* ./

# Install dependencies / 安装依赖
RUN bun install --frozen-lockfile --production

# Copy source code / 复制源代码
COPY src ./src
COPY tsconfig.json ./

# ============================================================================
# Runtime stage / 运行时阶段
# ============================================================================
FROM oven/bun:1.2.23-alpine

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create non-root user / 创建非 root 用户
RUN addgroup -g 1001 -S routex && \
    adduser -S routex -u 1001 -G routex -h /app

# Copy dependencies and source from builder / 从构建器复制依赖和源码
COPY --from=builder --chown=routex:routex /app/node_modules ./node_modules
COPY --from=builder --chown=routex:routex /app/package.json ./
COPY --from=builder --chown=routex:routex /app/src ./src
COPY --from=builder --chown=routex:routex /app/tsconfig.json ./

# Create data and logs directories / 创建数据和日志目录
RUN mkdir -p /app/data /app/logs && \
    chown -R routex:routex /app/data /app/logs

# Switch to non-root user / 切换到非 root 用户
USER routex

# Expose port / 暴露端口
EXPOSE 3000

# Health check / 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Set environment variables / 设置环境变量
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    LOG_LEVEL=info \
    DATABASE_PATH=/app/data/routex.db

# Start server / 启动服务器
CMD ["bun", "run", "src/server.ts"]
