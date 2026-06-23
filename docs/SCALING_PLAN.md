# SkillForge Scaling Plan


---

## Phase 4 — Infrastructure Hardening

> Only needed once user count is meaningful enough to justify the ops overhead.

- [ ] Add Redis adapter to Socket.IO servers (enables horizontal scaling of Chess/TicTacToe/Chroma Memory)
- [ ] Set up a CDN (Cloudflare or similar) in front of nginx for static game assets
- [ ] Add structured logging (Pino/Winston) to all game servers
- [ ] Set up uptime monitoring (Betterstack / UptimeRobot) for each service endpoint
- [ ] Add rate limiting to the Spelling Bee and Vocab API endpoints
- [ ] CI/CD pipeline: auto-deploy on merge to main (GitHub Actions → SSH → `docker compose pull && up -d`)

---

