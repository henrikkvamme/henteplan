FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1-alpine
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app && mkdir -p data && chown app:app data

COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src

USER app

ENV PORT=4000
EXPOSE 4000

CMD ["bun", "run", "src/index.ts"]
