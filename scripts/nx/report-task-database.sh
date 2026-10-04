#!/usr/bin/env bash
# Reports what the Nx task-result database holds, so a CI log shows whether a
# run's results were stored and whether a task's hash moved between runs.
#
# Pull request runs hit the restored cache, but merge queue and `main` runs
# hit nothing, even for an identical commit tree with every result adopted
# under the right name. A hit is a lookup of the task's hash alone, so either
# the hash moves between those runs or their results never get stored. This
# prints both sides: row counts, the tasks that ran without a stored result,
# and the recent hashes of a few probe tasks with when each was cached.
#
# With `--inputs`, it also prints a digest of each probe task's resolved input
# files and external packages. A hash that moves while those digests stay put
# points at something other than the inputs Nx lists.
#
# `PROBE_TASKS` overrides the probes, as space-separated `project:target`
# pairs. Diagnostic only: it never fails the job.

set -uo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/task-database.sh"

probe_tasks="${PROBE_TASKS:-logging:typecheck logging:vitest codometer-core:typecheck}"

datastore="$(list_task_databases | head -n 1)"
if [[ -z "${datastore}" ]]; then
  echo "🔬 No Nx task database to report on"
  exit 0
fi

digest() {
  if command -v sha256sum >/dev/null; then
    sha256sum "$@"
  else
    shasum -a 256 "$@"
  fi
}

query() {
  sqlite3 -separator ' ' "${datastore}" "$1" 2>/dev/null || echo "(query failed)"
}

echo "🔬 ${datastore##*/}:" \
  "$(query 'SELECT count(*) FROM cache_outputs;') cached results," \
  "$(query 'SELECT count(*) FROM task_details;') task records," \
  "$(query 'SELECT count(*) FROM task_details WHERE hash NOT IN (SELECT hash FROM cache_outputs);') without a cached result"

for probe in ${probe_tasks}; do
  project="${probe%%:*}"
  target="${probe#*:}"
  echo "🔬 ${probe}, most recent hashes first:"
  query "SELECT '   ' || d.hash || ' ' || coalesce(d.configuration, '-') || ' ' ||
           coalesce(c.created_at, 'not cached') || ' code=' || coalesce(c.code, '-')
         FROM task_details d LEFT JOIN cache_outputs c ON c.hash = d.hash
         WHERE d.project = '${project}' AND d.target = '${target}'
         ORDER BY d.rowid DESC LIMIT 5;"
done

if [[ "${1:-}" == "--inputs" ]]; then
  for probe in ${probe_tasks}; do
    inputs="$(pnpm exec nx show target inputs "${probe}" --json 2>/dev/null)"
    if [[ -z "${inputs}" ]]; then
      echo "🔬 ${probe} inputs: unavailable"
      continue
    fi
    files_digest="$(jq -r '.files[]' <<<"${inputs}" \
      | while IFS= read -r file; do
        digest "${file}" 2>/dev/null || echo "missing ${file}"
      done | digest | cut -c1-16)"
    external_digest="$(jq -c '.external' <<<"${inputs}" | digest | cut -c1-16)"
    echo "🔬 ${probe} inputs: $(jq '.files | length' <<<"${inputs}") files" \
      "digest ${files_digest}, $(jq '.external | length' <<<"${inputs}") external" \
      "digest ${external_digest}, environment $(jq -c '.environment' <<<"${inputs}")"
  done
fi

exit 0
