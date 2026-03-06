FROM oven/bun:1 AS builder
WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install

COPY . .
RUN bun run build

# Pre-compress all compressible assets
# - zopfli: better gzip (.gz) — slower to compress, faster to decompress than standard gzip
# - brotli: best quality (.br)
# - zstd: ultra compression (.zst)
RUN apt-get update -qq \
  && apt-get install -y --no-install-recommends brotli zstd zopfli \
  && rm -rf /var/lib/apt/lists/* \
  && find /app/public -type f \( \
       -name "*.js" -o -name "*.css" -o -name "*.html" \
       -o -name "*.svg" -o -name "*.json" \
       -o -name "*.woff2" -o -name "*.woff" \
     \) | while read f; do \
       brotli --best --keep "$f"; \
       zopfli --gzip --i30 "$f"; \
       zstd --ultra -22 --keep -q "$f"; \
     done

FROM oven/bun:1-slim
WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder /app/server ./server
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 8080
CMD ["bun", "run", "server/index.ts"]