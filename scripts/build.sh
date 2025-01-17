#!/usr/bin/env sh

command -v pnpm >/dev/null 2>&1 || { echo >&2 "pnpm is not installed.  Aborting."; exit 1; }
command -v npx >/dev/null 2>&1 || { echo >&2 "npx is not installed.  Aborting."; exit 1; }

. "./scripts/devenv.sh" || { echo >&2 "Failed to source devenv.sh. Aborting."; exit 1; }

set -eux

pnpm install || { echo >&2 "Failed to install dependencies. Aborting."; exit 1; }

npx nx run-many --target=build --all \
  --exclude cli \
  --exclude web-wallet \
  --exclude zk.js
