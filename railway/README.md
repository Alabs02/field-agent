# Deploying to Railway

Three services from this one repo (`api`, `worker`, `web`), Railway's Redis, and a Postgres: Railway's own plugin by default, or Neon when you pass `DATABASE_URL`.

## Scripted (recommended)

```bash
npm i -g @railway/cli          # or: brew install railway
railway login                  # opens the browser once
pnpm railway:deploy            # = bash scripts/railway-deploy.sh
```

The script is idempotent. It creates or reuses the project, adds Redis and Postgres, creates the three services with their variables, generates a public domain for `api` and `web`, wires the auth and CORS origins to those domains, and runs `railway up` for each service from your working tree. It prints the URLs and the demo sign-in at the end. First build takes about five minutes; the first scrape starts on API boot and takes about 50 minutes at the polite production delay.

To use Neon instead of Railway's Postgres:

```bash
DATABASE_URL='postgres://…-pooler.neon.tech/…' DATABASE_URL_UNPOOLED='postgres://….neon.tech/…' pnpm railway:deploy
```

## What each service runs

| Service | Dockerfile | Public? | Notes |
|---|---|---|---|
| `api` | `railway/Dockerfile.api` | yes (`/docs`, `/health`, `/admin/queues`) | runs `cli.js migrate seed` (both idempotent) before listening; listens on `::` so `web` can reach it over private networking |
| `worker` | `railway/Dockerfile.worker` | no | `SCRAPE_RESPECT_CRAWL_DELAY=true`, 60 s between requests |
| `web` | `railway/Dockerfile.web` | yes (lander at `/`, product at `/app`) | talks to the API at `http://api.railway.internal:4000`; the browser never needs the API origin except the Bull Board link |

The per-service Dockerfiles are generated from the root `Dockerfile` by `pnpm railway:dockerfiles`; Railway's builder cannot pick a multi-stage target, so each file ends in the stage it runs. `RAILWAY_DOCKERFILE_PATH` on each service selects the file.

## Variables (what the script sets)

`api`

```
RAILWAY_DOCKERFILE_PATH = railway/Dockerfile.api
NODE_ENV                = production
PORT / API_PORT         = 4000
API_HOST                = ::
DATABASE_URL            = ${{Postgres.DATABASE_URL}}   (or your Neon pooled URL)
DATABASE_URL_UNPOOLED   = <Neon direct URL, optional>
REDIS_URL               = ${{Redis.REDIS_URL}}
AUTH_REQUIRED           = true
BETTER_AUTH_SECRET      = <generated>
BETTER_AUTH_URL         = https://<api domain>
WEB_ORIGIN              = https://<web domain>
SEED_DEMO_PASSWORD      = FieldAgent-Demo-2026!   (override before running the script)
SCRAPE_ON_BOOT          = true
```

`worker`

```
RAILWAY_DOCKERFILE_PATH    = railway/Dockerfile.worker
NODE_ENV                   = production
DATABASE_URL, REDIS_URL    = as above
SCRAPE_ENGINE              = http
SCRAPE_MIN_DELAY_MS        = 60000
SCRAPE_RESPECT_CRAWL_DELAY = true
SCRAPE_JOB_TIMEOUT_MS      = 5400000
VERIFY_JOB_TIMEOUT_MS      = 1800000
```

`web`

```
RAILWAY_DOCKERFILE_PATH = railway/Dockerfile.web
NODE_ENV                = production
PORT                    = 3000
API_URL                 = http://api.railway.internal:4000
NEXT_PUBLIC_API_URL     = https://<api domain>
AUTH_REQUIRED           = true
SEED_DEMO_PASSWORD      = same as api (shown on the login page)
```

## Manual path (dashboard)

Create an empty project, add Redis and Postgres, then add three empty services and set the variables above. Under each service's Settings → Config-as-code, point at `railway/api.json`, `railway/worker.json`, or `railway/web.json` (Dockerfile path, health check, restart policy), connect the GitHub repo `Alabs02/field-agent`, and generate a domain for `api` and `web`. Order: datastores → api (wait for `/health`) → worker → web.

## After it is up

Sign in as `super.admin@fieldagent.demo`, open Runs, and watch the boot scrape. Paste the web URL into the README "Deploying" section.
