#!/usr/bin/env bash
# Vercel "Ignored Build Step" — pointed at by vercel.json "ignoreCommand".
# Exit 0 = skip the build, exit 1 = build.
#
# Build when this is a production deploy OR the branch has an open pull request,
# AND the commit changed something that actually affects the deployed app.
# Skip a bare feature-branch push with no PR, and skip commits that only touch
# docs / videos / operational scripts / editor config.

set -u

if [ "${VERCEL_ENV:-}" != "production" ] && [ -z "${VERCEL_GIT_PULL_REQUEST_ID:-}" ]; then
  echo "skip: preview push with no open PR"
  exit 0
fi

if ! git rev-parse --verify HEAD^ >/dev/null 2>&1; then
  echo "build: no previous commit to diff against"
  exit 1
fi

if git diff --quiet HEAD^ HEAD -- . \
  ':(exclude)docs' ':(exclude)videos' ':(exclude)scripts' \
  ':(exclude)*.md' ':(exclude).claude' ':(exclude).vscode'; then
  echo "skip: only docs / non-app files changed"
  exit 0
fi

echo "build: app files changed"
exit 1
