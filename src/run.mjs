// Takes one ready issue from start to pull request.
//
// Run with: node --env-file=.env src/run.mjs owner/app-repo 12
import { loadConfig, findRepo } from "./config.mjs"
import { getIssue, getHumanComments, addLabels, removeLabel, comment, openPullRequest } from "./github.mjs"
import { claimWorker, releaseWorker, sh, q, runScript, startBrowser } from "./box.mjs"
import { signIn, writeJobFiles, writeRepoEnv, runAgent, secretPaths, REPO_ENV_FILE } from "./agents.mjs"
import { spawnSync } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const WORK_DIR = "/workspace/home/work"
const NO_STORE = "-c credential.helper="
const NEEDS_CLARIFICATION = "NEEDS_CLARIFICATION:"
// Where the agent leaves visual proof (see worker/AGENTS.md). The factory
// publishes it to the pull request; the folder is inside the job's sign-in
// cleanup path, so nothing survives the job either way.
const PROOF_DIR = "/workspace/home/.factory/artifacts"
const PROOF_START = "<!-- before-and-after:start -->"
const PROOF_END = "<!-- before-and-after:end -->"
const MAX_PROOF_BYTES = 8 * 1024 * 1024
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"])
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm"])
const PROOF_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS])

// Same contract as the before-and-after skill's replaceMarkedBlock: replace
// the single marked block in place, or append it when there is none. Done
// here because pairs and previews are two formatter calls that share one block.
function replaceProofBlock(body, block) {
  const start = body.indexOf(PROOF_START)
  const end = body.indexOf(PROOF_END)
  if (start === -1 || end === -1 || end < start) return `${body.trimEnd()}\n\n${block}\n`
  const before = body.slice(0, start).trimEnd()
  const after = body.slice(end + PROOF_END.length).trim()
  return [before, block, after].filter(Boolean).join("\n\n") + "\n"
}

const [repoName = process.env.FACTORY_REPO, issueNumber = process.env.FACTORY_ISSUE] = process.argv.slice(2)
const runId = process.env.GITHUB_RUN_ID ?? `local${Date.now().toString().slice(-9)}`
const runUrl = process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : null
const hideToken = (text) => String(text).replaceAll(process.env.FACTORY_GITHUB_TOKEN || "<no token>", "***")

function buildPrompt(repo, issue, comments, extra = "") {
  // A person who answers the agent's question in a comment is heard this way.
  const said = comments.map((c) => `**${c.author}:** ${c.body.trim()}\n`)
  const discussion = said.length ? ["", "# Comments on the issue, oldest first", "", ...said].join("\n") : ""
  const checks = repo.checks.length
    ? `After you finish, these commands must pass. Run them yourself before you stop:\n${repo.checks.map((c) => `    ${c}`).join("\n")}`
    : "This repo has no automated checks, so read your change again before you stop."
  return `You are a coding agent. The repository ${repo.repo} is checked out in the current folder on a new branch.

Implement this GitHub issue.

# Issue #${issue.number}: ${issue.title}

${issue.body?.trim() || "(The issue has no description.)"}
${discussion}
# Rules

These rules win over any other instructions you have been given, including house rules files.

- Make the smallest change that fully solves the issue. Follow the style of the existing code.
- Do not run git commit, git push or change git settings. The factory does that after you.
- Do not touch anything in .github/.
- ${checks}
- If the change is visible in a UI, leave the visual proof (screenshots and a short recording) in the artifacts folder, exactly as your AGENTS.md describes. The factory attaches it to the pull request for you.
- When you are done, reply with a short summary of what you changed. It becomes the pull request description.
- If the issue is too unclear to implement, change nothing and start your reply with "${NEEDS_CLARIFICATION}" followed by your question.
${extra}`
}

const details = (title, text) => `<details><summary>${title}</summary>\n\n\`\`\`\n${hideToken(text).slice(-3000)}\n\`\`\`\n\n</details>`

// Attaches the visual proof the agent left in the Box to the pull request.
// The files come over as base64, the before-and-after skill's formatter builds
// its marked block, and `gh pr edit --attach` uploads the media to GitHub and
// rewrites the local references to attachment URLs, which render as images
// (side-by-side tables) and videos (playable). A failure here never fails the
// run: the pull request is already open, and the log says what happened.
async function publishProof(box, repo, prNumber, prBody) {
  const listing = (await sh(box, `ls -1 ${PROOF_DIR} 2>/dev/null`, { allowFailure: true })).output.trim()
  const names = listing ? listing.split("\n").map((line) => line.trim()).filter(Boolean) : []
  const kept = []
  for (const name of names) {
    if (!/^[A-Za-z0-9._-]+$/.test(name)) continue
    if (!PROOF_EXTENSIONS.has(name.slice(name.lastIndexOf(".")).toLowerCase())) continue
    const size = Number((await sh(box, `stat -c %s ${q(`${PROOF_DIR}/${name}`)} 2>/dev/null || echo 0`, { allowFailure: true })).output.trim())
    if (size > 0 && size <= MAX_PROOF_BYTES) kept.push(name)
    else console.log(`  proof: skipping ${name} (${size || "unknown"} bytes)`)
  }
  if (!kept.length) return 0

  const dir = mkdtempSync(join(tmpdir(), "factory-proof-"))
  for (const name of kept) {
    const base64 = (await sh(box, `base64 -w0 ${q(`${PROOF_DIR}/${name}`)}`)).output.replace(/\s+/g, "")
    writeFileSync(join(dir, name), Buffer.from(base64, "base64"))
  }

  const formatter = fileURLToPath(new URL("../worker/skills/before-and-after/scripts/format.mjs", import.meta.url))
  const runFormatter = (args) => {
    const result = spawnSync("node", [formatter, ...args], { cwd: dir, encoding: "utf8" })
    if (result.status !== 0) throw new Error(`format.mjs: ${result.stderr.trim()}`)
    return result.stdout
  }
  const stripMarkers = (block) => block.split("\n").filter((line) => !line.startsWith("<!-- before-and-after:")).join("\n").trim()
  const ghEnv = { ...process.env, GH_TOKEN: process.env.FACTORY_GITHUB_TOKEN }

  const imageNames = kept.filter((name) => IMAGE_EXTENSIONS.has(name.slice(name.lastIndexOf(".")).toLowerCase()))
  const videoNames = kept.filter((name) => VIDEO_EXTENSIONS.has(name.slice(name.lastIndexOf(".")).toLowerCase()))
  const pairUp = (names) => {
    const pairs = []
    const previews = []
    const paired = new Set()
    for (const name of names) {
      const match = /^(.*)-before(\.[a-z0-9]+)$/i.exec(name)
      const after = match ? `${match[1]}-after${match[2]}` : null
      if (after && names.includes(after) && !paired.has(after)) {
        paired.add(name)
        paired.add(after)
        pairs.push({ before: name, after, label: match[1].replace(/[-_]+/g, " ").replace(/^./, (c) => c.toUpperCase()) })
      }
    }
    for (const name of names) {
      if (paired.has(name) || /-before\.[a-z0-9]+$/i.test(name)) continue // unmatched before shots add nothing
      previews.push(name)
    }
    return { pairs, previews }
  }

  // Screenshots: local references, rewritten to attachment URLs by gh --attach.
  const images = pairUp(imageNames)
  const parts = []
  const attachFiles = []
  if (images.pairs.length) {
    const args = images.pairs.flatMap((pair) => ["--before", pair.before, "--after", pair.after, "--label", pair.label])
    parts.push(stripMarkers(runFormatter(args)))
    attachFiles.push(...runFormatter(["--attach-list", ...args]).split("\n").map((line) => line.trim()).filter(Boolean))
  }
  if (images.previews.length) {
    const args = images.previews.flatMap((name) => ["--after", name])
    parts.push(stripMarkers(runFormatter(args)))
    attachFiles.push(...runFormatter(["--attach-list", ...args]).split("\n").map((line) => line.trim()).filter(Boolean))
  }

  // Recordings: gh --attach cannot rewrite a <video src>, and an image
  // reference to a video renders as a link. So the skill's two-step path is
  // used: upload through a temporary comment, collect the attachment URLs,
  // build the <video> table from them, and delete the comment afterwards.
  let uploadCommentId = null
  const videos = pairUp(videoNames)
  if (videos.pairs.length || videos.previews.length) {
    const marker = `<!-- factory-proof-upload:${Date.now()} -->`
    const videoPairs = [...videos.pairs, ...videos.previews.map((name) => ({ before: null, after: name, label: null }))]
    const ordered = []
    const uploadLines = [marker, ""]
    for (const [index, pair] of videoPairs.entries()) {
      if (pair.before) {
        uploadLines.push(`![before-${index}](./${pair.before})`, "")
        ordered.push(pair.before)
      }
      uploadLines.push(`![after-${index}](./${pair.after})`, "")
      ordered.push(pair.after)
    }
    writeFileSync(join(dir, "proof-upload.md"), uploadLines.join("\n"))
    const post = spawnSync("gh", ["pr", "comment", String(prNumber), "--repo", repo, "--body-file", "proof-upload.md", ...ordered.flatMap((file) => ["--attach", file])], { cwd: dir, encoding: "utf8", env: ghEnv })
    if (post.status !== 0) throw new Error(`gh pr comment --attach: ${post.stderr.trim()}`)
    const list = spawnSync("gh", ["api", `repos/${repo}/issues/${prNumber}/comments?per_page=100`, "--paginate"], { cwd: dir, encoding: "utf8", env: ghEnv })
    if (list.status !== 0) throw new Error(`reading the upload comment: ${list.stderr.trim()}`)
    const comment = [...JSON.parse(list.stdout)].reverse().find((c) => c.body?.includes(marker))
    if (!comment) throw new Error("the proof upload comment could not be found")
    uploadCommentId = comment.id
    const urls = [...comment.body.matchAll(/https:\/\/github\.com\/user-attachments\/assets\/[A-Za-z0-9-]+/g)].map((m) => m[0])
    if (urls.length !== ordered.length) throw new Error(`expected ${ordered.length} uploaded URLs, found ${urls.length}`)
    const urlFor = new Map(ordered.map((file, index) => [file, urls[index]]))
    const videoArgs = videoPairs.flatMap((pair) => [
      ...(pair.before ? ["--before-video-url", urlFor.get(pair.before)] : []),
      "--after-video-url", urlFor.get(pair.after),
      "--label", pair.label ?? "Recording",
    ])
    parts.push(stripMarkers(runFormatter(videoArgs)))
  }

  const block = `${PROOF_START}\n${parts.join("\n\n")}\n${PROOF_END}`
  writeFileSync(join(dir, "pr-body-next.md"), replaceProofBlock(prBody, block))
  const edit = spawnSync("gh", ["pr", "edit", String(prNumber), "--repo", repo, "--body-file", "pr-body-next.md", ...attachFiles.flatMap((file) => ["--attach", file])], { cwd: dir, encoding: "utf8", env: ghEnv })
  if (edit.status !== 0) throw new Error(`gh pr edit --attach: ${edit.stderr.trim()}`)
  if (uploadCommentId) {
    const cleanup = spawnSync("gh", ["api", "-X", "DELETE", `repos/${repo}/issues/comments/${uploadCommentId}`], { cwd: dir, encoding: "utf8", env: ghEnv })
    if (cleanup.status !== 0) console.warn("The temporary proof upload comment was not deleted; it holds no secrets.")
  }
  return kept.length
}

// All commands of one kind run as one bash login script, so a line like
// `source .venv/bin/activate` still applies to the lines after it, and tools
// put on PATH by the worker image are found.
async function runCommands(box, kind, repoDir, jobDir, commands, timeoutMinutes) {
  if (commands.length === 0) return { passed: true }
  for (const command of commands) console.log(`  $ ${command}`)
  const body = [`source ${REPO_ENV_FILE} 2>/dev/null || true`, `cd ${q(repoDir)}`, ...commands.flatMap((command) => [`#STEP ${command}`, `${command} || exit $?`])]
  const result = await runScript(box, { name: kind, dir: jobDir, body, timeoutMinutes })
  return { passed: result.code === 0, command: result.step, output: result.log }
}

async function main() {
  if (!repoName || !issueNumber) throw new Error("Usage: node src/run.mjs <owner/repo> <issue number>")
  const config = loadConfig()
  const labels = config.labels
  const repo = findRepo(config, repoName)
  if (!repo) throw new Error(`${repoName} is not in factory.config.json`)

  // The label path is guarded in the app repo's trigger. This guards the
  // "Run workflow" button, which anyone with write access to this repo can press.
  if (process.env.GITHUB_EVENT_NAME === "workflow_dispatch" && !config.factory.allowedActors.includes(process.env.GITHUB_ACTOR)) {
    throw new Error(`${process.env.GITHUB_ACTOR} is not in factory.allowedActors, so this manual run is refused.`)
  }

  const issue = await getIssue(repo.repo, issueNumber)
  const issueLabels = issue.labels.map((l) => l.name)
  console.log(`Issue ${repo.repo}#${issue.number}: ${issue.title}`)
  if (issue.state !== "open" || !issueLabels.includes(labels.ready)) {
    console.log(`Not open with the "${labels.ready}" label. Skipping.`)
    return
  }

  // Reports a problem on the issue and hands it back to a human.
  const needsAttention = async (message) => {
    await removeLabel(repo.repo, issue.number, labels.ready)
    await removeLabel(repo.repo, issue.number, labels.running)
    await addLabels(repo.repo, issue.number, [labels.needsAttention])
    await comment(repo.repo, issue.number, `${message}${runUrl ? `\n\n[Factory run](${runUrl})` : ""}`)
    console.log(`Issue labelled ${labels.needsAttention}.`)
  }

  // An agent:<name> label that no enabled worker can serve would otherwise keep
  // this run waiting for the full timeout.
  const forced = issueLabels.map((l) => /^agent:(.+)$/.exec(l)?.[1]).find(Boolean)
  if (forced && !config.workers.some((w) => w.enabled && w.agent === forced)) {
    await needsAttention(`The label \`agent:${forced}\` asks for an agent type that has no enabled worker. Remove or change that label, then add \`${labels.ready}\` again.`)
    return
  }

  const claim = await claimWorker(config, issueLabels, runId)
  if (!claim) {
    await comment(repo.repo, issue.number, `The factory had no free worker in time. Remove and re-add the \`${labels.ready}\` label to try again.`)
    throw new Error("No free worker in time")
  }
  const { worker, box } = claim
  console.log(`Worker ${worker.id} (${worker.agent}) claimed. Box: ${worker.boxName} (${box.id})`)

  try {
    await removeLabel(repo.repo, issue.number, labels.ready)
    await removeLabel(repo.repo, issue.number, labels.needsAttention)
    await addLabels(repo.repo, issue.number, [labels.running])
    await comment(
      repo.repo,
      issue.number,
      `Worker \`${worker.id}\` (${worker.agent}) picked this up.${runUrl ? ` [Follow the run](${runUrl}).` : ""}`,
    )

    const token = process.env.FACTORY_GITHUB_TOKEN
    const branch = `${config.factory.branchPrefix}${issue.number}`
    const repoDir = `${WORK_DIR}/${repo.repo.split("/")[1]}`
    const jobDir = `${WORK_DIR}/.job`
    const authedUrl = `https://x-access-token:${token}@github.com/${repo.repo}.git`
    const stepMinutes = config.factory.commandTimeoutMinutes ?? 20

    console.log("\nPreparing the workspace...")
    // The Box image tells git to save credentials on disk. NO_STORE switches that
    // off for our commands, and any saved file is removed, so the agent cannot
    // find the GitHub token.
    await sh(box, `rm -rf ${q(repoDir)} ${jobDir} ${q(PROOF_DIR)} ~/.git-credentials && mkdir -p ${jobDir}`)
    await sh(box, `git ${NO_STORE} clone --quiet --depth 50 --branch ${q(repo.baseBranch)} ${q(authedUrl)} ${q(repoDir)}`)
    // The token is removed from the clone here and only used again for the push.
    // The committer name can be a recognisable AI persona per worker
    // (workers[].gitAuthorName); the email always stays the real team member's.
    const gitAuthorName = worker.gitAuthorName ?? config.factory.gitAuthor.name
    await sh(
      box,
      `cd ${q(repoDir)} && git remote set-url origin https://github.com/${repo.repo}.git && git checkout --quiet -b ${q(branch)} && git config user.name ${q(gitAuthorName)} && git config user.email ${q(config.factory.gitAuthor.email)}`,
    )
    // Things the setup creates inside the repo folder (a virtualenv, caches) must
    // not end up in the pull request when the repo's own .gitignore misses them.
    if (repo.exclude?.length) {
      await sh(box, `cd ${q(repoDir)} && printf '%s\\n' ${repo.exclude.map(q).join(" ")} >> .git/info/exclude`)
    }

    await writeRepoEnv(box, repo)
    const comments = await getHumanComments(repo.repo, issue.number)
    const setup = await runCommands(box, "setup", repoDir, jobDir, repo.setup, stepMinutes)
    if (!setup.passed) {
      await needsAttention(`The repo's setup command \`${setup.command}\` failed in the worker Box, so the agent was not started. This is a factory or worker image problem, not a problem with the issue.\n\n${details("Setup output", setup.output)}`)
      return
    }

    console.log(`\nSigning in ${worker.agent} and starting the agent...`)
    await signIn(box, config, worker.agent)
    await writeJobFiles(box, config, worker.agent)
    // Chromium has to be running before the agent's login shell starts, because
    // that is when the worker image decides whether a browser tool attaches to it.
    if (await startBrowser(box, config)) console.log("The Box's browser is running.")
    const timeoutMinutes = config.factory.agentTimeoutMinutes ?? 25
    let result = await runAgent(box, config, worker.agent, { workDir: repoDir, jobDir, prompt: buildPrompt(repo, issue, comments), timeoutMinutes })
    console.log(`Agent finished in ${result.minutes} min with exit code ${result.code}.`)

    if (result.code !== 0) {
      await needsAttention(`The ${worker.agent} agent stopped with an error.\n\n${details("Agent log", result.log)}`)
      return
    }
    // Some agents print a line or two before the marker, so look for it at the
    // start of any line, not only at the start of the reply.
    const question = new RegExp(`^[ \\t]*${NEEDS_CLARIFICATION}(.*)`, "ms").exec(result.summary)
    if (question) {
      await needsAttention(`The agent needs more detail before it can start:\n\n> ${question[1].trim()}\n\nAnswer in a comment or edit the issue, then add the \`${labels.ready}\` label again.`)
      return
    }

    console.log("\nRunning checks...")
    let checks = await runCommands(box, "checks", repoDir, jobDir, repo.checks, stepMinutes)
    if (!checks.passed) {
      console.log(`Check failed: ${checks.command}. Giving the agent one chance to fix it.`)
      const extra = `\n# A check failed after your first attempt\n\nThe command \`${checks.command}\` failed with this output. Fix it.\n\n${checks.output.slice(-3000)}\n`
      result = await runAgent(box, config, worker.agent, { workDir: repoDir, jobDir, prompt: buildPrompt(repo, issue, comments, extra), timeoutMinutes })
      checks = result.code === 0 ? await runCommands(box, "checks", repoDir, jobDir, repo.checks, stepMinutes) : checks
    }
    if (!checks.passed) {
      await needsAttention(`The change did not pass \`${checks.command}\`, so no pull request was opened.\n\n${details("Check output", checks.output)}`)
      return
    }

    const status = (await sh(box, `cd ${q(repoDir)} && git add -A && git status --porcelain`)).output.trim()
    if (!status) {
      await needsAttention(`The agent finished without changing any files.\n\n${details("Agent reply", result.summary || result.log)}`)
      return
    }
    console.log(`\nChanged files:\n${status}`)

    const title = issue.title
    await sh(box, `cd ${q(repoDir)} && git commit --quiet -m ${q(`${title}\n\nCloses #${issue.number}`)}`)
    await sh(box, `cd ${q(repoDir)} && git ${NO_STORE} push --quiet --force ${q(authedUrl)} ${q(`${branch}:${branch}`)}`)

    const checkLine = repo.checks.length ? `Checks passed: ${repo.checks.map((c) => `\`${c}\``).join(", ")}.` : "This repo has no automated checks."
    const prBody = `Closes #${issue.number}\n\n${result.summary || "(The agent gave no summary.)"}\n\n---\nBuilt by factory worker \`${worker.id}\` (${worker.agent}) in an Upstash Box. ${checkLine}${runUrl ? ` [Factory run](${runUrl}).` : ""}`
    const pr = await openPullRequest(repo.repo, {
      head: branch,
      base: repo.baseBranch,
      title,
      body: prBody,
    })
    console.log(`\nPull request: ${pr.html_url}`)
    try {
      const attached = await publishProof(box, repo.repo, pr.number, prBody)
      if (attached) console.log(`Attached ${attached} visual-proof file(s) to the pull request.`)
    } catch (error) {
      console.warn(`Visual proof was not attached: ${error.message}`)
    }

    await removeLabel(repo.repo, issue.number, labels.running)
    await addLabels(repo.repo, issue.number, [labels.review])
    await comment(repo.repo, issue.number, `Pull request ready for review: ${pr.html_url}`)
  } catch (error) {
    await needsAttention(`The factory hit an error:\n\n\`\`\`\n${hideToken(error.message).slice(0, 1500)}\n\`\`\``).catch(() => {})
    throw error
  } finally {
    // A paused Box keeps its disk, so sign-in files are removed after every job.
    await sh(box, `rm -rf ${secretPaths(config).map(q).join(" ")} ~/.git-credentials`, { allowFailure: true }).catch(() => {})
    await releaseWorker(config, claim)
  }
}

try {
  await main()
} catch (error) {
  console.error(`\nFactory run failed: ${hideToken(error.message)}`)
  process.exitCode = 1
}
