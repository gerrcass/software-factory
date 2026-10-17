# Hand-over

The factory is live. This is the short list an owner needs: what to review,
what to rotate, what to watch, and where the rest is written down.

## Waiting for your review

Four slice PRs are open on `gerrcass/taskboard`, all checks green:

| PR | Issue | What it does |
|---|---|---|
| [#8](https://github.com/gerrcass/taskboard/pull/8) | #3 | Clear done button (only shown when something is done) |
| [#9](https://github.com/gerrcass/taskboard/pull/9) | #4 | Rename a task inline (Enter/blur saves, Esc cancels) |
| [#10](https://github.com/gerrcass/taskboard/pull/10) | #6 | Export the board as JSON, browser-only download |
| [#11](https://github.com/gerrcass/taskboard/pull/11) | #5 | Priorities with badges; existing stored tasks default to normal |

They overlap in `src/app/page.tsx` and `src/lib/tasks.ts`, so the first merge
makes the rest stale. Merge one, then either resolve the next on GitHub or
re-add `ready` to its issue — the factory force-pushes a fresh branch and
updates the same PR.

Issue #2 is closed (PR #7 merged); the slice "Board control" is complete once
these four land.

## Rotate or note

- **`OPENCODE_API_KEY`**: during the build session an earlier Go key
  value appeared in the session's terminal output. A fresh key was put in
  `.env` for the factory, so what runs today is clean — but if that older key
  is still active in the OpenCode console, revoke it. To rotate again later:
  new key in the console → edit `.env` → `node --env-file=.env scripts/set-secrets.mjs --yes`.
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
