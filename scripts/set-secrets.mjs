// Copies secrets into GitHub Actions secrets with the gh CLI. Values go through
// stdin and are never printed.
//
// The factory repo gets the Box key, the GitHub token and every agent sign-in
// secret named in factory.config.json. Each app repo only gets the GitHub
// token, which its trigger workflow uses to start the factory.
//
// A secret's value comes from .env, or from the agent's "localFile" when the
// config names one (for example ~/.codex/auth.json).
//
// Preview: node --env-file=.env scripts/set-secrets.mjs
// Apply:   node --env-file=.env scripts/set-secrets.mjs --yes
import { spawnSync } from "node:child_process"
import { loadConfig } from "../src/config.mjs"
import { readSecret } from "../src/agents.mjs"

const config = loadConfig()
const apply = process.argv.includes("--yes")
const usedAgents = new Set(config.workers.filter((w) => w.enabled).map((w) => w.agent))

const plan = [
  [config.factory.repo, "UPSTASH_BOX_API_KEY", process.env.UPSTASH_BOX_API_KEY],
  [config.factory.repo, "FACTORY_GITHUB_TOKEN", process.env.FACTORY_GITHUB_TOKEN],
]
for (const [name, agent] of Object.entries(config.agents)) {
  if (!usedAgents.has(name)) continue // no enabled worker uses this agent
  for (const entry of agent.auth ?? []) plan.push([config.factory.repo, entry.secret, readSecret(entry)])
}
for (const repo of config.repos) {
  plan.push([repo.repo, "FACTORY_GITHUB_TOKEN", process.env.FACTORY_GITHUB_TOKEN])
  // Secrets the repo's own tests need are used by the factory run, so they are
  // stored on the factory repo.
  for (const entry of repo.secrets ?? []) plan.push([config.factory.repo, entry.secret, readSecret(entry)])
}

const missing = plan.filter(([, , value]) => !value).map(([, name]) => name)
if (missing.length) {
  console.error(`No value found for: ${[...new Set(missing)].join(", ")}. Fill in .env first.`)
  process.exit(1)
}

for (const [repo, name, value] of plan) {
  if (!apply) {
    console.log(`Would set ${name} on ${repo} (${value.length} characters)`)
    continue
  }
  const result = spawnSync("gh", ["secret", "set", name, "--repo", repo], { input: value, encoding: "utf8" })
  if (result.status !== 0) {
    console.error(`Failed to set ${name} on ${repo}: ${result.stderr}`)
    process.exit(1)
  }
  console.log(`Set ${name} on ${repo}`)
}

if (!apply) console.log("\nPreview only. Add --yes to set them.")
