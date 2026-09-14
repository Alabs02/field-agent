# Deploying to Railway

Three services from this one repo, plus Railway's Redis plugin and a Neon Postgres database.

| Service | Config file (Settings → Config-as-code) | Public? |
|---|---|---|
| `api` | `railway/api.json` | yes (docs, health, Bull Board) |
| `worker` | `railway/worker.json` | no |
| `web` | `railway/web.json` | yes (the product and the lander) |

The per-service Dockerfiles are generated from the root `Dockerfile` by `node scripts/gen-railway-dockerfiles.mjs`; Railway's builder cannot pick a multi-stage target, so each file ends in the stage it runs.

## Variables

`api`

```
DATABASE_URL           = <Neon pooled connection string>
DATABASE_URL_UNPOOLED  = <Neon direct connection string>   # used by the pre-deploy migrate
REDIS_URL              = ${{Redis.REDIS_URL}}
NODE_ENV               = production
AUTH_REQUIRED          = true
BETTER_AUTH_SECRET     = <openssl rand -base64 32>
BETTER_AUTH_URL        = https://<api public domain>
WEB_ORIGIN             = https://<web public domain>
SEED_DEMO_PASSWORD     = <choose>
SCRAPE_ON_BOOT         = true
PORT                   = 4000
```

`worker`

```
DATABASE_URL, REDIS_URL, NODE_ENV=production
SCRAPE_MIN_DELAY_MS        = 60000     # the production posture: honor robots Crawl-delay
SCRAPE_RESPECT_CRAWL_DELAY = true
SCRAPE_JOB_TIMEOUT_MS      = 5400000
```

`web`

```
API_URL             = http://api.railway.internal:4000   # private networking
NEXT_PUBLIC_API_URL = https://<api public domain>         # Bull Board link from the admin page
AUTH_REQUIRED       = true
PORT                = 3000
```

Order: Redis + Neon → api (wait for `/health`) → worker → web. Then sign in as `super.admin@fieldagent.demo` and run a scrape from the Runs page. The first full run takes ~50 minutes at the polite production delay.
