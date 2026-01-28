# Development Reverse Proxy

This package provides a local reverse proxy for Coder workspaces during development.

## Usage

```bash
# Start the proxy
pnpm --filter @package/dev-proxy start

# Stop the proxy
pnpm --filter @package/dev-proxy stop

# View logs
pnpm --filter @package/dev-proxy logs

# Check status
pnpm --filter @package/dev-proxy status
```

## What it does

- Proxies `http://coder.localhost` to `https://coder.nolapse.tech`
- Handles cookie setting for local development
- Supports WebSocket connections for VS Code terminals

## Files

- `docker-compose.yml` - Docker Compose configuration
- `nginx.conf` - Nginx reverse proxy configuration
- `set-coder-cookie.html` - Cookie-setting bridge page

See `/docs/content/docs/coder-reverse-proxy.mdx` for complete documentation.
