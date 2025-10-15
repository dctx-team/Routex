# Docker Deployment Example

## Dockerfile

```dockerfile
FROM oven/bun:1.2-alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source code
COPY src ./src
COPY config.example.json ./config.json

# Create data directory
RUN mkdir -p /data

# Expose port
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production
ENV DB_PATH=/data/routex.db
ENV PORT=8080
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD bun run /app/healthcheck.js || exit 1

# Run server
CMD ["bun", "run", "src/server.ts"]
```

## docker-compose.yml

```yaml
version: '3.8'

services:
  routex:
    build: .
    container_name: routex
    ports:
      - "8080:8080"
    volumes:
      - ./data:/data
      - ./config.json:/app/config.json:ro
    environment:
      - NODE_ENV=production
      - DB_PATH=/data/routex.db
      - PORT=8080
      - HOST=0.0.0.0
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

## Build and Run

```bash
# Build image
docker build -t routex:latest .

# Run container
docker run -d \
  --name routex \
  -p 8080:8080 \
  -v $(pwd)/data:/data \
  -v $(pwd)/config.json:/app/config.json:ro \
  --restart unless-stopped \
  routex:latest

# Or use docker-compose
docker-compose up -d
```

## Environment Variables

- `NODE_ENV`: Environment (production/development)
- `DB_PATH`: Database file path
- `PORT`: Server port (default: 8080)
- `HOST`: Server host (default: 0.0.0.0)

## Logs

```bash
# View logs
docker logs -f routex

# View recent logs
docker logs --tail 100 routex
```

## Health Check

```bash
# Check container health
docker ps

# Test health endpoint
curl http://localhost:8080/health
```

## Backup Database

```bash
# Backup database file
docker cp routex:/data/routex.db ./backup/routex-$(date +%Y%m%d).db

# Or if using volume
cp ./data/routex.db ./backup/routex-$(date +%Y%m%d).db
```

## Update Container

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```
