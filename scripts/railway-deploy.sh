#!/usr/bin/env bash
#
# One-shot Railway deploy: api + worker + web from this repo, Railway's Redis,
# and Railway's Postgres (or a Neon database if DATABASE_URL is set).
#
#   railway login                       # once, in your browser
#   bash scripts/railway-deploy.sh      # everything else
#
# Re-running is safe: existing services are reused, variables are re-applied,
# and each service is redeployed from the current working tree.
#
# Optional environment:
#   RAILWAY_PROJECT_NAME   project to create or link (default: field-agent)
#   DATABASE_URL           use an external Postgres (Neon pooled URL) instead of the Railway plugin
#   DATABASE_URL_UNPOOLED  Neon direct URL for migrations (optional)
#   BETTER_AUTH_SECRET     default: generated
#   SEED_DEMO_PASSWORD     default: FieldAgent-Demo-2026!
#   SCRAPE_MIN_DELAY_MS    default: 60000 (the production posture: honor Crawl-delay)
#   WEB_DOMAIN_LABEL       default: field-agent      → https://field-agent.up.railway.app
#   API_DOMAIN_LABEL       default: field-agent-api  → https://field-agent-api.up.railway.app
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT="${RAILWAY_PROJECT_NAME:-field-agent}"
DEMO_PW="${SEED_DEMO_PASSWORD:-FieldAgent-Demo-2026!}"
DELAY="${SCRAPE_MIN_DELAY_MS:-60000}"
SECRET="${BETTER_AUTH_SECRET:-$(node -e 'console.log(require("crypto").randomBytes(32).toString("base64"))')}"

log()  { printf '\n\033[1;35m▸ %s\033[0m\n' "$*"; }
need() { command -v "$1" >/dev/null 2>&1 || { echo "missing: $1" >&2; exit 1; }; }
need railway; need node

railway whoami >/dev/null 2>&1 || { echo "Not signed in. Run: railway login" >&2; exit 1; }

# --- project ---------------------------------------------------------------
if railway status --json >/dev/null 2>&1; then
  log "Using linked project: $(railway status --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).name??"?"))')"
else
  log "Creating project $PROJECT"
  railway init --name "$PROJECT"
fi

has_service() { railway service list --json 2>/dev/null | grep -q "\"name\": *\"$1\"" ; }

# --- datastores --------------------------------------------------------------
if has_service Redis; then log "Redis already present"; else log "Adding Redis"; railway add --database redis; fi

if [ -n "${DATABASE_URL:-}" ]; then
  DB_URL="$DATABASE_URL"
  DB_URL_UNPOOLED="${DATABASE_URL_UNPOOLED:-}"
  log "Using external Postgres from DATABASE_URL"
else
  if has_service Postgres; then log "Postgres already present"; else log "Adding Postgres"; railway add --database postgres; fi
  DB_URL='${{Postgres.DATABASE_URL}}'
  DB_URL_UNPOOLED=""
fi
REDIS_REF='${{Redis.REDIS_URL}}'

# --- services -----------------------------------------------------------------
ensure_service() {
  local name="$1"; shift
  if has_service "$name"; then
    log "Service $name exists; re-applying variables"
    railway variable set --service "$name" --skip-deploys "$@"
  else
    log "Creating service $name"
    local args=()
    for kv in "$@"; do args+=(--variables "$kv"); done
    railway add --service "$name" "${args[@]}"
  fi
}

ensure_service api \
  "RAILWAY_DOCKERFILE_PATH=railway/Dockerfile.api" \
  "NODE_ENV=production" "PORT=4000" "API_PORT=4000" "API_HOST=::" \
  "DATABASE_URL=$DB_URL" "DATABASE_URL_UNPOOLED=$DB_URL_UNPOOLED" "REDIS_URL=$REDIS_REF" \
  "AUTH_REQUIRED=true" "BETTER_AUTH_SECRET=$SECRET" "SEED_DEMO_PASSWORD=$DEMO_PW" \
  "SCRAPE_ON_BOOT=true" "VERIFY_SAMPLE_RATE=0.2" "PORTAL_ID=briargate"

ensure_service worker \
  "RAILWAY_DOCKERFILE_PATH=railway/Dockerfile.worker" \
  "NODE_ENV=production" \
  "DATABASE_URL=$DB_URL" "REDIS_URL=$REDIS_REF" "PORTAL_ID=briargate" \
  "SCRAPE_ENGINE=http" "SCRAPE_MIN_DELAY_MS=$DELAY" "SCRAPE_RESPECT_CRAWL_DELAY=true" \
  "SCRAPE_JOB_TIMEOUT_MS=5400000" "VERIFY_JOB_TIMEOUT_MS=1800000" "VERIFY_SAMPLE_RATE=0.2" \
  "SCRAPE_USER_AGENT=FieldAgentBot/0.1 (+https://github.com/Alabs02/field-agent; alabson.inc@gmail.com)"

ensure_service web \
  "RAILWAY_DOCKERFILE_PATH=railway/Dockerfile.web" \
  "NODE_ENV=production" "PORT=3000" "HOSTNAME=0.0.0.0" \
  "API_URL=http://api.railway.internal:4000" "AUTH_REQUIRED=true" "SEED_DEMO_PASSWORD=$DEMO_PW"

# --- public domains -------------------------------------------------------------
domain_of() {
  local svc="$1" port="$2"
  local d
  d="$(railway domain list --service "$svc" --json 2>/dev/null | grep -oE '[a-z0-9-]+\.up\.railway\.app' | head -1 || true)"
  if [ -z "$d" ]; then
    d="$(railway domain --service "$svc" --port "$port" --json 2>/dev/null | grep -oE '[a-z0-9-]+\.up\.railway\.app' | head -1 || true)"
  fi
  [ -n "$d" ] || { echo "could not obtain a domain for $svc" >&2; exit 1; }
  echo "$d"
}
log "Public domains"
API_DOMAIN="$(domain_of api 4000)"
WEB_DOMAIN="$(domain_of web 3000)"

# Prefer readable labels over the generated "web-production-1a2b" ones. A
# taken label is not fatal: the generated domain stays.
rename_domain() {
  local svc="$1" current="$2" label="$3"
  [ "$current" = "$label.up.railway.app" ] && { echo "$current"; return; }
  if railway domain update "$current" --service "$svc" --domain "$label" >/dev/null 2>&1; then
    echo "$label.up.railway.app"
  else
    echo "$current"
  fi
}
API_DOMAIN="$(rename_domain api "$API_DOMAIN" "${API_DOMAIN_LABEL:-field-agent-api}")"
WEB_DOMAIN="$(rename_domain web "$WEB_DOMAIN" "${WEB_DOMAIN_LABEL:-field-agent}")"
echo "  api  https://$API_DOMAIN"
echo "  web  https://$WEB_DOMAIN"

railway variable set --service api --skip-deploys "BETTER_AUTH_URL=https://$API_DOMAIN" "WEB_ORIGIN=https://$WEB_DOMAIN"
railway variable set --service web --skip-deploys "NEXT_PUBLIC_API_URL=https://$API_DOMAIN" "NEXT_PUBLIC_WEB_URL=https://$WEB_DOMAIN"

# --- deploy -----------------------------------------------------------------------
for svc in api worker web; do
  log "Deploying $svc"
  railway up --service "$svc" --detach
done

cat <<EOF

Done. Railway is building the three images now (about 5 minutes).

  web   https://$WEB_DOMAIN          (lander at /, product at /app)
  api   https://$API_DOMAIN/docs
  logs  railway service logs --service api

Sign in with super.admin@fieldagent.demo / $DEMO_PW
The first scrape starts on boot and takes ~50 minutes at the polite ${DELAY}ms delay.
Add the web URL to README "Deploying" when it is up.
EOF
