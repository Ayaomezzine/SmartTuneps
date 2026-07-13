# Netlify Setup

## 1. Import the repo
Connect GitHub and select `Ayaomezzine/SmartTuneps`.

## 2. Set environment variables
Add these in Netlify Site Settings > Environment variables:

- `DATABASE_URL` = hosted Postgres connection string
- `JWT_SECRET` = long random secret
- `CRON_SECRET` = long random secret used by the daily job
- `PUBLIC_APP_URL` = your Netlify site URL
- `NEXT_PUBLIC_APP_NAME` = `Smart TUNEPS`

## 3. Deploy
Netlify will use `netlify.toml` and run `npm run build`.

## 4. Scheduler
The scheduled function runs daily at 06:00 using `netlify/functions/daily-refresh.ts`.

## Important
This app should not use SQLite in production on Netlify. Switch `DATABASE_URL` to Postgres before relying on logins and daily refreshes.
