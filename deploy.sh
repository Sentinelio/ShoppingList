#!/bin/bash
# deploy.sh — Reliable deploy to gh-pages
# Always copies built files via /tmp to avoid gitignore/checkout issues
set -e

echo "=== Building ==="
npm install --silent 2>/dev/null
npm run build

echo "=== Copying dist to /tmp ==="
rm -rf /tmp/gh-deploy-files
mkdir -p /tmp/gh-deploy-files/assets
cp dist/index.html /tmp/gh-deploy-files/
cp dist/assets/* /tmp/gh-deploy-files/assets/
cp dist/manifest.json /tmp/gh-deploy-files/
cp dist/sw.js /tmp/gh-deploy-files/
cp dist/favicon.svg /tmp/gh-deploy-files/
cp dist/icons.svg /tmp/gh-deploy-files/

# Verify the built HTML references existing asset files
echo "=== Verifying references ==="
for ref in $(grep -oP 'assets/index-[^"]+' /tmp/gh-deploy-files/index.html); do
  if [ ! -f "/tmp/gh-deploy-files/$ref" ]; then
    echo "ERROR: index.html references $ref but file does not exist!"
    exit 1
  fi
  echo "  OK: $ref"
done

echo "=== Switching to gh-pages ==="
CURRENT_BRANCH=$(git branch --show-current)
git stash --quiet 2>/dev/null || true
git checkout gh-pages

echo "=== Updating gh-pages ==="
rm -f assets/index-*.js assets/index-*.css
cp /tmp/gh-deploy-files/index.html .
cp /tmp/gh-deploy-files/assets/* assets/
cp /tmp/gh-deploy-files/manifest.json .
cp /tmp/gh-deploy-files/sw.js .
cp /tmp/gh-deploy-files/favicon.svg .
cp /tmp/gh-deploy-files/icons.svg .

# Final verification: HTML refs match actual files
echo "=== Final verification ==="
for ref in $(grep -oP 'assets/index-[^"]+' index.html); do
  if [ ! -f "$ref" ]; then
    echo "FATAL: $ref missing on gh-pages!"
    git checkout "$CURRENT_BRANCH"
    git stash pop --quiet 2>/dev/null || true
    exit 1
  fi
  echo "  DEPLOYED: $ref"
done

echo "=== Committing and pushing ==="
git add -A
git commit -m "deploy: $(date +%Y-%m-%d\ %H:%M)" --allow-empty
git push origin gh-pages --force

echo "=== Returning to $CURRENT_BRANCH ==="
git checkout "$CURRENT_BRANCH"
git stash pop --quiet 2>/dev/null || true

echo "=== Done! ==="
rm -rf /tmp/gh-deploy-files
