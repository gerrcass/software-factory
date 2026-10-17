# Demo slice: "Board control" (delivered) and "Dates and focus" (prepared)

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

## Slice 2 — Dates and focus: prepared, not started

The four issues are written and waiting in `scripts/demo-issues.json`; no
issue has been created or labelled yet, so nothing is pending anywhere. To
launch it: create the issues, run **#7 Due dates** alone first (everything
else depends on the field it adds), then label the remaining three as a
parallel burst — each reviewed by subagents before merge, per the workflow
in `docs/guide.md`.

The slice: due dates on tasks, columns ordered by priority then due date, a
filter bar (status / priority / overdue), and an overdue callout in the
header — the first slice where the browser-capable workers and the
visual-proof pipeline do the real work.

## Next slices (for later)

1. **A board you can trust:** undo delete, keyboard moves between columns.
2. **More than one board:** a board switcher over the same storage.
3. **Polish:** dark-mode toggle, drag-and-drop, empty-state art.
