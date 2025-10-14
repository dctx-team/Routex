#!/bin/bash
# One-click deployment script for Routex
# Routex 的一键部署脚本

set -e

echo "🚀 Routex One-Click Deployment"
echo "🚀 Routex 一键部署"
echo "================================"
echo ""

# Select platform / 选择平台
echo "Select deployment platform / 选择部署平台:"
echo "1) claw.run (Free tier available / 提供免费层)"
echo "2) Railway (Free \$5/month credits / 每月免费 \$5 积分)"
echo "3) Fly.io (Free tier available / 提供免费层)"
echo "4) Render (Free tier available / 提供免费层)"
echo "5) Local Docker (Local deployment / 本地部署)"
echo "6) Exit / 退出"
echo ""

read -p "Enter choice [1-6]: " platform

case $platform in
  1)
    echo ""
    echo "📦 Deploying to claw.run..."
    echo "📦 部署到 claw.run..."
    echo ""

    # Check if claw CLI is installed / 检查是否安装了 claw CLI
    if ! command -v claw &> /dev/null; then
      echo "❌ claw CLI not found. Install it first:"
      echo "❌ 未找到 claw CLI。请先安装："
      echo "   npm install -g @claw/cli"
      exit 1
    fi

    claw deploy
    ;;

  2)
    echo ""
    echo "🚂 Deploying to Railway..."
    echo "🚂 部署到 Railway..."
    echo ""

    # Check if railway CLI is installed / 检查是否安装了 railway CLI
    if ! command -v railway &> /dev/null; then
      echo "❌ Railway CLI not found. Install it first:"
      echo "❌ 未找到 Railway CLI。请先安装："
      echo "   npm install -g @railway/cli"
      echo "   railway login"
      exit 1
    fi

    # Initialize if needed / 如需要，初始化
    if [ ! -f "railway.json" ]; then
      railway init
    fi

    railway up
    ;;

  3)
    echo ""
    echo "✈️  Deploying to Fly.io..."
    echo "✈️  部署到 Fly.io..."
    echo ""

    # Check if flyctl is installed / 检查是否安装了 flyctl
    if ! command -v flyctl &> /dev/null; then
      echo "❌ flyctl not found. Install it first:"
      echo "❌ 未找到 flyctl。请先安装："
      echo "   curl -L https://fly.io/install.sh | sh"
      echo "   fly auth login"
      exit 1
    fi

    # Launch if first time / 如果是第一次，启动
    if [ ! -f "fly.toml" ]; then
      echo "Copying configuration / 复制配置..."
      cp deploy/fly.toml fly.toml
      fly launch --copy-config --no-deploy

      echo "Creating volume / 创建卷..."
      fly volumes create routex_data --size 1
    fi

    fly deploy
    ;;

  4)
    echo ""
    echo "🎨 Deploying to Render..."
    echo "🎨 部署到 Render..."
    echo ""

    echo "Render requires GitHub integration / Render 需要 GitHub 集成"
    echo ""
    echo "Steps / 步骤:"
    echo "1. Push your code to GitHub / 将代码推送到 GitHub"
    echo "2. Go to https://render.com / 访问 https://render.com"
    echo "3. Create New Web Service / 创建新的 Web 服务"
    echo "4. Connect your GitHub repository / 连接您的 GitHub 仓库"
    echo "5. Render will auto-detect the Dockerfile / Render 将自动检测 Dockerfile"
    echo ""
    echo "Would you like to push to GitHub now? (y/n)"
    read -p "是否现在推送到 GitHub？(y/n): " push_github

    if [ "$push_github" = "y" ]; then
      if [ ! -d ".git" ]; then
        git init
        git add .
        git commit -m "Initial commit for Routex deployment"
      fi

      echo "Enter your GitHub repository URL:"
      echo "输入您的 GitHub 仓库 URL:"
      read repo_url

      git remote add origin "$repo_url" 2>/dev/null || git remote set-url origin "$repo_url"
      git branch -M main
      git push -u origin main

      echo "✅ Pushed to GitHub. Now complete the setup on Render dashboard."
      echo "✅ 已推送到 GitHub。现在在 Render 仪表板上完成设置。"
    fi
    ;;

  5)
    echo ""
    echo "🐳 Building and running Docker locally..."
    echo "🐳 在本地构建并运行 Docker..."
    echo ""

    # Check if Docker is installed / 检查是否安装了 Docker
    if ! command -v docker &> /dev/null; then
      echo "❌ Docker not found. Install it first:"
      echo "❌ 未找到 Docker。请先安装："
      echo "   https://docs.docker.com/get-docker/"
      exit 1
    fi

    # Build image / 构建镜像
    echo "Building Docker image / 构建 Docker 镜像..."
    docker build -t routex .

    # Stop existing container / 停止现有容器
    docker stop routex 2>/dev/null || true
    docker rm routex 2>/dev/null || true

    # Create data directory / 创建数据目录
    mkdir -p ./data

    # Run container / 运行容器
    echo "Starting container / 启动容器..."
    docker run -d \
      --name routex \
      -p 8080:8080 \
      -v $(pwd)/data:/data \
      -e LOAD_BALANCE_STRATEGY=priority \
      --restart unless-stopped \
      routex

    echo ""
    echo "✅ Container started!"
    echo "✅ 容器已启动！"
    echo ""
    echo "View logs / 查看日志:"
    echo "   docker logs -f routex"
    echo ""
    echo "Stop container / 停止容器:"
    echo "   docker stop routex"
    ;;

  6)
    echo "Exiting / 退出..."
    exit 0
    ;;

  *)
    echo "❌ Invalid choice / 无效选择"
    exit 1
    ;;
esac

echo ""
echo "✅ Deployment complete!"
echo "✅ 部署完成！"
echo ""
echo "📍 Your Routex instance should now be accessible."
echo "📍 您的 Routex 实例现在应该可以访问了。"
echo ""
echo "Next steps / 后续步骤:"
echo "1. Create your first channel / 创建您的第一个渠道"
echo "2. Configure load balancing / 配置负载均衡"
echo "3. Start routing requests / 开始路由请求"
echo ""
echo "📚 Documentation / 文档: https://github.com/dctx-team/Routex"
echo "🆘 Need help / 需要帮助: https://github.com/dctx-team/Routex/issues"
echo ""
