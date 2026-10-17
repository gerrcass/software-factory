# Demo slice: "Board control" (done) and "Dates and focus" (next)

## Slice 1 — Board control (delivered)

Five issues, all closed; the factory built the whole slice:

| Issue | PR | Built by | Outcome |
|---|---|---|---|
| #2 Header progress summary | [#7](https://github.com/gerrcass/taskboard/pull/7) | Quill | merged, issue closed |
| #3 Clear done button | [#8](https://github.com/gerrcass/taskboard/pull/8) | Quill | merged, issue closed |
| #4 Rename inline | [#9](https://github.com/gerrcass/taskboard/pull/9) | Volt | merged, issue closed |
| #5 Priorities with badges | [#11](https://github.com/gerrcass/taskboard/pull/11) | Pixel | merged after a fresh re-run (stale branch), issue closed |
| #6 Export as JSON | [#10](https://github.com/gerrcass/taskboard/pull/10) | Nova | went back to the factory once with the review's bug report, issue closed |

What it proved: the full label loop (twice), the parallel burst across four
workers, the stale-PR re-run path, and the review-and-iterate path (#10's
download fix came from a reviewer finding posted as an issue comment).

## Slice 2 — Dates and focus (in progress)

The board can hold tasks, but not time. This slice gives every task a
deadline, orders the columns by what matters, and lets a person filter to
what needs attention — the first slice where the upgraded harness (browser,
visual proof, frontend-design skill) does the real work.

Staged deliberately, because the overdue features all build on due dates:

1. **#7 Due dates for tasks** — runs alone first; everything else depends on
   the field it adds. UI change → before/after proof expected on its PR.
2. Then a parallel burst, each depending only on #7:
   - **#8 Order the columns: priority, then due date** — a deterministic
     comparator; the priority sort finally exercises slice 1's badges.
   - **#9 Filter bar: status, priority and overdue** — display-only filtering
     with counts and a clear-all.
   - **#10 Header callout for overdue work** — the summary learns to shout
     `2 overdue` when it must.

Every slice-2 PR goes through the reviewer subagents (Standards + Spec,
per the code-review skill); minor findings may merge, anything behavioural
goes back to the factory as an issue comment before merging. All four PRs
will carry visual proof attached through the before-and-after pipeline.

## Next slices (for later)

1. **A board you can trust:** undo delete, keyboard moves between columns.
2. **More than one board:** a board switcher over the same storage.
3. **Polish:** dark-mode toggle, drag-and-drop, empty-state art.
