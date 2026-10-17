# Stages 6 + 4 — the worker image, and the smoke test

## What was built

The stock Box has no OpenCode CLI (it *does* ship its platform's own OpenCode
**v1** at `/opt/runner/bin` — see below), so the image comes before the smoke
test:

- `worker/setup.sh` installs the pinned CLI —
  `curl -fsSL https://opencode.ai/v2/install | bash -s -- --version 2.0.31 --no-modify-path` —
  symlinks it into `/usr/local/bin`, and prepends `~/.opencode/bin` to `PATH`
  through `/etc/profile.d/opencode.sh`.
- Built inside worker Box `sfac-opencode-01` (browser-enabled, as required:
  an image passes on the browser access of its build Box).
- Snapshot `22763104-9a98-4153-8236-adfaebe20800`, saved to
  `factory.config.json` as `agents.opencode.snapshotId`.

## The discovery worth knowing: two OpenCode CLIs in a Box

- `/opt/runner/bin/opencode` is a symlink to the platform's own `runner-cli`
  and reports **1.18.29**. Plain `sh` (what `box.exec.command` uses) finds
  this one first.
- Our pinned **v2.0.31** lives in `~/.opencode/bin` and wins in **login
  shells**, which is where the factory actually runs everything
  (`runScript` uses `bash -lc`) — including the agent and the repo's
  setup/checks.
- The first build's check printed the v1 binary because the build shell had
  started before the profile file existed. The check now asserts the version
  **in a fresh login shell** (the agent's context) and fails the build
  otherwise; `scripts/smoke-test.mjs` was changed to ask the same context, so
  its "Agent CLI found" line is the truth about what the agent will run.
- We do **not** touch `/opt/runner/bin` — it is platform machinery, and the
  factory never needs it.

The superseded first snapshot (`8b8aa1a6-…`, taken before the check fix; no
Box uses it) was deleted with `Box.deleteSnapshots`.

## Commands

```bash
node --env-file=.env scripts/provision-workers.mjs opencode-01 --yes   # one Box to build in
node --env-file=.env scripts/build-snapshot.mjs opencode-01 --yes      # build + snapshot + record id
node --env-file=.env scripts/smoke-test.mjs opencode --yes             # one Box, one reply
```

## Test log

Image build (second, after the check fix):

- Installer: `Installed version: 2.0.31` → reinstalled as asked.
- `node --version` → `v25.9.0` (the Box moved past Node 22 since the skill's
  notes — fine for the taskboard: Next 16 needs ≥ 20.9).
- `git version 2.39.5`.
- Build shell and a fresh login shell both resolve
  `/home/boxuser/.opencode/bin/opencode (opencode v2.0.31)`; the check's
  assertion passed.
- `Secret scan clean.` before snapshotting.

Smoke test (`sfac-smoke-opencode`, created from the image, deleted afterwards):

- Stock-box facts printed: `node v25.9.0`, `npm 11.12.1` (note: new npm with
  the allow-scripts policy ships here too), `pnpm`, `yarn`, `bun`, `python3
  3.11.2` (no pip), `make`, `gcc 12.2`; no go/rust/java/docker.
- `browser access: yes`.
- `Agent CLI found: /home/boxuser/.opencode/bin/opencode / opencode v2.0.31`.
- `Exit code 0 after 0.2 min`, `Summary file: BOX OK` — agent ran with the Go
  key from `.env`, replied, and the summary redirect worked.

**PASS: the agent answered from inside a Box.**
