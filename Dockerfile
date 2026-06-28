FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.26.1 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.base.json ./
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/
COPY scripts/package.json ./scripts/package.json

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @workspace/api-server run build

FROM node:20-alpine AS runner

RUN addgroup -S chatcart && adduser -S chatcart -G chatcart

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/artifacts/api-server/node_modules ./artifacts/api-server/node_modules
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist

RUN mkdir -p /data/wa-session && chown chatcart:chatcart /data/wa-session

USER chatcart

ENV NODE_ENV=production
ENV PORT=8080
ENV WA_SESSION_DIR=/data/wa-session

EXPOSE 8080

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
