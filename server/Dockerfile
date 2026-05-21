FROM node:22-alpine
WORKDIR /app

RUN corepack enable

# Copy root package files first (for workspace context)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy server package files on top (overwrites root package.json in WORKDIR)
COPY server/package.json server/pnpm-lock.yaml ./

RUN PNPM_IGNORE_PACKAGE_MANAGER_VERSION=true pnpm install --frozen-lockfile --prod

# Copy WordNet database
COPY server/wordnet/oewn-2025-sqlite-2.3.2.sqlite ./server/wordnet/

# Copy entire project, then overlay server files again to ensure correct package.json
COPY . .
COPY server/package.json server/pnpm-lock.yaml ./

# Re-copy WordNet database to ensure it's in the correct location after COPY . .
COPY server/wordnet/oewn-2025-sqlite-2.3.2.sqlite ./server/wordnet/

EXPOSE 3001 3002 3004 3005 8787 8788

CMD ["node", "server/start-all.js"]
