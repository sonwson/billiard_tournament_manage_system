# Billiards Tournament API

Backend REST API for managing billiards tournaments with Node.js, Express, MongoDB, Mongoose, and JWT.

## Tech Stack

- Node.js
- Express.js
- MongoDB + Mongoose
- JWT authentication
- Zod validation
- Pino logging

## Project Structure

```txt
src/
  app.js
  server.js
  config/
  common/
  middlewares/
  modules/
    auth/
    users/
    players/
    tournaments/
    registrations/
    matches/
    rankings/
    statistics/
  routes/
```

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

## Environment

Main variables are defined in `.env.example`.

Required:

- `MONGO_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

## Implemented Modules

- `auth`: register, login, refresh token, logout, current profile
- `users`: admin user management, change password
- `players`: public player listing and profile management
- `tournaments`: CRUD, status updates, public listing, bracket generation
- `registrations`: tournament registration, review, cancel
- `matches`: list matches, schedule, update result, update status
- `rankings`: leaderboard, ranking history, recalculate rank positions
- `statistics`: admin dashboard, tournament stats, player stats

## Current Scope

This scaffold fully supports:

- modular controller-service-repository architecture
- JWT auth and role-based authorization
- tournament registration approval flow
- single elimination bracket generation
- match result propagation to next round
- ranking snapshot + ranking history model
- admin statistics endpoints

## Current Limitations

- bracket generation currently supports `single_elimination` only
- notification module is reserved for next phase
- no test suite yet
- no Swagger/OpenAPI file yet

## API Prefix

Default API prefix: `/api/v1`

Examples:

- `POST /api/v1/auth/register`
- `GET /api/v1/tournaments`
- `POST /api/v1/tournaments/:id/registrations`
- `PATCH /api/v1/registrations/:id/review`
- `PATCH /api/v1/matches/:id/result`
- `GET /api/v1/rankings`
- `GET /api/v1/statistics/dashboard`
