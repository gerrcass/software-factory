# Vendored worker skills

These skills are installed into the worker image
(`~/.config/opencode/skills/`, done by `worker/setup.sh` from the
`worker/skills/` tree that `scripts/build-snapshot.mjs` uploads into the build
Box). `worker/AGENTS.md` points the agent at them.

| Skill | Source | License |
|---|---|---|
| `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) | See the upstream repo (`LICENSE.txt` there) |
| `before-and-after` | [vercel-labs/before-and-after](https://github.com/vercel-labs/before-and-after) | See the upstream repo |

They are vendored (copied) rather than fetched at build time so the image
build has no third-party network dependency and the exact reviewed text is
what the agents read. To update one: copy the new upstream file here, rebuild
the image, run the smoke test.

The factory itself also uses `before-and-after`'s `scripts/format.mjs` on the
GitHub runner when it attaches proof to a pull request — same file, used by
the factory rather than by the agent.
