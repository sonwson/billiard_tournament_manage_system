# ===== Stage 1: Build source code =====
FROM node:20-slim AS builder
WORKDIR /app

# 1. Copy package.json và cài đặt TOÀN BỘ dependencies (Bao gồm cả Vite để build)
COPY package*.json ./
RUN npm ci

# 2. Copy toàn bộ mã nguồn vào
COPY . .

# 3. Tiến hành build (sẽ sinh ra thư mục /dist chứa các file tĩnh)
RUN npm run build

# ===== Stage 2: Serve files bằng Nginx =====
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Xoá trang web mặc định của Nginx
RUN rm -rf ./*

# Copy các file đã build từ Stage 1 sang Nginx
COPY --from=builder /app/dist .

# Expose port 80 (Port mặc định của Nginx)
EXPOSE 80

# Chạy Nginx ở foreground
CMD ["nginx", "-g", "daemon off;"]