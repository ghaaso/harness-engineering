# Hook probe

A one-off test of 2026-11-18, ordered by the owner: does a hook in this app refuse a call, what is it
told, and does it fire inside helpers. Nobody had observed this on this PC.

- `.claude/settings.json` wires `hook.mjs` to five hook events. It applies only to a session whose
  folder is this folder.
- `hook.mjs` logs key names, lengths and short ids to `hook-log.jsonl`. It refuses a write outside
  `inside/` and a helper started on the model opus. It refuses nothing else.
- The session is given four steps: write a file in `inside/`, try to write one in `outside/`, start a
  helper on a small model that writes in `inside/`, try to start a helper on opus.

The result is recorded in `docs/program/evidence/harness-method-status-2026-11-18/probe-hooks.md`.
After the test the settings file is renamed so that no later session picks the hook up by accident.
