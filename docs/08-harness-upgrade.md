# Stage 8b — the harness upgrade (browser, visual proof, skills)

What changed, why, and what it proved. This is the upgrade the owner asked
for: agent-browser, before-and-after, the frontend-design skill, and a proper
worker `AGENTS.md` — plus the machinery that attaches visual proof to pull
requests automatically.

## New image contents (`worker/setup.sh`)

- **agent-browser 0.39.1** (`sudo npm install --global agent-browser`; Chrome
  for Testing has no ARM64 build, so the profile script points it at Debian's
  chromium and switches auto-connect on only when Upstash's Chromium answers
  on 9222 — the factory opens the first tab before each agent run).
- **Chromium 155** and **ffmpeg 5.1.9** via apt (the recorder needs ffmpeg).
- **Vendored skills** copied into `~/.config/opencode/skills/`:
  `frontend-design` (anthropics/skills) and `before-and-after`
  (vercel-labs). `scripts/build-snapshot.mjs` now uploads the repo's
  `worker/skills/` tree into the build Box; previously it uploaded only
  `setup.sh`.
- **`worker/AGENTS.md`** — the harness's global instructions, written with
  mattpocock's writing-for-agents skill. It defines "done", the visual-proof
  contract (`/workspace/home/.factory/artifacts/`, naming, size cap), browser
  usage, and the design standard. Copied per job through `jobFiles`
  (`/home/boxuser/.config/opencode/AGENTS.md`), so wording edits need no
  image rebuild.

Snapshot: `d2ba0e50-ab60-4544-8ceb-b00ad10290a8`. Smoke test passed from the
image; a live probe from inside a Box opened the deployed Pages site with
agent-browser and saved a screenshot.

## Visual proof, end to end

1. The agent captures `desktop-before.png` / `desktop-after.png` (plus a
   `recording.webm`) into the artifacts folder — instructed by its global
   `AGENTS.md` and reinforced in the factory prompt.
2. After checks pass, `src/run.mjs` reads the files out of the Box (base64,
   8MB per-file cap), and formats a
   `<!-- before-and-after:start/end -->` block with the **before-and-after
   skill's own `format.mjs`** (vendored; run on the GitHub runner).
3. `gh pr edit --attach` (runner `gh` is 2.102.0, ≥ 2.99 as the skill needs)
   uploads the media to GitHub's attachment storage and rewrites the local
   references, so images render as side-by-side tables and recordings as
   playable videos.
4. Any failure is logged and the run continues: the PR is already open.

Pairs and previews need **two formatter calls** (`format.mjs` accepts either
balanced before/after sets or after-only sets per invocation), whose blocks
are stitched into one marked block. The first live run of this pipeline
failed with exactly that error — caught in the log, fixed in `run.mjs`, and
the fix verified on the next run.

## Lessons recorded

- **The `action_required` gate recurs in one pattern:** the first
  `repository_dispatch` run after a change to `factory.yml` was parked for
  approval again (attempt 1 gated, attempt 2 succeeded after a re-run). Runs
  that follow an unchanged workflow start unattended. Documented in
  `docs/guide.md` §13.
- **Deleting a snapshot in the Upstash console leaves `snapshotId` in
  `factory.config.json` stale**, and provisioning then fails with "Snapshot
  is not ready". Clear the id and rebuild; see the troubleshooting table.
- npm's script policy can skip `agent-browser`'s postinstall; `setup.sh`
  re-runs it and chmods the native binary, and the check section fails the
  build if the CLI still cannot run.
