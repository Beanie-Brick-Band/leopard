#!/bin/bash

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo ""
  echo "❌ Docker is not running!"
  echo ""
  echo "Please start Docker and try again:"
  echo "  - On macOS: Open Docker Desktop or OrbStack"
  echo "  - On Linux: Run 'sudo systemctl start docker'"
  echo ""
  exit 1
fi

# Check if reverse-proxy is already running
if docker ps --filter name=reverse-proxy --filter status=running -q | grep -q .; then
  echo "✓ Reverse proxy is already running"
  exit 0
fi

# Remove any stopped reverse-proxy containers
if docker ps -a --filter name=reverse-proxy -q | grep -q .; then
  echo "Cleaning up stopped reverse-proxy container..."
  docker rm -f reverse-proxy > /dev/null 2>&1
fi

# Start the reverse proxy
echo "Starting reverse proxy..."
docker compose up -d
