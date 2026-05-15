# Docker Deployment Guide

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
   - Frontend: http://raspberrypi.local:3000
   - Game servers run on ports 3001, 3002, 3004, 8787

### Architecture Notes

- **Base images**: All use `node:22-alpine` which supports ARM64
- **Frontend**: Next.js with standalone output for production
- **Game servers**: Individual Node.js services
- **Static games** (Jose Rizal, etc.): Served via Next.js public folder

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
