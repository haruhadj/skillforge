# Docker Deployment Guide

> **Framework: Next.js 16 (standalone output). Frontend container runs on port 3000 internally, exposed on host port 8080.**

## Raspberry Pi 5 (ARM64) Deployment

### Prerequisites

- Raspberry Pi 5 with Docker installed
- At least 4GB RAM recommended
- Docker Compose v2+

### Setup Steps

1. **Copy project to Raspberry Pi:**
   ```bash
   # From Windows, use scp or rsync
   scp -r thesis_proj pi@raspberrypi.local:~/
   
   # Or use git clone if pushed to a repo
   git clone <your-repo-url>
   cd thesis_proj
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   nano .env  # Edit with your Firebase credentials
   ```

3. **Build and run with Docker Compose:**
   ```bash
   docker compose -f docker-compose.prod.yml up --build -d
   ```

4. **Access the application:**
   - Frontend (via Nginx Proxy Manager): your domain on port 80/443
   - Direct access (no NPM): `http://raspberrypi.local:8080`
   - Backend game servers (internal only): ports 3001 (tictactoe), 3004 (chess), 8787 (spelling-bee)

### Architecture Notes

- **Base images**: All use `node:22-alpine` (ARM64 compatible)
- **Frontend**: Next.js standalone output served by the frontend container
- **Game servers**: Individual Node.js services in the same Docker Compose stack
- **Static games**: All `public/games/` files served via Next.js public folder
- **Nginx** (`nginx/skillforge.conf`): routes `/api/*`, `/tictactoe-ws/*`, `/chess-ws/*`, `/chroma-memory-ws/*` internally — NPM only needs one proxy host on port 8080
- **Environment**: Firebase config must be baked in at build time via `NEXT_PUBLIC_*` vars in `.env`

### Troubleshooting

**Build fails on ARM64:**
```bash
# Use platform-specific build
docker compose -f docker-compose.prod.yml build --no-cache
```

**Out of memory during build:**
- Increase swap space: `sudo dphys-swapfile swapoff && sudo nano /etc/dphys-swapfile`
- Set `CONF_SWAPSIZE=2048` and restart

**Port conflicts:**
- Edit `docker-compose.prod.yml` to change port mappings
- Update game server ports in respective server files

### Updating

```bash
docker compose -f docker-compose.prod.yml down
git pull  # or copy new files
docker compose -f docker-compose.prod.yml up --build -d
```
