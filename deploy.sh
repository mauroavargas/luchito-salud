#!/usr/bin/env bash
# Publica la app en GitHub Pages (rama gh-pages).
# Uso: ./deploy.sh
set -euo pipefail

cd "$(dirname "$0")"

npm run build
touch dist/.nojekyll

TMP=$(mktemp -d)
cp -R dist/. "$TMP/"

git add -A
git commit -m "chore: build" --allow-empty -q || true

git worktree remove --force .gh-pages 2>/dev/null || true
git fetch origin gh-pages 2>/dev/null && git worktree add .gh-pages gh-pages \
  || git worktree add --detach .gh-pages

cd .gh-pages
git checkout -B gh-pages
rm -rf ./*
cp -R "$TMP/." .
git add -A
git commit -m "deploy: $(date +%Y-%m-%d\ %H:%M)" -q || echo "sin cambios"
git push -f origin gh-pages
cd ..
git worktree remove --force .gh-pages
rm -rf "$TMP"

echo "Listo: https://mauroavargas.github.io/luchito-salud/"
