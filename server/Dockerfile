FROM node:22-alpine
WORKDIR /app

# Copy server package.json
COPY server/package.json ./

RUN npm install --omit=dev --legacy-peer-deps

# Copy server source code (wordnet db mounted as volume in compose)
COPY server/games ./server/games
COPY server/wordnet/service.js ./server/wordnet/
COPY server/start-all.js ./server/

# Create empty wordnet directory for volume mount
RUN mkdir -p ./server/wordnet

EXPOSE 3001 3002 3004 3005 8787 8788

CMD ["node", "server/start-all.js"]
