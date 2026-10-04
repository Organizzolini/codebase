#!/usr/bin/env bash
# Shared helpers for the Nx task-result database scripts beside this file.
# Source it; it defines functions and runs nothing.
#
# Nx decides a cache hit from a row in this SQLite database alone, never from
# `.nx/cache` (see the restore step in `.github/actions/setup-codebase`). Nx
# names the file `<machine-id>-v<schema>.db` and keeps a write-ahead log,
# shared-memory index, and rollback journal beside it, so every operation here
# treats those four files as one database.

# Where Nx keeps the database, honouring the same override Nx itself reads.
task_database_directory() {
  printf '%s' "${NX_WORKSPACE_DATA_DIRECTORY:-.nx/workspace-data}"
}

# Prints every task database, one path per line, and nothing when there are
# none.
list_task_databases() {
  local datastore
  for datastore in "$(task_database_directory)"/*.db; do
    if [[ -e "${datastore}" ]]; then
      printf '%s\n' "${datastore}"
    fi
  done
}

# Removes one database together with its write-ahead log, shared-memory
# index, and rollback journal.
discard_task_database() {
  rm -f "$1" "$1-wal" "$1-shm" "$1-journal"
}

# Prints the most recently modified of the given databases. `actions/cache`
# preserves modification times, so after a restore this is the one the last
# job wrote. Compared with the shell's own `-nt` rather than parsed out of
# `ls -t`, so no file name can be misread.
newest_task_database() {
  local newest="$1"
  shift

  local datastore
  for datastore in "$@"; do
    if [[ "${datastore}" -nt "${newest}" ]]; then
      newest="${datastore}"
    fi
  done
  printf '%s\n' "${newest}"
}

# Discards every given database except the first argument.
discard_other_task_databases() {
  local kept="$1"
  shift

  local datastore
  for datastore in "$@"; do
    if [[ "${datastore}" != "${kept}" ]]; then
      discard_task_database "${datastore}"
    fi
  done
}
