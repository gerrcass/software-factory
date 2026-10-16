// Creates the demo issues from scripts/demo-issues.json (copy demo-issues.example.json and write issues that fit your repos).
//
// Preview:              node scripts/create-demo-issues.mjs
// Create, no labels:    node scripts/create-demo-issues.mjs --yes
// Create and start all: node scripts/create-demo-issues.mjs --yes --ready
//
// Without --ready the issues get no label, so the factory does nothing until
// you add the ready label yourself. With --ready the factory starts on all of
// them at once.
//
// Uses the gh CLI. With --ready it must be signed in as someone listed in
// factory.allowedActors, because the trigger only fires for those users.
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { loadConfig } from "../src/config.mjs"

const confirmed = process.argv.includes("--yes")
const ready = process.argv.includes("--ready")
const readyLabel = loadConfig().labels.ready
const issues = JSON.parse(readFileSync(new URL("./demo-issues.json", import.meta.url), "utf8"))

for (const issue of issues) {
  const labels = [...(ready ? [readyLabel] : []), ...(issue.labels ?? [])]
  if (!confirmed) {
    console.log(`Would create in ${issue.repo}: ${issue.title}${labels.length ? ` [${labels.join(", ")}]` : ""}`)
    continue
  }
  const args = ["issue", "create", "--repo", issue.repo, "--title", issue.title, "--body", issue.body]
  if (labels.length) args.push("--label", labels.join(","))
  const result = spawnSync("gh", args, { encoding: "utf8" })
  if (result.status !== 0) throw new Error(result.stderr.trim())
  console.log(result.stdout.trim())
}

if (!confirmed) console.log(`\nPreview only. ${issues.length} issues would be created. Add --yes to create them.`)
