# Demo slice: "Board control" (delivered) and "Dates and focus" (delivered)

## Slice 1 — Board control: delivered and closed

All five issues closed, all five PRs merged, issue tracker empty:

| Issue | PR | Built by | Outcome |
|---|---|---|---|
| #2 Header progress summary | [#7](https://github.com/gerrcass/taskboard/pull/7) | Quill | merged, issue closed |
| #3 Clear done button | [#8](https://github.com/gerrcass/taskboard/pull/8) | Quill | merged, issue closed |
| #4 Rename inline | [#9](https://github.com/gerrcass/taskboard/pull/9) | Volt | merged, issue closed |
| #5 Priorities with badges | [#11](https://github.com/gerrcass/taskboard/pull/11) | Pixel | merged after a fresh re-run (stale branch), issue closed |
| #6 Export as JSON | [#10](https://github.com/gerrcass/taskboard/pull/10) | Nova | went back to the factory once with the review's bug report, then merged; issue closed |

What it proved: the full label loop (twice), the parallel burst across four
workers, the stale-PR re-run path, and the review-and-iterate path (#10's
download fix came from a reviewer finding posted as an issue comment). The
final #10 also carries the upgraded harness's visual proof: before/after
tables and an embedded recording.

## Slice 2 — Dates and focus: delivered

Created as taskboard issues **#12–#15** (the slice-1 pull requests had
already used the numbers 7–11). Staged rollout, each PR reviewed by subagents
before merge, per the workflow in `docs/guide.md`:

| Issue | Title | Status |
|---|---|---|
| [#12](https://github.com/gerrcass/taskboard/issues/12) | Due dates for tasks | **merged** (PR #16) after one review iteration — first attempt's form layout was sent back, second run fixed it |
| [#13](https://github.com/gerrcass/taskboard/issues/13) | Order the columns: priority, then due date | **merged** (PR #17) — burst, clean review |
| [#14](https://github.com/gerrcass/taskboard/issues/14) | Filter bar: status, priority and overdue | **merged** (PR #19) after one iteration — Clear done could delete tasks the filters were hiding; the re-run fixed and passed re-review |
| [#15](https://github.com/gerrcass/taskboard/issues/15) | Header callout for overdue work | **merged** (PR #18) — burst, clean review |

The first attempt for #12 (run 39062508585) failed for a factory reason, not a
feature one: a workflow-file change landed on `main` mid-run, and GitHub
refused the push under the token's scope rules. Fixed in `src/run.mjs` (the
branch is now rebased onto the fresh `main` before the push) and retried. The
same run also showed the Box browser failing on a cold resume — `startBrowser`
now retries, and `scripts/browser-test.mjs` checks a Box by hand.

The slice: due dates on tasks, columns ordered by priority then due date, a
filter bar (status / priority / overdue), and an overdue callout in the
header — the first slice where the browser-capable workers and the
visual-proof pipeline do the real work.

## Slice 3 — A board you can trust: underway

Created as taskboard issues **#20–#23**:

| Issue | Title | Status |
|---|---|---|
| [#20](https://github.com/gerrcass/taskboard/issues/20) | Undo a deleted task | wave 1 |
| [#21](https://github.com/gerrcass/taskboard/issues/21) | Undo Clear done | staged after #20 merges |
| [#22](https://github.com/gerrcass/taskboard/issues/22) | Move tasks between columns with the keyboard | wave 1 |
| [#23](https://github.com/gerrcass/taskboard/issues/23) | Import the board from an exported JSON file | wave 1 |

The slice: recover from mistakes (undo single deletes and Clear done), operate
the board without a mouse (keyboard moves), and restore a backup (import an
export). Wave 1 runs #20, #22 and #23 in parallel; #21 is held back so it can
reuse #20's undo pattern instead of racing it.

## Next slices (for later)

1. **More than one board:** a board switcher over the same storage.
2. **Polish:** dark-mode toggle, drag-and-drop, empty-state art.
