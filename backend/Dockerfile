# ===== 1) Build Stage =====
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Copy package.json và cài đặt CHỈ production dependencies
COPY package*.json ./
RUN npm ci --omit=dev 

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# ===== 2) Production Stage =====
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# 1. Copy toàn bộ source code vào TRƯỚC
COPY . .

# 2. Copy node_modules chuẩn từ builder đè vào SAU
COPY --from=builder /app/node_modules ./node_modules

USER node
EXPOSE 5000

CMD ["node", "src/server.js"]