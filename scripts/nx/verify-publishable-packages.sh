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
# Spelling files are dropped from the change set first, for the reason
# `run-affected.sh` gives: a shared dictionary is an input of every project's
# `spell-check`, so one new word would otherwise mark every project affected.
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
#   SPELLING_PATHS                      an extended regex overriding which files are spelling

set -euo pipefail

if [[ -z "${NX_BASE:-}" || -z "${NX_HEAD:-}" ]]; then
  echo "❌ NX_BASE and NX_HEAD are unset; run setup-codebase first"
  exit 1
fi

default_spelling_paths='^configuration/\.cspell/|(^|/)cspell\.config\.yaml$'
spelling_paths="${SPELLING_PATHS:-${default_spelling_paths}}"
selection='packages/ic-suite/**,validation'

base="$(git merge-base "${NX_BASE}" "${NX_HEAD}" || echo "${NX_BASE}")"
changed="$(git diff --name-only --no-renames --relative "${base}" "${NX_HEAD}")"
spelling="$(grep -E "${spelling_paths}" <<<"${changed}" || true)"

if [[ -z "${spelling}" ]]; then
  affected="$(
    pnpm exec nx show projects --affected --json --projects="${selection}" \
      --base="${NX_BASE}" --head="${NX_HEAD}"
  )"
else
  echo "✂️ Not counting spelling files as changes:"
  while IFS= read -r spelling_path; do
    printf '  %s\n' "${spelling_path}"
  done <<<"${spelling}"
  kept="$(grep -Ev "${spelling_paths}" <<<"${changed}" || true)"
  affected="$(
    printf '%s\n' "${kept}" \
      | pnpm exec nx show projects --affected --json --stdin \
        --projects="${selection}"
  )"
fi

# Anything other than a JSON array, such as verbose logging on stdout, runs
# the check rather than skipping it.
count="$(jq 'length' <<<"${affected}" 2>/dev/null || echo "unknown")"
if [[ "${count}" == "0" ]]; then
  echo "⏭️ No ic-suite package or the check itself is affected."
  exit 0
fi

echo "📦 Affected: ${affected}"
exec pnpm exec nx run validation:verify-publishable-packages
