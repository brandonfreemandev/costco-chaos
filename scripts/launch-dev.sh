#!/usr/bin/env bash
# Prep and run dev server (port 5173).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Branch: $(git branch --show-current)"
echo "==> npm install"
npm install

echo "==> npm run build"
npm run build

echo "==> npm run validate:routes"
npm run validate:routes

echo "==> Freeing port 5173 if needed"
kill $(lsof -ti :5173) 2>/dev/null || true

echo "==> Starting dev server at http://localhost:5173"
echo "    I warehouse | O checkout | T watchdog | H graph overlay (dev)"
npm run dev
