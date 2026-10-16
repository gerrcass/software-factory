# Stage 1 — interview decisions

What the user chose, before any code was written.

| Question | Answer |
|---|---|
| App repos | One new repo, `gerrcass/taskboard`: a small but real Next.js task board with unit tests, so agents have real features to implement. Existing repos stay out for now. |
| Agent harness | OpenCode CLI (the user has an OpenCode **Go** subscription, not Claude Code or Codex). Headless auth via `OPENCODE_API_KEY`. |
| Workers | 4, all of the same type (`opencode`), staying well inside the free plan's 10-Box limit. |
| Model | `opencode-go/deepseek-v4.1-flash`, stored in the Box's `~/.config/opencode/opencode.json`. |
| Who may trigger | Only `@gerrcass`, via the `ready` label and the workflow button. |
| Factory repo | `gerrcass/software-factory`, public (free Actions minutes), only the owner can trigger runs. |
| Commit identity | Author email is the owner's GitHub noreply address (keeps preview hosts happy). Each worker signs with its own AI persona name: Nova, Pixel, Volt, Quill. |
| Browser access | On (`factory.browser: true`), so agents can drive Upstash's Chromium later. |
| Upstash plan | Free plan, 10 Boxes total (paused Boxes count). `factory.boxLimit: 10`. |

## Facts established before building (Stage 0)

- `opencode run` is the headless mode; stdout carries exactly the final reply
  (progress goes to stderr), so `opencode run ... > {summary}` is safe.
- `--auto` auto-approves permissions that are not explicitly denied; nothing
  can block on a prompt in a Box.
- `OPENCODE_API_KEY` works for the `opencode-go` provider. Verified with a
  fresh empty OpenCode database and only that variable set.
- `opencode auth import` also works headlessly, kept as a documented fallback.
- The Go model reference is `opencode-go/<catalog-id>`, e.g.
  `opencode-go/deepseek-v4.1-flash` (lowercase, from the endpoint table).
- The V2 installer lives at `https://opencode.ai/v2/install`; it installs to
  `~/.opencode/bin` and accepts `--version` and `--no-modify-path`.
  Only `curl` and `tar` are needed; both are in the stock Box.
- A stock Box has no OpenCode CLI, so a worker image is built **before** the
  smoke test (Stage 6 before Stage 4 in the skill's ordering).
