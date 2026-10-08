#!/usr/bin/env bash
# Measures the corpus and reports whether it is within its limits.

set -euo pipefail

export CODOMETER_DIRECTORY="${CODOMETER_DIRECTORY:-corpus}"

# Reports every configuration this package ships.
list_examples() {
  local directory
  for directory in examples/*/; do
    printf '%s\n' "${directory%/}"
  done
}

measure() {
  local configuration="$1"
  if [ -f "$configuration" ]; then
    codometer --directory "$CODOMETER_DIRECTORY" --config "$configuration" |
      head -20
  else
    printf 'no configuration at %s\n' "$configuration" >&2
    return 1
  fi
}

while read -r example; do
  measure "$example/codometer.config.ts"
done < <(list_examples)
