# Render + Vercel Deployment

This project is set up for:
- Backend API on Render
- Frontend app on Vercel
- MongoDB on MongoDB Atlas
- CI on GitHub Actions
- CD through Git integrations on Render and Vercel

## Architecture
- Frontend: `frontend/` -> Vercel
- Backend: `backend/` -> Render Web Service
- Database: MongoDB Atlas

## 1. Prepare accounts
Create accounts for:
- GitHub
- Render
- Vercel
- MongoDB Atlas

## 2. Push the repository to GitHub
Push this monorepo to GitHub first. Render and Vercel will both connect to the same repo.

## 3. Create MongoDB Atlas
Create a cluster and copy the connection string.
Use database name like:
- `billiardhub`

Allow network access from Render.
The fastest option is allowing all IPs first for setup, then locking it down later.

## 4. Deploy backend to Render
Render can read `render.yaml` at the repo root.

Recommended steps:
1. In Render, choose `New +` -> `Blueprint`
2. Select your GitHub repo
3. Render will detect [`render.yaml`](D:/BilliardHub/render.yaml)
4. Fill the required environment variables:
   - `CLIENT_URL`
   - `MONGO_URI`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `SMTP_HOST`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `MAIL_FROM`
5. Deploy

After deploy, your backend URL will look like:
- `https://your-backend-name.onrender.com`

Useful backend URLs:
- `https://your-backend-name.onrender.com/health`
- `https://your-backend-name.onrender.com/docs`

## 5. Deploy frontend to Vercel
The Vercel app should use the `frontend` folder as its Root Directory.

Recommended settings in Vercel:
- Framework Preset: Vite
- Root Directory: `frontend`
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `dist`

Set this environment variable in Vercel:
- `VITE_API_BASE_URL=https://your-backend-name.onrender.com/api/v1`

The repo already includes [`frontend/vercel.json`](D:/BilliardHub/frontend/vercel.json) for SPA routing.

## 6. Update backend CORS
In Render backend env:
- `CLIENT_URL=https://your-frontend-domain.vercel.app`

If you add a custom frontend domain later, update `CLIENT_URL` again.

## 7. CI/CD flow
This repo includes GitHub Actions CI at [`.github/workflows/ci.yml`](D:/BilliardHub/.github/workflows/ci.yml).

Current behavior:
- On push to `main`: run backend lint/app load, frontend lint/build
- On pull request to `main`: run the same checks

CD behavior:
- Render auto-deploys from Git only when checks pass because `render.yaml` uses `autoDeployTrigger: checksPass`
- Vercel auto-deploys from Git after GitHub push. If you want stricter protection, require the `CI` workflow to pass before merging to `main`

## 8. Recommended production envs
### Backend on Render
- `NODE_ENV=production`
- `API_PREFIX=/api/v1`
- `APP_NAME=BilliardHub API`
- `CLIENT_URL=https://your-frontend-domain.vercel.app`
- `MONGO_URI=...`
- `JWT_ACCESS_SECRET=...`
- `JWT_REFRESH_SECRET=...`
- `JWT_ACCESS_EXPIRES_IN=15m`
- `JWT_REFRESH_EXPIRES_IN=30d`
- `ADMIN_EMAIL=...`
- `ADMIN_PASSWORD=...`
- `ADMIN_NAME=CueScore Admin`
- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=465`
- `SMTP_SECURE=true`
- `SMTP_USER=...`
- `SMTP_PASS=...`
- `MAIL_FROM=...`

### Frontend on Vercel
- `VITE_API_BASE_URL=https://your-backend-name.onrender.com/api/v1`

## 9. Recommended branch policy
For safer CD:
- protect `main`
- require GitHub Action `CI` to pass before merge
- deploy only from `main`

## 10. Notes
- Render free plans may sleep. Paid plans are better for a live score product.
- Vercel is fine for the React frontend here.
- MongoDB should stay on Atlas instead of inside Render/Vercel.
