// Read-only: lists every Box visible to UPSTASH_BOX_API_KEY. Creates nothing.
import { Box } from "@upstash/box"

const boxes = await Box.list()
if (boxes.length === 0) console.log("No boxes on this account.")
for (const b of boxes) {
  console.log([b.id, b.name ?? "(no name)", b.status, (b.labels ?? []).join(","), b.created_at ?? b.createdAt ?? ""].join("  |  "))
}
