#!/bin/bash
# Routex Model Selector CLI Launcher
# 启动 Routex 模型选择器

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Routex Model Selector...${NC}\n"

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo -e "${RED}Error: Bun is not installed${NC}"
    echo -e "${YELLOW}Please install Bun: https://bun.sh${NC}"
    exit 1
fi

# Set database path
export ROUTEX_DB_PATH="${ROUTEX_DB_PATH:-./data/routex.db}"

# Check if database exists
if [ ! -f "$ROUTEX_DB_PATH" ]; then
    echo -e "${YELLOW}Warning: Database not found at $ROUTEX_DB_PATH${NC}"
    echo -e "${YELLOW}A new database will be created${NC}\n"
fi

# Run the CLI
bun run src/cli/model-selector.ts
