# Stage 3 — accounts, secrets, and the all-green check

## What the owner did

1. Created a Box API key in the Upstash console → `.env` as
   `UPSTASH_BOX_API_KEY`.
2. Created a fine-grained GitHub token (resource owner `gerrcass`; repos
   `software-factory` and `taskboard`; Contents, Issues, Pull requests — all
   read/write) → `.env` as `FACTORY_GITHUB_TOKEN`.
3. Generated an OpenCode Go key → `.env` as `OPENCODE_API_KEY`. (An earlier
   key of theirs had appeared in the build session's output, and the
   replacement doubles as rotation — see the hand-over notes at the end of the
   build.)

## Check result

`node --env-file=.env scripts/check-setup.mjs`, first run, 2026-10-17:

- Tools: Node 22.22.1, git, `gh` signed in — all ok.
- Config: 1 repo, 4 enabled workers, agent type `opencode`, model
  `opencode-go/deepseek-v4.1-flash` — ok.
- Secrets: all three set (values never printed; lengths only) — ok.
- GitHub token: reaches `gerrcass/software-factory` and `gerrcass/taskboard`.
- Upstash: the Box key works; 0 Boxes on the account; budget
  `10 limit − 0 foreign − 4 workers = 6 spare`.
- Timeouts: worst case 115 min inside the workflow's 150 — ok.

`All good.` — next step: the worker image (the stock Box has no OpenCode CLI),
then the smoke test.
