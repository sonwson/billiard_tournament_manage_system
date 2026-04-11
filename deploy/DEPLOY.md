# Deployment Guide

This project is ready to deploy with Docker Compose.

## Stack
- Frontend: Vite + React served by Nginx
- Backend: Node.js + Express
- Database: MongoDB
- Single public entrypoint: port 80
- API reverse proxy: `/api/v1` is proxied by Nginx to the backend container

## Files
- `frontend/Dockerfile`
- `frontend/deploy/nginx.conf`
- `backend/Dockerfile`
- `docker-compose.prod.yml`
- `deploy/.env.prod.example`

## 1. Prepare production environment file
Create a `.env` file next to `docker-compose.prod.yml` from `deploy/.env.prod.example`.

Example:
```env
APP_PUBLIC_URL=http://your-domain.com
MONGO_URI=mongodb://mongo:27017/billiards_tournament
JWT_ACCESS_SECRET=replace_with_a_long_random_secret
JWT_REFRESH_SECRET=replace_with_a_second_long_random_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
MAIL_FROM=your_email@gmail.com
ADMIN_EMAIL=admin@cuescore.local
ADMIN_PASSWORD=Admin@123456
ADMIN_NAME=CueScore Admin
```

If you use MongoDB Atlas, replace `MONGO_URI` with your Atlas connection string.

## 2. Build and start
From the project root:
```bash
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
```

## 3. Access the app
- Frontend: `http://YOUR_SERVER_IP_OR_DOMAIN`
- API health: `http://YOUR_SERVER_IP_OR_DOMAIN/health`
- Swagger docs: `http://YOUR_SERVER_IP_OR_DOMAIN/docs`

## 4. Seed the admin account
If you want to seed the admin manually:
```bash
docker compose --env-file .env -f docker-compose.prod.yml exec backend npm run seed:admin
```

## 5. Useful commands
View logs:
```bash
docker compose --env-file .env -f docker-compose.prod.yml logs -f
```

Restart services:
```bash
docker compose --env-file .env -f docker-compose.prod.yml restart
```

Stop services:
```bash
docker compose --env-file .env -f docker-compose.prod.yml down
```

## Notes
- The frontend uses relative API path `/api/v1`, so it works behind the included Nginx reverse proxy.
- For public QR links and password-reset links, `APP_PUBLIC_URL` should be your real public URL.
- On a VPS, open inbound port `80`.
- For HTTPS, place Nginx/Traefik/Caddy in front of this stack or extend the current Nginx config with TLS.
