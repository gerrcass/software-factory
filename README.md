# Software Factory

Put a `ready` label on a GitHub issue. A coding agent picks it up inside an Upstash Box, makes the change and opens a pull request. You review it and merge it yourself.

Repos, workers and agent types are listed in [factory.config.json](factory.config.json).

<!-- Stage 9 of the skill fills this in: the diagrams, how to add a repo, a
worker or an agent type, how to read the labels, and the everyday commands. -->

## Everyday commands

```bash
node --env-file=.env scripts/status.mjs
```

```bash
node --env-file=.env scripts/release-worker.mjs <worker id>
```

```bash
node --env-file=.env scripts/apply-box-settings.mjs
```

The first shows who is free and who is busy. The second frees a worker that a cancelled run left marked busy. The third writes a changed model or effort setting into the Boxes that already exist.
