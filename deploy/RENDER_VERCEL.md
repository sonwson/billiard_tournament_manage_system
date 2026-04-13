# Render + Vercel Deploy Checklist

## GitHub
- Repository: `sonwson/billiard_tournament_mannage_system`
- Production branch: `master`
- GitHub Actions workflow: `.github/workflows/ci.yml`

## Backend on Render
- Root Directory: `backend`
- Build Command: `npm ci`
- Start Command: `npm start`
- Branch: `master`
- Auto Deploy: `After CI Checks Pass`

### Required backend environment variables
- `NODE_ENV=production`
- `API_PREFIX=/api/v1`
- `CLIENT_URL=https://<your-frontend-domain>.vercel.app`
- `MONGO_URI=<your-mongodb-atlas-uri>`
- `JWT_ACCESS_SECRET=<strong-random-secret>`
- `JWT_REFRESH_SECRET=<strong-random-secret>`
- `MAIL_PROVIDER=resend`
- `RESEND_API_KEY=<your-resend-api-key>`
- `MAIL_FROM=BilliardHub <onboarding@resend.dev>`

## Frontend on Vercel
- Root Directory: `frontend`
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Branch: `master`

### Required frontend environment variable
- `VITE_API_BASE_URL=https://billiard-tournament-manage-system.onrender.com/api/v1`

## Important notes
- Vercel does not use local `.env` files from your machine.
- Render does not use local `.env` files from your machine.
- After changing environment variables, redeploy the service.
- If UI still shows old content after deploy, hard refresh with `Ctrl + F5`.
