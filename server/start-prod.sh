#!/usr/bin/env bash
set -e

# Production start script: build client + server, then (re)launch via PM2 on port 5173.
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_DIR="$ROOT_DIR/server"
CLIENT_DIR="$ROOT_DIR/client"

echo "==> Building client"
cd "$CLIENT_DIR"
npm ci
npm run build

echo "==> Building server"
cd "$SERVER_DIR"
npm ci
npm run build

echo "==> Launching via PM2"
mkdir -p "$SERVER_DIR/logs"
pm2 reload ecosystem.config.cjs || pm2 start ecosystem.config.cjs
pm2 save

echo "==> Done. App on port 5173."
