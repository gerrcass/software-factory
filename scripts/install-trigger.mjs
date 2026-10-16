// Prepares each app repo in factory.config.json:
//   1. creates the factory's issue labels, and one agent:<name> label per agent
//      type that has an enabled worker
//   2. opens a pull request that adds .github/workflows/factory-ready.yml
//
// Preview: node scripts/install-trigger.mjs
// Apply:   node scripts/install-trigger.mjs --yes
//
// Uses the gh CLI and git. A pull request is used instead of a direct push so
// the repo owner reviews what lands in their repo. Run it again after changing
// allowedActors, the ready label, or the set of agent types.
import { spawnSync } from "node:child_process"
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { loadConfig, usedAgents } from "../src/config.mjs"

const config = loadConfig()
const apply = process.argv.includes("--yes")
const BRANCH = "factory/install-trigger"
const FILE = ".github/workflows/factory-ready.yml"

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { encoding: "utf8", ...options })
  if (result.status !== 0 && !options.allowFailure) throw new Error(`${cmd} ${args.join(" ")}\n${result.stderr}`)
  return result.stdout.trim()
}

const workflow = readFileSync(new URL("../templates/factory-ready.yml", import.meta.url), "utf8")
  .replaceAll("__FACTORY_REPO__", config.factory.repo)
  .replaceAll("__READY_LABEL__", config.labels.ready)
  .replaceAll("__ALLOWED_ACTORS_JSON__", JSON.stringify(config.factory.allowedActors))

const labels = [
  [config.labels.ready, "0E8A16", "Factory: start work on this issue"],
  [config.labels.running, "FBCA04", "Factory: an agent is working on this"],
  [config.labels.review, "1D76DB", "Factory: a pull request is waiting for review"],
  [config.labels.needsAttention, "D93F0B", "Factory: a human needs to look at this"],
  ...usedAgents(config).map((name) => [`agent:${name}`, "5319E7", `Factory: use a ${name} worker`]),
]

for (const { repo, baseBranch } of config.repos) {
  // GitHub only runs an issues workflow from the repo's DEFAULT branch, which is
  // not always the branch the factory opens its pull requests against.
  const defaultBranch = run("gh", ["repo", "view", repo, "--json", "defaultBranchRef", "-q", ".defaultBranchRef.name"])
  console.log(`\n${repo} (default branch: ${defaultBranch})`)
  if (defaultBranch !== baseBranch) {
    console.log(`  note: factory pull requests go to "${baseBranch}", but the trigger has to live on "${defaultBranch}"`)
  }

  if (!apply) {
    console.log(`  would create labels: ${labels.map((l) => l[0]).join(", ")}`)
    console.log(`  would open a pull request against ${defaultBranch} that adds ${FILE}`)
    continue
  }

  for (const [name, color, description] of labels) {
    run("gh", ["label", "create", name, "--repo", repo, "--color", color, "--description", description, "--force"])
  }
  console.log("  labels ready")

  const dir = mkdtempSync(join(tmpdir(), "factory-trigger-"))
  run("gh", ["repo", "clone", repo, dir, "--", "--quiet", "--depth", "1", "--branch", defaultBranch])
  mkdirSync(join(dir, ".github/workflows"), { recursive: true })
  writeFileSync(join(dir, FILE), workflow)
  if (!run("git", ["status", "--porcelain"], { cwd: dir })) {
    console.log("  trigger already up to date")
    continue
  }
  const author = config.factory.gitAuthor
  run("git", ["checkout", "--quiet", "-b", BRANCH], { cwd: dir })
  run("git", ["add", FILE], { cwd: dir })
  run("git", ["-c", `user.name=${author.name}`, "-c", `user.email=${author.email}`, "commit", "--quiet", "-m", "Send ready issues to the software factory"], { cwd: dir })
  run("git", ["push", "--quiet", "--force", "origin", BRANCH], { cwd: dir })

  const existing = run("gh", ["pr", "list", "--repo", repo, "--head", BRANCH, "--state", "open", "--json", "url", "-q", ".[0].url"], { allowFailure: true })
  const body = `Adds a workflow that tells \`${config.factory.repo}\` when an issue gets the \`${config.labels.ready}\` label.\n\nIt needs the \`FACTORY_GITHUB_TOKEN\` secret in this repo. Only these users can start the factory: ${config.factory.allowedActors.join(", ")}.`
  const url = existing || run("gh", ["pr", "create", "--repo", repo, "--base", defaultBranch, "--head", BRANCH, "--title", "Send ready issues to the software factory", "--body", body])
  console.log(`  pull request: ${url}`)
}

if (!apply) console.log("\nPreview only. Add --yes to apply.")
