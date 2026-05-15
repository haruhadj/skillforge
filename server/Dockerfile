FROM node:22-alpine
WORKDIR /app

RUN corepack enable && pnpm config set allow-builds protobufjs

# Copy root package files first (for workspace context)
COPY package.json pnpm-lock.yaml ./

# Copy server package files on top (overwrites root package.json in WORKDIR)
COPY server/package.json server/pnpm-lock.yaml ./

RUN PNPM_IGNORE_PACKAGE_MANAGER_VERSION=true pnpm install --frozen-lockfile --prod

# Copy entire project, then overlay server files again to ensure correct package.json
COPY . .
COPY server/package.json server/pnpm-lock.yaml ./

EXPOSE 3001 3002 3004 8787

CMD ["node", "server/start-all.js"]
