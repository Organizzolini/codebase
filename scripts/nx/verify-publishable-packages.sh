#!/usr/bin/env bash
# Runs `validation:verify-publishable-packages` when a change between
# `NX_BASE` and `NX_HEAD` affects an ic-suite package or the check itself, and
# does nothing otherwise.
#
# `nx affected --target=verify-publishable-packages` cannot make that call:
# the target belongs to `validation`, and no ic-suite package is one of its
# dependencies, so a change to any of them never marks `validation` affected.
# The check packs and installs every publishable package, so it runs whole or
# not at all rather than per affected project.
#
# The consumer is created beneath `PUBLISHABLE_PACKAGES_CONSUMER_ROOT`, which
# the workflow points at `$RUNNER_TEMP`: outside the checkout, with no
# `package.json`, `node_modules`, or `pnpm-workspace.yaml` above it, so the
# consumer resolves only what it installed. The check refuses any other kind
# of directory itself.
#
# Inputs, all from the environment:
#   NX_BASE, NX_HEAD                    the revisions, as `nrwl/nx-set-shas` exports them
#   PUBLISHABLE_PACKAGES_CONSUMER_ROOT  where the consumer is created

set -euo pipefail

if [[ -z "${NX_BASE:-}" || -z "${NX_HEAD:-}" ]]; then
  echo "❌ NX_BASE and NX_HEAD are unset; run setup-codebase first"
  exit 1
fi

affected="$(
  pnpm exec nx show projects --affected --json \
    --base="${NX_BASE}" --head="${NX_HEAD}" \
    --projects='packages/ic-suite/**,validation'
)"

if [[ "${affected}" == "[]" ]]; then
  echo "⏭️ No ic-suite package or the check itself is affected."
  exit 0
fi

echo "📦 Affected: ${affected}"
exec pnpm exec nx run validation:verify-publishable-packages
