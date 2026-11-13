#!/usr/bin/env bash
# Inside the stand-in host, while it is still ONLINE: the stand-in bucket image and certificate,
# the stand-in production database and its two dumps. Nothing here is a runbook step.
#
# The stand-in "production" database is what the dead deployment most plausibly holds: the
# schema built by the migrations of the checkout <ref> names, then seed/standin_seed.py, which
# writes every table family the restore and the train touch with fictional data.
#   restore rehearsal: <ref> is main (the stand-in origin's main: the ref under rehearsal), the
#                      code it deploys
#   train rehearsal:   <ref> is drain-image, the code production runs until the train. Seeding at
#                      main's head would make the dump newer than drain-image as soon as a train
#                      row carries a migration (the binding review's finding 3)
# Production was deployed at 0046 on 2026-08-02 (docs/RUNBOOK-BACKUPS.md:141), the head of both
# today; P0a item 4 settles the real dump's head. The dump's head is written to names.env as
# SEED_HEAD (the source's alembic_version, checked against CLAUDE.md at that checkout). It is dumped twice:
#   nightly form  - the backup job's own function, core/backup.py dump_database():
#                   pg_dump --format=custom --schema=public --no-owner --no-privileges
#                   (the R2 nightly dumps, the hourly and post-drain dumps, P0a's case-a dump)
#   B5 form       - `pg_dump -U fixflow_app -d fixflow --format=custom`, the runbook's own form
#                   for the pre-drain snapshot (8.2) and the pre-restore copy (6.6 b): no
#                   --schema, owners and grants kept
# and the Appendix B facts of the source are written as dumpfacts-standin.txt, the counterpart
# of P0a's verify-dump.sh output that runbook 6.8 compares against.
set -u
KIT=/srv/l4/kit
OUT=/srv/l4/out
REF="${1:-main}"
mkdir -p "$OUT" /srv/l4/dumps /srv/l4/s3certs
log() { echo "prep: $*"; }

# --- 1. the stand-in bucket: moto's S3 server, pinned, with a TLS certificate for the hostname
#        the app builds from the stand-in account id `l4lab`
if [ -z "$(docker image ls -q l4/s3:moto-5.0.28)" ]; then
  mkdir -p /srv/l4/s3img
  printf 'FROM python:3.12-slim\nRUN pip install --no-cache-dir "moto[server]==5.0.28"\nENTRYPOINT ["moto_server"]\n' > /srv/l4/s3img/Dockerfile
  docker build -q -t l4/s3:moto-5.0.28 /srv/l4/s3img >/dev/null || { log "s3 image build failed"; exit 1; }
fi
if [ ! -s /srv/l4/s3certs/s3.pem ]; then
  (
    cd /srv/l4/s3certs || exit 1
    openssl req -x509 -newkey rsa:2048 -nodes -days 7 -subj "/CN=L4 stand-in CA" \
      -keyout ca.key -out ca.pem 2>/dev/null
    openssl req -newkey rsa:2048 -nodes -subj "/CN=l4lab.r2.cloudflarestorage.com" \
      -keyout s3.key -out s3.csr 2>/dev/null
    printf 'subjectAltName=DNS:l4lab.r2.cloudflarestorage.com,DNS:*.l4lab.r2.cloudflarestorage.com\n' > san.ext
    openssl x509 -req -in s3.csr -CA ca.pem -CAkey ca.key -CAcreateserial -days 7 \
      -extfile san.ext -out s3.pem 2>/dev/null
    chmod 0644 ca.pem s3.pem s3.key
  )
  log "stand-in CA and bucket certificate made (valid 7 days, this host only)"
fi

# --- 2. a clone of the code the seed runs with
rm -rf /srv/prep && git clone -q /srv/origin.git /srv/prep && git -C /srv/prep checkout -q "$REF" \
  || { log "clone of $REF failed"; exit 1; }
PREP_SHA="$(git -C /srv/prep rev-parse HEAD)"
docker build -q -t l4/seed-backend:"$PREP_SHA" /srv/prep/backend >/dev/null || { log "backend build failed"; exit 1; }
log "seed image built from $REF ($PREP_SHA)"

# --- 3. the stand-in production database
docker rm -f l4-standin-db >/dev/null 2>&1
docker network rm l4seed >/dev/null 2>&1
docker network create l4seed >/dev/null
PGPW="$(openssl rand -hex 24)"; APPPW="$(openssl rand -hex 24)"
docker run -d --name l4-standin-db --network l4seed -e POSTGRES_USER=postgres -e POSTGRES_DB=fixflow \
  -e POSTGRES_PASSWORD="$PGPW" -e FIXFLOW_APP_DB_PASSWORD="$APPPW" \
  -v /srv/prep/ops/selfhost/postgres/initdb:/docker-entrypoint-initdb.d:ro postgres:17-bookworm >/dev/null
for i in $(seq 1 60); do
  docker exec l4-standin-db pg_isready -h 127.0.0.1 -U postgres -q 2>/dev/null && break; sleep 1
done
sleep 2
URL="postgresql+asyncpg://fixflow_app:$APPPW@l4-standin-db:5432/fixflow"
chmod 0777 /srv/l4/dumps
seedrun() {
  docker run --rm --network l4seed -e FIXFLOW_DATABASE_URL="$URL" -e FIXFLOW_ENVIRONMENT=dev -e PYTHONPATH=/code \
    -e FIXFLOW_JWT_SECRET="$(openssl rand -hex 32)" -v "$KIT/seed:/seed:ro" -v /srv/l4/dumps:/dumps \
    --entrypoint sh l4/seed-backend:"$PREP_SHA" -c "$1"
}
seedrun 'alembic upgrade head' > "$OUT/prep-alembic.log" 2>&1 || { log "alembic failed"; tail "$OUT/prep-alembic.log"; exit 1; }
SEED_HEAD="$(docker exec l4-standin-db psql -U fixflow_app -d fixflow -tAc 'select version_num from alembic_version')"
CLAUDE_HEAD="$(git -C /srv/prep show HEAD:CLAUDE.md | grep -o 'head = \*\*[0-9]\{4\}\*\*' | head -n 1 | grep -o '[0-9]\{4\}')"
[ "$SEED_HEAD" = "$CLAUDE_HEAD" ] || echo "lab: the seed's database is at $SEED_HEAD, CLAUDE.md at $REF says $CLAUDE_HEAD" >> "$OUT/deviations.log"
log "seed database at head $SEED_HEAD (CLAUDE.md at $REF: $CLAUDE_HEAD)"
seedrun 'cd /code && python /seed/standin_seed.py' > "$OUT/prep-seed.log" 2>&1 || { log "seed failed"; tail -20 "$OUT/prep-seed.log"; exit 1; }
log "seeded: $(grep -c '=' "$OUT/prep-seed.log") lines of counts (prep-seed.log)"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
NIGHTLY="fixflow-db-$STAMP.dump"
B5="standin-b5-$STAMP.pgdump"
seedrun "cd /code && python -c \"
import asyncio
from app.core.backup import dump_database, libpq_dsn
from app.core.config import settings
open('/dumps/$NIGHTLY', 'wb').write(asyncio.run(dump_database(libpq_dsn(settings.database_url))))
\"" > "$OUT/prep-dump-nightly.log" 2>&1 || { log "nightly-form dump failed"; cat "$OUT/prep-dump-nightly.log"; exit 1; }
docker exec l4-standin-db pg_dump -U fixflow_app -d fixflow --format=custom > "/srv/l4/dumps/$B5" \
  || { log "B5-form dump failed"; exit 1; }
chmod 0755 /srv/l4/dumps; chmod 0644 /srv/l4/dumps/*

# the source's own facts (Appendix B, from the checkout), like P0a's dumpfacts-<stamp>.txt
docker cp /srv/prep/ops/selfhost/sql/appendix-b.sql l4-standin-db:/tmp/appendix-b.sql
docker exec l4-standin-db psql -U fixflow_app -d fixflow -v ON_ERROR_STOP=1 -f /tmp/appendix-b.sql \
  > "$OUT/dumpfacts-standin.txt" 2>&1 || { log "appendix B on the source failed"; exit 1; }
docker exec l4-standin-db psql -U fixflow_app -d fixflow -tA -c \
  "select (select last_seq from dispatch_cursor where consumer='whatsapp'), (select max(seq) from job_event)" \
  > "$OUT/source-cursor.txt"
( cd /srv/l4/dumps && sha256sum "$NIGHTLY" "$B5" ) > "$OUT/dumps.sha256"
for f in "$NIGHTLY" "$B5"; do
  docker exec -i l4-standin-db sh -c 'cat > /tmp/d && pg_restore -l /tmp/d' < "/srv/l4/dumps/$f" > "$OUT/toc-$f.txt"
done
printf 'NIGHTLY=%s\nB5=%s\nSEED_SHA=%s\nSEED_REF=%s\nSEED_HEAD=%s\n' "$NIGHTLY" "$B5" "$PREP_SHA" "$REF" "$SEED_HEAD" > /srv/l4/dumps/names.env
log "dumps: $NIGHTLY ($(stat -c %s "/srv/l4/dumps/$NIGHTLY") B, $(grep -c 'TABLE DATA' "$OUT/toc-$NIGHTLY.txt") TABLE DATA), $B5 ($(stat -c %s "/srv/l4/dumps/$B5") B, $(grep -c 'TABLE DATA' "$OUT/toc-$B5.txt") TABLE DATA)"
log "source cursor|max(seq): $(cat "$OUT/source-cursor.txt")"

docker rm -f l4-standin-db >/dev/null; docker network rm l4seed >/dev/null
