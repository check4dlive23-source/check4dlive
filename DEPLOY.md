# Deploy to Vercel (Step 10)

## Prerequisites

1. Push the project to GitHub (or GitLab / Bitbucket).
2. Create a [Vercel](https://vercel.com) account and import the repository.

## Environment variables

In **Vercel → Project → Settings → Environment Variables**, add:

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (server only) |
| `INGEST_SECRET` | Bearer token for `/api/admin/ingest` |
| `CRON_SECRET` | Optional; same value as `INGEST_SECRET` for Vercel Cron |
| `NEXT_PUBLIC_SITE_URL` | Production URL, e.g. `https://your-app.vercel.app` |

## Cron job

`vercel.json` schedules ingest at **16:05 UTC** (00:05 MYT):

```json
{
  "crons": [{ "path": "/api/admin/ingest", "schedule": "5 16 * * *" }]
}
```

On Vercel Pro, cron requests include `Authorization: Bearer <CRON_SECRET>`. Set `CRON_SECRET` equal to `INGEST_SECRET`, or configure the cron to send the Bearer header in the Vercel dashboard.

## CLI deploy

```bash
npm i -g vercel
vercel login
vercel --prod
```

## Post-deploy

1. Run `supabase/schema.sql` in Supabase SQL Editor if not done.
2. Trigger first ingest:
   ```bash
   curl.exe -X POST "https://YOUR_APP.vercel.app/api/admin/ingest" \
     -H "Authorization: Bearer YOUR_INGEST_SECRET"
   ```

## Routes

- `/` — Live terminal
- `/analytics` — Analytics dashboard
- `/draws` — Draw explorer
- `/search` — Wildcard number search
- `/number/1234` — Number intelligence
