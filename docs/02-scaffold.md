# Stage 2 — scaffold the factory repo

## What was built

The skill's template (`assets/template/`) was copied into this folder, then
adapted:

- `factory.config.json`: real values for `gerrcass/software-factory`,
  `boxNamePrefix: "sfac-"`, `boxLabel: "sfac"`, `boxLimit: 10`, four
  `opencode` workers with AI persona names (Nova, Pixel, Volt, Quill), the
  `opencode` agent type, and `gerrcass/taskboard` as the first app repo.
- `worker/setup.sh`: installs the pinned OpenCode CLI in the worker image
  (`curl -fsSL https://opencode.ai/v2/install | bash -s -- --version 2.0.31
  --no-modify-path`), then symlinks it into `/usr/local/bin` so the smoke
  test's plain-`sh` `command -v opencode` finds it, and adds
  `/etc/profile.d/opencode.sh` for login shells.
- `src/run.mjs`: one small extension — a worker's `gitAuthorName` (when set)
  replaces `factory.gitAuthor.name` for that worker's commits. The email stays
  the owner's noreply address, so preview hosts are never blocked.
- `.env.example`: the three secrets (`UPSTASH_BOX_API_KEY`,
  `FACTORY_GITHUB_TOKEN`, `OPENCODE_API_KEY`).
- `.gitignore`: also ignores `.agents/` (the vendored skill) and
  `skills-lock.json`.

## Exact commands

```bash
cd /home/gerrcass/code/software-factory
cp -R .agents/skills/create-upstash-software-factory/assets/template/. .
npm install
git init -b main
git add -A && git commit -m "Software factory: OpenCode workers, taskboard repo, pinned CLI in the worker image"
gh repo create gerrcass/software-factory --public --source . --push
```

## Test log

- `npm install` — `found 0 vulnerabilities`.
- Config loader — `config OK: 1 repo(s), 4 workers, agents: opencode`.
- `git status --short` before the commit — no `.env`, no `node_modules/`, no
  `.agents/`; only intended files staged.
- `gh repo view` — repo exists, `PUBLIC`, default branch `main`.
- Version pin check: `@opencode/cli-linux-arm64@2.0.31` returns HTTP 200 from
  the npm registry (the `@opencode` scope, not the legacy `@opencode-ai`).
  Current latest at build time is 2.0.32; 2.0.31 is pinned because every
  headless behaviour was verified against it locally.

## Not yet done

- Stage 3 secrets (Upstash Box key, fine-grained GitHub token, OpenCode Go key).
- The app repo `gerrcass/taskboard` (Stage next), worker image, smoke test,
  trigger dry run, first real run.
