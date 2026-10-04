#!/usr/bin/env bash
# Runs `nx affected` for one target between `NX_BASE` and `NX_HEAD`, dropping
# spelling files from the change set unless `INCLUDE_SPELLING` is "true".
#
# `spell-check` lists the shared dictionaries among its `{workspaceRoot}`
# inputs, and Nx decides affected per project, not per target: one new word in
# a dictionary marks every project affected for every target, so a word list
# edit ran the whole workspace's tests and timed the job out. Only the target
# that runs `spell-check` should see those files.
#
# Handing Nx its list over `--stdin` is the fallback, not the default, because
# Nx reads every file it names as changed in full. A lockfile then touches
# every project, defeating `projectsAffectedByDependencyUpdates: "auto"`, and a
# release commit's one-line `package.json` version bump affected 47 projects
# instead of 3. Only `--base`/`--head` let Nx diff those files field by field,
# so any change set with nothing to drop goes through them unchanged.
#
# The dropped-files list is built the way Nx builds its own: the merge base of
# the two revisions, falling back to `NX_BASE` itself, then
# `git diff --name-only --no-renames --relative`. An empty list affects nothing
# and exits cleanly; it never falls back to everything.
#
# Inputs, all from the environment:
#   TARGET            the Nx target to run (required)
#   ARGUMENTS         extra `nx affected` flags, space separated
#   INCLUDE_SPELLING  "true" to keep spelling files
#   NX_BASE, NX_HEAD  the revisions, as `nrwl/nx-set-shas` exports them
#   SPELLING_PATHS    an extended regex overriding which files are spelling

set -euo pipefail

if [[ -z "${TARGET:-}" ]]; then
  echo "❌ TARGET is unset; name the Nx target to run"
  exit 1
fi

if [[ -z "${NX_BASE:-}" || -z "${NX_HEAD:-}" ]]; then
  echo "❌ NX_BASE and NX_HEAD are unset; run setup-codebase first"
  exit 1
fi

default_spelling_paths='^configuration/\.cspell/|(^|/)cspell\.config\.yaml$'
spelling_paths="${SPELLING_PATHS:-${default_spelling_paths}}"

arguments=()
read -ra arguments <<<"${ARGUMENTS:-}"

spelling=""
if [[ "${INCLUDE_SPELLING:-false}" != "true" ]]; then
  base="$(git merge-base "${NX_BASE}" "${NX_HEAD}" || echo "${NX_BASE}")"
  changed="$(git diff --name-only --no-renames --relative \
    "${base}" "${NX_HEAD}")"
  spelling="$(grep -E "${spelling_paths}" <<<"${changed}" || true)"
fi

if [[ -z "${spelling}" ]]; then
  exec pnpm exec nx affected --base="${NX_BASE}" --head="${NX_HEAD}" \
    --target="${TARGET}" ${arguments[@]+"${arguments[@]}"}
fi

echo "✂️ Not affecting ${TARGET} with spelling files:"
while IFS= read -r spelling_path; do
  printf '  %s\n' "${spelling_path}"
done <<<"${spelling}"

kept="$(grep -Ev "${spelling_paths}" <<<"${changed}" || true)"
printf '%s\n' "${kept}" \
  | pnpm exec nx affected --stdin --target="${TARGET}" \
    ${arguments[@]+"${arguments[@]}"}
