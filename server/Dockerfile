FROM node:22-alpine
WORKDIR /app

RUN corepack enable

# Copy root package files first (for workspace context)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy server package files on top (overwrites root package.json in WORKDIR)
COPY server/package.json server/pnpm-lock.yaml ./

RUN PNPM_IGNORE_PACKAGE_MANAGER_VERSION=true pnpm install --frozen-lockfile --prod

# Copy server source code (wordnet db mounted as volume in compose)
COPY server/games ./server/games
COPY server/wordnet/service.js ./server/wordnet/
COPY server/start-all.js ./server/

# Create empty wordnet directory for volume mount
RUN mkdir -p ./server/wordnet

EXPOSE 3001 3002 3004 3005 8787 8788

CMD ["node", "server/start-all.js"]
