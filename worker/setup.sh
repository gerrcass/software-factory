#!/bin/bash
# Defines what goes into the worker image. scripts/build-snapshot.mjs runs this
# inside a Box and then takes a snapshot of the result.
#
# Put slow, rarely changing things here: agent CLIs the Box image lacks, agent
# skills, MCP servers, a browser, language toolchains. Keep app code and secrets
# out. Code goes stale, and the factory writes secrets at the start of each job.
#
# Facts about a Box: Debian 12 on ARM64, user "boxuser" with passwordless sudo,
# Node, git, Claude Code and Codex already installed. The stock image has no
# OpenCode CLI, so the factory's workers get it from here.
#
# scripts/build-snapshot.mjs uploads the factory repo's worker/skills/ tree to
# /workspace/home/.image-build/skills/ before this script runs.
set -euo pipefail

# --- OpenCode CLI ------------------------------------------------------------
# Not in the stock Box. Pin the version, and skip the path edits: the workers
# need the binary on the default PATH, not only in login shells.
#   - ~/.opencode/bin is where the installer puts it.
#   - /usr/local/bin is on the default PATH, which plain `sh` (box.exec.command)
#     and the smoke test's "command -v opencode" also see.
#   - /etc/profile.d keeps login shells working even if the symlink changes.
# OPENCODE_DISABLE_AUTOUPDATE=1 is exported for the agent run in
# factory.config.json, and "update": "disable" is written into the Box settings,
# so the binary stays the version built and tested here.
echo "--- opencode"
curl -fsSL https://opencode.ai/v2/install | bash -s -- --version 2.0.31 --no-modify-path
sudo ln -sf "$HOME/.opencode/bin/opencode" /usr/local/bin/opencode
sudo tee /etc/profile.d/opencode.sh > /dev/null <<'PROFILE'
export PATH="$HOME/.opencode/bin:$PATH"
PROFILE

# --- Agent skills (vendored in the factory repo, copied into the image) -----
# worker/AGENTS.md points the agent at these. Global skills apply in every repo;
# a skill that changes under you changes the agent's behaviour, so they are
# pinned by being copied here from a reviewed source in this repo.
echo "--- skills"
mkdir -p "$HOME/.config/opencode/skills"
cp -r /workspace/home/.image-build/skills/frontend-design "$HOME/.config/opencode/skills/"
cp -r /workspace/home/.image-build/skills/before-and-after "$HOME/.config/opencode/skills/"

# --- Browser tooling for agents that check their own work --------------------
# The Box itself has browser access ("browser": true in factory.config.json):
# Upstash runs a Chromium that the factory starts before each job and that then
# listens on port 9222. agent-browser attaches to it, so the Upstash console
# shows what the agent does. Chrome for Testing has no ARM64 Linux build, so
# Debian's chromium is the fallback and the auto-connect is switched on only
# when the port answers. ffmpeg is for agent-browser's recordings.
echo "--- browser"
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq chromium ffmpeg > /dev/null
sudo npm install --global --silent agent-browser
# npm's script policy can skip the package's postinstall, which is what leaves
# the native binary executable; run it and chmod as a belt-and-braces fallback.
# The check below fails the build if agent-browser still cannot run.
sudo node "$(npm root -g)/agent-browser/scripts/postinstall.js" > /dev/null 2>&1 || true
sudo chmod +x "$(npm root -g)/agent-browser/bin/"* 2>/dev/null || true
sudo tee /etc/profile.d/agent-browser.sh > /dev/null <<'PROFILE'
export AGENT_BROWSER_EXECUTABLE_PATH=/usr/bin/chromium
if (exec 3<>/dev/tcp/127.0.0.1/9222) 2>/dev/null; then export AGENT_BROWSER_AUTO_CONNECT=1; fi
PROFILE

# --- MCP servers (example) ---------------------------------------------------
# Configure under mcp.servers in the agent's boxSettings, with keys passed per
# job through the agent type's "auth" entries. Headless Boxes cannot complete
# an OAuth sign-in, so prefer API-key or local servers. See
# docs/worker-environment.md in the factory repo.

# --- Check ---------------------------------------------------------------------
# The build log is the only evidence of what is in the image, and the build
# must fail when something is missing. List every tool the workers rely on.
echo "--- check"
node --version
git --version
# The stock Box ships an OpenCode 1 CLI at /opt/runner/bin (a symlink to the
# platform's runner tooling), and plain `sh` finds that one first. The factory
# always runs the agent as a fresh login shell, where /etc/profile.d/opencode.sh
# puts the pinned v2 first — so assert THAT context. (The build shell itself
# started before the profile file existed, so it still has the old PATH.)
echo "this (build) shell finds: $(command -v opencode) ($(opencode --version 2>/dev/null | head -n 1))"
login_bin="$(bash -lc 'command -v opencode')"
login_version="$(bash -lc 'opencode --version' | head -n 1)"
echo "a fresh login shell (what the agent gets) finds: $login_bin ($login_version)"
case "$login_version" in
  *2.0.31*) echo "ok: the agent's login shell gets the pinned OpenCode" ;;
  *) echo "ERROR: a login shell does not resolve the pinned OpenCode (wanted 2.0.31, got: $login_version)" >&2; exit 1 ;;
esac
echo "agent-browser: $(command -v agent-browser) ($(agent-browser --version 2>&1 | head -n 1))"
chromium --version
ffmpeg -version 2>/dev/null | head -n 1
ls "$HOME/.config/opencode/skills"
test -f "$HOME/.config/opencode/skills/frontend-design/SKILL.md"
test -f "$HOME/.config/opencode/skills/before-and-after/SKILL.md"
echo "ok: skills are in the image"
