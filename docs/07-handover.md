# Hand-over

The factory is live. This is the short list an owner needs: what to review,
what to rotate, what to watch, and where the rest is written down.

## Where things stand

Slice 1 ("Board control") is complete: five issues closed, five pull requests
merged, the issue tracker empty. The set proved the whole loop — the parallel
burst across four workers, a stale-branch re-run, one review-driven iteration
(#10's download fix), and the visual-proof pipeline on the final run. The
live app is at <https://gerrcass.github.io/taskboard/>, redeployed by the
Pages workflow on every merge to `main`.

Slice 2 ("Dates and focus") is **prepared, not started**: its four issues are
written in `scripts/demo-issues.json` and the staged rollout is described in
`docs/demo-slice.md`. Nothing is pending anywhere; launching it is one
command away.

## Rotate or note

- **`OPENCODE_API_KEY`**: the factory now runs on the service-account key you
  created (Go models only; verified by smoke test and live runs). It passed
  through chat once, so rotate it at the end of the project: new key in the
  OpenCode console → edit `.env` → `node --env-file=.env scripts/set-secrets.mjs --yes`.
  (The "key expired" errors you saw were local saved accounts shadowing new
  keys — see the troubleshooting row in `docs/guide.md`.)
- **`FACTORY_GITHUB_TOKEN`** (fine-grained PAT): note its expiry date and
  rotate before it lapses, or every run will fail at clone/dispatch time with
  an authentication error. Same rotation path: new token → `.env` →
  `set-secrets.mjs --yes` (this one is also stored on the app repo).
- **`UPSTASH_BOX_API_KEY`**: rotate in the Upstash console if it ever leaks.

## What to watch

- **Go subscription limits** are per-model (5-hour / weekly / monthly). Four
  parallel workers burn them faster; hit a limit and affected issues end in
  `factory:needs-attention` — answer/refix and re-add `ready`, or label fewer
  issues at once.
- **A run holds a GitHub runner for its whole length.** Both repos are public,
  so minutes are free here; on private repos bursts cost real minutes.
- **Stuck worker after a cancelled run:** `scripts/release-worker.mjs <worker id>`.
- **Model changes:** edit `agents.opencode.boxSettings`, run
  `scripts/apply-box-settings.mjs --yes`, and rebuild the image.

## Security statements, said plainly once

- The agent runs with its permission prompts switched off, holds its sign-in
  only for the length of a job, and reads the issue text. `allowedActors`
  controls who may *start* the factory, not who may *write* an issue. Read an
  issue before labelling it.
- The GitHub token never reaches the agent; git runs with the credential
  helper off and the remote URL cleaned before the agent starts. Verified
  empty after a run (`~/.git-credentials`, `/workspace/home/.factory`).
- Anyone who can see this repo's Actions logs can see run output. Keep repo
  access tight (or make the factory repo private).

## Where everything is written down

| Document | What it covers |
|---|---|
| `docs/guide.md` | The developer handbook: architecture + diagrams, labels, secrets model, models, images, costs, everyday commands, changing the factory, troubleshooting |
| `docs/worker-environment.md` | Inside the Box: the snapshot/image, and how to extend the harness (model, skills, `AGENTS.md` rules, MCP servers, subagents, permissions, packages) |
| `docs/demo-slice.md` | The plan behind the five slice issues |
| `docs/0*.md` | Build log, stage by stage, with real command outputs |
| `README.md` | Front page with the two diagrams and everyday commands |
