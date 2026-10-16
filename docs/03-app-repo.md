# Stage 2b — the app repo: gerrcass/taskboard

## What was built

`https://github.com/gerrcass/taskboard`, a small but real product to grow with
the factory:

- **Next.js 16** (App Router, strict TypeScript) + **Tailwind CSS 4**.
- `src/lib/tasks.ts` — pure domain logic (create, move, advance, retreat,
  delete, count) with **9 Vitest unit tests** in `src/lib/tasks.test.ts`.
- `src/lib/taskStore.ts` — localStorage as an external store through
  `useSyncExternalStore` (hydration-safe, cross-tab).
- `src/app/page.tsx` — the board UI (add tasks, move them across To do →
  Doing → Done, delete).
- `AGENTS.md` — conventions the factory agents read automatically, including
  the three commands that must pass.
- Checks in `factory.config.json`: `npm run lint`, `npm run test`,
  `npm run build`; setup: `npm ci`.

## Exact commands

```bash
cd /tmp/opencode
npx --yes create-next-app@latest taskboard --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
cd taskboard
npm i -D @types/node@^22 vitest
npm pkg set scripts.test="vitest run"
# ... app files written ...
npm run lint && npm run test && npm run build
git init -b main && git add -A && git commit
gh repo create gerrcass/taskboard --public --source . --push
```

## Test log

- `npm install` — create-next-app's own install aborted with its new-npm
  `EALLOWSCRIPTS` error (it passes `--allow-scripts` to a project-scoped
  install, which npm 11.18 refuses). A plain `npm install` then succeeded.
  Not a project problem; the Box's npm 10 runs `npm ci` normally.
- `npm i -D vitest` — first attempt failed with ERESOLVE: vitest wants
  `@types/node@^22+`, the scaffold pinned `^20`. Fixed by bumping to `^22`,
  which also matches the runtime Node 22 of both this machine and the Box.
- `npm run lint` — clean. (First pass failed
  `react-hooks/set-state-in-effect`; the page was rewritten around
  `useSyncExternalStore` instead of an effect that loads localStorage.)
- `npm run test` — **9 passed** (vitest 5.0.5).
- `npm run build` — compiled successfully, `/` prerendered static.
- `gh repo view` — repo exists, `PUBLIC`, default branch `main`.

## Note for the factory

Both repos are public, so Actions minutes are free. The agent will find
`AGENTS.md` in the checkout and follow it; the factory's own prompt rules win
where they overlap.
