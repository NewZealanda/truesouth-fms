#!/bin/bash
cd "$(dirname "$0")"
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/*.lock .git/objects/maintenance.lock
echo "Locks cleared. GitHub Desktop should now show Push origin."
read -p "Press Enter to close..."
