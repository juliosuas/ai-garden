#!/usr/bin/env bash
set -euo pipefail

attempts="${AGENTIC_PUSH_ATTEMPTS:-5}"

for attempt in $(seq 1 "$attempts"); do
  echo "Synchronizing with origin/main before push (attempt ${attempt}/${attempts})..."
  if git pull --rebase origin main && git push; then
    echo "Pushed automated commit to main."
    exit 0
  fi

  echo "Push attempt ${attempt} failed."
  git rebase --abort >/dev/null 2>&1 || true

  if [ "$attempt" -lt "$attempts" ]; then
    sleep $((attempt * 3))
  fi
done

echo "Unable to push automated commit after ${attempts} attempts." >&2
exit 1
