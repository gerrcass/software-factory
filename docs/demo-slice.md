# Demo slices: "Board control", "Dates and focus", "A board you can trust" — all delivered

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

## Slice 3 — A board you can trust: delivered

Created as taskboard issues **#20–#23**; all four PRs merged, all four issues
closed. Wave 1 ran #20, #22 and #23 in parallel; #21 was staged behind #20 so it
could reuse the merged undo pattern instead of racing it. Each PR was reviewed
on both axes by subagent pairs before merge, as in slice 2:

| Issue | PR | Built by | Outcome |
|---|---|---|---|
| [#20](https://github.com/gerrcass/taskboard/issues/20) Undo a deleted task | [#24](https://github.com/gerrcass/taskboard/pull/24) | Volt | merged after one review iteration — the first attempt left focus on the body when the delete button unmounted; the re-run moved focus to the Undo button (with a labelled action) and made the live region reliable |
| [#21](https://github.com/gerrcass/taskboard/issues/21) Undo Clear done | [#27](https://github.com/gerrcass/taskboard/pull/27) | Volt | merged on a clean review — the spec reviewer reran lint/test/build on a fresh extract |
| [#22](https://github.com/gerrcass/taskboard/issues/22) Keyboard moves between columns | [#26](https://github.com/gerrcass/taskboard/pull/26) | Pixel | merged after one review iteration (a pending focus request could steal focus later; identical announcements were silent) and two stale-branch re-runs |
| [#23](https://github.com/gerrcass/taskboard/issues/23) Import the board from JSON | [#25](https://github.com/gerrcass/taskboard/pull/25) | Quill | merged after one review iteration (duplicate ids were accepted; the notice never cleared) and two stale-branch re-runs |

The slice: recover from mistakes (undo single deletes and Clear done), operate
the board without a mouse (keyboard moves), and restore a backup (import an
export).

What this round proved:

- **The review loop keeps finding real defects.** #20, #22 and #23 each went
  back exactly once with a specific comment; all three re-reviews came back
  clean. The #23 reviewer ran the three checks itself on the revision.
- **Parallel work on one file serializes at merge time.** All four PRs edit
  `page.tsx`, so every merge made its siblings `CONFLICTING` on GitHub. The
  factory's answer is the stale-PR path: re-add `ready` and the next run
  re-implements on the fresh `main` and force-updates the same PR branch. The
  tail of the slice was merge → re-run → merge, three re-runs in total.
- **Merged `main` was verified as a whole**: `npm run lint`, 98 tests and the
  static build run green on the tree that combines all three slices, and the
  Pages deploy follows each merge — the live board is up.

Known rough edges (honest list):

- #22's announcement repeats if two different tasks with the same title move to
  the same column in a row (a counter would fix it); `advanceTask`/`retreatTask`
  are no longer called by the app — `statusInDirection` owns the step now —
  but remain tested lib helpers.
- #23's in-page confirmation (Replace/Cancel) does not take focus when it
  appears, so a keyboard user needs a long Tab journey to answer it.
- Three reviewers independently wanted one shared count-label helper; the
  "1 task / N tasks" rule now exists in three places.

## Next slices (for later)

1. **More than one board:** a board switcher over the same storage.
2. **Polish:** dark-mode toggle, drag-and-drop, empty-state art.
