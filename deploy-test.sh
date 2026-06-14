#!/bin/bash
# ── TrueSouth FMS — Test site deploy ──
# Run this once from ~/Documents/truesouth-fms to:
#   1. Commit + push v22.17 to main (production)
#   2. Create + push the 'test' branch
#   3. Deploy current build to testtruesouth.netlify.app
#
# After this, go to:
#   https://app.netlify.com/projects/testtruesouth/settings/deploys
# and connect the site to the 'test' branch for automatic future deploys.

set -e
cd "$(dirname "$0")"

echo "── Clearing any stale git locks ──"
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/*.lock 2>/dev/null || true

echo "── Step 1: Committing v22.17 and pushing to main ──"
git add -A
git commit -m "v22.17 — unified manifest save/load, close dialog, large seatmap + popup editor, mobile toggle" || echo "(nothing new to commit)"
git push origin main

echo ""
echo "── Step 2: Creating and pushing 'test' branch ──"
git checkout -b test 2>/dev/null || git checkout test
git push -u origin test

echo ""
echo "── Step 3: Deploying to testtruesouth.netlify.app ──"
npx netlify-cli deploy --prod \
  --dir . \
  --site 3bd12f7c-a825-40da-9e29-b11bd9399878 \
  --message "v22.17 initial test deploy"

echo ""
echo "✓ Done! Visit https://testtruesouth.netlify.app"
echo ""
echo "Future workflow:"
echo "  Test: git checkout test → make changes → git push"
echo "  Prod: git checkout main → git merge test → git push"
