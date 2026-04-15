# ===== Stage 1: Build source code =====
FROM node:20-slim AS builder
WORKDIR /app

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# 1. Copy package.json và cài đặt TOÀN BỘ dependencies
COPY package*.json ./
RUN npm ci

# 2. Copy toàn bộ mã nguồn vào
COPY . .

# 3. Tiến hành build
RUN npm run build

# ===== Stage 2: Serve files bằng Nginx =====
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

RUN rm -rf ./*
COPY --from=builder /app/dist .
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]