FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ tar && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN mkdir -p /data/storage /data/uploads /data/backups && chown -R node:node /data /app
USER node
ENV PORT=3000 DB_PATH=/data/devmarket.sqlite STORAGE_DIR=/data/storage UPLOADS_DIR=/data/uploads BACKUP_DIR=/data/backups
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/server.js"]
