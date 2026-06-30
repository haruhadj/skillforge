FROM node:22-alpine
WORKDIR /app

# Copy server manifest + lockfile for a reproducible install
COPY server/package.json server/package-lock.json ./

RUN npm ci --omit=dev --legacy-peer-deps

# Copy server source code (wordnet db mounted as volume in compose)
COPY server/games ./server/games
COPY server/wordnet/service.js server/wordnet/sample.js ./server/wordnet/
COPY server/start-all.js ./server/

# Create empty wordnet directory for volume mount
RUN mkdir -p ./server/wordnet

# Ports actually used by the per-service commands (compose overrides `command`):
# chroma 3002, chess 3004, tictactoe 3005, spelling-bee 8787, vocab 8788, hamaru 8789.
EXPOSE 3002 3004 3005 8787 8788 8789

# Drop root — the node:alpine image ships a built-in uid-1000 `node` user. Each
# service only reads its source + the read-only WordNet volume mount.
USER node

CMD ["node", "server/start-all.js"]
