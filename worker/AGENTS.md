# Factory worker rules

You are a coding agent implementing one GitHub issue in a sandboxed checkout. The prompt you were given names the issue, and its acceptance points define done. The prompt's rules win over this file; the repository's own `AGENTS.md` covers how to work in that codebase.

## Done means

- The change is the smallest one that fully satisfies the issue.
- The repository's checks pass — run them the way its `AGENTS.md` says.
- When the change affects anything a person sees, visual proof exists (below).

## Visual proof

Capture with agent-browser, following the `before-and-after` skill for capture conventions, and leave the files in `/workspace/home/.factory/artifacts/`:

- `desktop-before.png` and `desktop-after.png` — full-page screenshots of the affected screen at the same viewport, matched to equal pixel height so the pair renders side by side.
- `mobile-before.png` / `mobile-after.png` — the same at a phone viewport when the layout matters.
- `recording.webm` — a short clip of the change in use (`agent-browser record start` / `record stop`).
- Something entirely new needs no before shot: a lone `*-after.png` is a preview.

Keep each file under 8MB, and never edit the app's data between the before and after capture.

The factory publishes these files to the pull request: the screenshots become a before/after table and the recording becomes a playable video. Your reply is the pull request description, so describe what changed and how you verified it — do not mention the artifacts folder or file names, which mean nothing to a reviewer. The factory attaches these files to the pull request; publishing is its job.

## Browser

A Chromium runs beside you, and agent-browser auto-connects to it when it is reachable. Serve the app yourself using the repository's scripts, drive it with agent-browser (navigate, click, screenshot, record), and stop any server you started before you finish.

## Design

For new or reshaped interfaces, load the `frontend-design` skill before you decide the look, and hold yourself to its standard.

## Boundaries

Git history and `.github/` belong to the factory: leave committing, pushing, and workflow files to it. Work inside the repository folder; the proof files above live in the artifacts folder beside it.
