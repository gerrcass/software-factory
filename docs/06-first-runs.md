# Stages 5, 7, 8 — dry run, first real run, and the parallel burst

## The dry run (Stage 5)

The trigger PR in taskboard was merged (squash, PR #1) and `FACTORY_DRY_RUN`
was set to `true` on this repo. Issue #2 ("Header shows a progress summary")
was labelled `ready` from the allowed account.

One GitHub quirk on the very first dispatch: the factory run was created as
`conclusion: action_required` with no job started — GitHub's one-time approval
gate for a first `repository_dispatch` run. It was approved (re-run at
14:38:53) and the *same* run then succeeded; every dispatch after that,
including the whole burst, started unattended. Worth knowing if a future repo
repeats it.

The plan output (the point of the dry run):

```text
Config OK: 1 repos, 4 enabled workers.
Issue gerrcass/taskboard#2: Header shows a progress summary
State: open. Labels: ready
Workers:
  opencode-01      opencode        free      Box: idle
  opencode-02      opencode        free      Box: not created
  ...
Plan: worker opencode-01 (opencode) would take this issue in Box sfac-opencode-01.
Branch: factory/issue-2, base: main
Setup: npm ci. Checks: npm run lint && npm run test && npm run build
Dry run only. Nothing was changed.
```

## The first real run (Stage 7)

`FACTORY_DRY_RUN` deleted; `ready` re-added. Run
[39041803339](https://github.com/gerrcass/software-factory/actions/runs/39041803339):

- Claimed worker `opencode-04` — the claim offset chose 4 over 1, and since
  its Box did not exist yet the run created `sfac-opencode-04` from the image
  itself. (Provision everything before a burst so runs never race to create
  the same Box.)
- Workspace prepared in ~1 min (`git clone`, `npm ci` in the Box).
- Agent finished in **0.7 min**, exit 0.
- Checks passed: `npm run lint`, `npm run test`, `npm run build`.
- PR [#7](https://github.com/gerrcass/taskboard/pull/7), commit author
  **"Quill (AI agent)"** (opencode-04's persona), scoped to `tasks.ts` + its
  test + `page.tsx` (+30/−0).

Every Stage 7 check held: labels went `ready → factory:running →
factory:review`, the PR body carried `Closes #2` and the agent's own summary,
the worker was released and paused, and the credential check came back empty:

```text
$ box-exec sfac-opencode-04 "ls -d ~/.git-credentials /workspace/home/.factory" --pause
ls: cannot access '/home/boxuser/.git-credentials': No such file or directory
ls: cannot access '/workspace/home/.factory': No such file or directory
```

PR #7 was merged (merge commit, keeping Quill's authorship); **issue #2
closed by the merge** — the whole loop verified.

## The parallel burst (Stage 8)

Workers 02 and 03 were provisioned from the image (04 already existed), then
issues #3–#6 were labelled `ready` within seconds of each other.

| Issue | Run | Worker (persona) | PR | Checks | Outcome |
|---|---|---|---|---|---|
| #3 Add a Clear done button | 39042091295 | opencode-04 (Quill) | [#8](https://github.com/gerrcass/taskboard/pull/8) | passed | factory:review |
| #4 Rename a task inline | 39042098005 | opencode-03 (Volt) | [#9](https://github.com/gerrcass/taskboard/pull/9) | passed | factory:review |
| #5 Task priorities with badges | 39042099958 | opencode-02 (Pixel) | [#11](https://github.com/gerrcass/taskboard/pull/11) | passed | factory:review |
| #6 Export the board as JSON | 39042103725 | opencode-01 (Nova) | [#10](https://github.com/gerrcass/taskboard/pull/10) | passed | factory:review |

- Four runs, four workers, zero collisions, zero `factory:needs-attention`,
  ~3 minutes wall clock for the whole burst.
- All four workers returned to free/paused afterwards
  (`scripts/status.mjs`: `4 free, 0 busy, 0 disabled`).

## Known rough edges (honest list)

- **PR bodies include the agent's narration.** Quill's #7 body starts with its
  "I have a clear picture. Let me implement…" lines before the final summary.
  Cosmetic; tightening the `command`/prompt would fix it if it bothers anyone.
- **The four open PRs overlap in files** (`page.tsx`, `tasks.ts`, the test
  file). Merging one makes the others stale; that is the documented property
  of parallel work (see `docs/demo-slice.md`): merge sequentially, and if a PR
  no longer applies, re-add `ready` to its issue — the factory force-pushes a
  fresh branch and updates the same PR.
- Old snapshot `8b8aa1a6-…` was deleted with `Box.deleteSnapshots`; the live
  id is `22763104-…` in `factory.config.json`.
