# P0a pre-flight kit: what to run, in what order

Five Git Bash scripts for the owner. They save what can be saved today, from this laptop, with
your own credentials. They talk to no service on their own: you supply the keys, in the shell.
Start every session with `export MSYS_NO_PATHCONV=1`. Every script accepts `--dry-run`, which
prints each command and runs nothing: look at that first.

Results go in `docs/program/W0-results.md` (the P0a table). Everything the scripts write stays
outside the repository: `C:/fixflow-r2/`, `C:/fixflow-dumps/`, `C:/fixflow-phones/`, each run
adding a timestamped log there. Keys are read from environment variables only; the scripts never
print them, never write them to a file, never take them as arguments.

## Order

1. **Item 1, the fleet hold notice, first and by hand.** Tell every technician not to open the app.
   Nothing below needs a phone to be opened; it must stay that way.
2. **`tools-check.sh`** (item 10). Shows what is missing (adb, apksigner, a JDK, eas). Install the
   missing ones, run it again until the lines you need say "present". `FF_ADB` and `FF_APKSIGNER`
   point it at tools that are not on the PATH.
3. **Item 2, Railway, by hand.** Copy the old `FIXFLOW_JWT_SECRET` and seal it, cut any surviving
   service off the database, reset the Supabase database password. Do this before the dump if you
   can; after the password reset, take the new password for the dump.
4. **`r2-archive.sh <account-id> <bucket>`** (item 3). Needs `AWS_ACCESS_KEY_ID` and
   `AWS_SECRET_ACCESS_KEY` (an R2 API token). Copies the old backups to `archive/pre-selfhost/`
   inside the bucket (nothing is deleted), downloads a copy to `C:/fixflow-r2/`, and compares the
   three by name and size. It proves the archive and the laptop copy hold every old backup. It
   stops with FAIL if they do not.
5. **`supabase-dump.sh`** (item 4). Needs `FIXFLOW_SUPABASE_URL`, the session-pooler string (port
   5432, never 6543). Dumps to `C:/fixflow-dumps/supabase-<date>.dump`, prints the checksum and
   size, then calls `verify-dump.sh`. Add `--upload <account-id> <bucket>` (with the AWS variables)
   to also copy it to `archive/pre-selfhost/`.
6. **`verify-dump.sh <dump>`** runs by itself too (a dashboard download, or any dump). It restores
   into a throwaway Postgres 17 and runs the fixed read-only queries. Success is two lines:
   `RESTORE EXIT=0` and `QUERIES EXIT=0`; the query output is in `C:/fixflow-dumps/logs/dumpfacts-*.txt`.
   Paste that output into the W0 item 4 row. A plain-SQL file is converted to a custom-format dump
   (`<name>.public.dump`) and that one is verified. "Project restored" alone does not satisfy item 4.
7. **`phone-facts.sh [serial]`**, once per phone with USB debugging on (items 5 and 6). It copies
   `base.apk` off the phone and prints the signing certificate, versionCode and name, whether the
   bundle contains `jobs.outbox.v2`, the API host, and the phone's model and Android version, then
   one table row to paste into the roster.

## What each script proves, and what it does not

- `r2-archive.sh`: the old backups exist in two more places. Not that a backup restores.
- `supabase-dump.sh` plus `verify-dump.sh`: the dump restores into a clean Postgres 17 and what it
  holds. This is the evidence item 4 needs.
- `phone-facts.sh`: which build each phone runs and which key signed it. The comparison with the
  EAS keystore certificate (`eas credentials`) is yours.
- `tools-check.sh`: only that a tool answers. It does not log you in anywhere.

## Stays manual

- The Railway, Supabase and Cloudflare dashboards (status, pause date, the restore deadline, the
  R2 token, billing and account access); Sentry, Firebase and Expo logins.
- Sealing the old JWT secret; cutting old services off the database; resetting the database password.
- Exporting the EAS keystore, and the key restrictions in the consoles (items 6 and 13).
- The A3 photos of each phone's DID-NOT-SYNC list (item 7).
- The network cut on every phone (item 12), the fleet notice (item 1), and items 8, 9, 11, 14-16.

## The app stays closed on every phone

`phone-facts.sh` only reads: `pm path`, `pull`, `dumpsys package`, `getprop`. It never starts the
app, installs, uninstalls, clears data or changes a setting. The phones hold records that have not
synced, and opening the app can destroy them. Do not open it to "check" anything. The one
exception is item 7: the photographs, with airplane mode on and Wi-Fi off, exactly as the plan says.

## If something fails

A script that fails says FAIL and exits non-zero; read the log it names. Containers it starts are
named `fixflow-p0a-*` and are removed at the end; if a run was interrupted, remove them by name.
`FF_PGDUMP_NETWORK` (for example `container:fixflow-p0a-src`) exists only for testing the dump
against a local stand-in database; leave it unset for the real dump.
