# Demo slice: "Board control" — the plan behind the first issues

A "slice" is a coherent chunk of product work, cut through the stack, that
leaves the app visibly better. This is the first slice for `taskboard`, chosen
to be small enough for five agent-sized issues and varied enough to prove
different parts of the factory.

## Why this slice

The board today does the basics: add, move, delete — one task at a time. The
next thing a real user needs is **control**: knowing where they stand, fixing
what they typed, seeing what matters, cleaning up, and taking their data with
them. Every piece is independently useful, and most of them touch the domain
logic in `src/lib/tasks.ts`, which means the agents must keep the unit tests
green — a good test of the checks gate.

## The five issues (created in `demo-issues.json`)

| # | Issue | What it adds | What it proves about the factory |
|---|---|---|---|
| 1 | Header shows a progress summary | `4 tasks · 1 done`, live | The staged first run: dry run, then the full label flow end to end |
| 2 | Add a Clear done button | Bulk hygiene, pure-function + test | Two workers editing the same module in parallel |
| 3 | Rename a task inline | Editing with save/cancel semantics | The agent handles interaction details from prose alone |
| 4 | Task priorities with badges | A new field, with data compatibility for existing stored tasks | The agent must handle a forward/backward compatibility constraint |
| 5 | Export the board as JSON | Portability, browser-only download | The agent finishes a feature with a UI surface beyond the board itself |

Each issue body states its acceptance points, names the commands that must
keep passing (`npm run lint`, `npm run test`, `npm run build`), and defers to
the repo's `AGENTS.md`.

## Rollout plan

1. **Staged first run:** issue #1 is labelled alone. Dry run first (the factory
   prints its plan, touches nothing), then a real run. Its PR is reviewed and
   merged before anything else starts.
2. **Parallel burst:** the remaining four issues are labelled at once across
   four workers. They deliberately touch overlapping files
   (`src/app/page.tsx`, `src/lib/tasks.ts`), so some pull requests will
   conflict after the first merge — that is a property of parallel work, not a
   factory bug, and is part of what this slice demonstrates.
3. Merge order after the burst: whatever the reviewer prefers; for any PR that
   went stale against `main`, re-add the `ready` label to the issue (the
   factory force-pushes a fresh branch and updates the same PR).

## What we explicitly watch during the burst

- One run per issue, no duplicates (`concurrency` group per issue).
- Every issue ends in `factory:review` or `factory:needs-attention` — never
  silently.
- All four workers return to free/paused afterwards (`scripts/status.mjs`).
- No credentials left in any Box (`ls ~/.git-credentials /workspace/home/.factory`).

## Next slices (not started; for future planning)

1. **Dates and focus:** due dates, an overdue view, filters by priority/status.
2. **Multiple boards:** more than one board per browser, board switcher.
3. **Polish:** dark-mode toggle, keyboard moves between columns, undo delete.
