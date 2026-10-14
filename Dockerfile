# Stage 1: build Tailwind CSS (public/styles.css is gitignored)
FROM node:22-slim AS css
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tailwind.config.js ./
COPY src/ ./src/
COPY public/ ./public/
RUN npm run css:build

# Stage 2: runtime — zero dependencies, pure Node built-ins
FROM node:22-slim
WORKDIR /app

COPY server.ts types.ts ./
COPY server/ ./server/
COPY public/ ./public/
COPY --from=css /app/public/styles.css ./public/styles.css
# Fallback catalog so the image also runs without the compose volume mount
COPY catalog/index.json ./catalog/index.json

ENV PORT=3000 \
    VIDEO_ROOT=/app/videos
EXPOSE 3000

USER node
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/videos').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "server.ts"]
