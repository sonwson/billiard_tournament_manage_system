FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY . .
COPY --from=builder /app/node_modules ./node_modules

USER node
EXPOSE 5000

CMD ["node", "src/server.js"]
