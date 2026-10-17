// Checks whether a worker's Box browser starts, the way a factory run needs
// it: Upstash's Chromium starts when a first tab is opened, and from then on
// agent-browser attaches to it inside the Box.
//
// Run with: node --env-file=.env scripts/browser-test.mjs <worker id> [--pause]
import { Box } from "@upstash/box"
import { loadConfig } from "../src/config.mjs"
import { getWorkerStates } from "../src/workers.mjs"

const [workerId, flag] = process.argv.slice(2)
const config = loadConfig()
const worker = (await getWorkerStates(config)).find((w) => w.id === workerId)
const data = worker?.boxId
  ? { id: worker.boxId, status: worker.boxStatus }
  : (await Box.list({ label: config.factory.boxLabel })).find((b) => b.name === workerId)
if (!data) throw new Error(`No worker and no Box of this factory is called "${workerId}"`)
const box = await Box.get(data.id)
if (data.status === "paused") await box.resume()

try {
  await box.browser.tab.create("about:blank")
  console.log("Browser started.")
} catch (error) {
  console.log(`Browser FAILED to start: ${error.message}`)
  process.exitCode = 1
}
if (flag === "--pause") await box.pause()
