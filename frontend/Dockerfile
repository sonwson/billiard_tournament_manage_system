# Dockerfile cho frontend
FROM node:20-slim

WORKDIR /app

# Copy package.json và cài đặt dependencies
COPY frontend/package*.json ./
RUN npm ci --only=production

# Copy toàn bộ mã nguồn từ thư mục frontend
COPY ./frontend/ ./

# Build frontend (Vite, React, Angular, v.v.)
RUN npm run build

EXPOSE 5000

CMD ["npm", "run", "start"]