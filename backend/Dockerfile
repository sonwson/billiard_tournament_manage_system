# ===== 1) Build Stage =====
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Copy package.json và cài đặt CHỈ production dependencies
COPY package*.json ./
RUN npm ci --omit=dev 

# ===== 2) Production Stage =====
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy node_modules từ stage builder sang
COPY --from=builder /app/node_modules ./node_modules

# Copy source code của ứng dụng
COPY . .

# Chuyển sang user 'node' để tăng cường bảo mật (Không chạy bằng root)
USER node

EXPOSE 5000

CMD ["node", "src/server.js"]