#!/bin/bash
#
# # grep (global regular expression print) 🔎
#
# grep [options] '[regexp]' [file or directory]
#
# ## Options 🔧
# - `-i` case insensitive
# - `-w` whole word search
# - `-E` Use extended regular expressions. This allows for more complex patterns.
# - `-v` Invert match, showing non-matching lines.
# - `-r` or `-R` Recursively search directories.
# - `-l` Print only the names of files with matching lines.
# - `-c` Print only a count of matching lines per file.
# - `-n` Prefix each line of output with the line number in the input file.
# - `--color=auto` Highlight matching strings.
#
# ## Examples 📝
#
# Search for a word in a file:
# `grep "word" file.txt`
#
# Search for a word in a case-insensitive way:
# `grep -i "word" file.txt`
#
# Search for a whole word:
# `grep -w "word" file.txt`
#
# Recursively search for a word in a directory:
# `grep -r "word" .`
#
# Count the number of times a word appears in a file:
# `grep -c "word" file.txt`
#
# Find files that contain a word:
# `grep -l "word" *`
#
# Show lines that do not contain a word:
# `grep -v "word" file.txt`
#
# Use `grep` with pipes:
# `ps aux | grep "nginx"`
# `ls -l | grep ".txt"`

# ------------------------------------------------------------------------------
# Function to search for a term in multiple casings and spacings
# ------------------------------------------------------------------------------
# This function converts an input string (like 'my variable name', 'myVariableName',
# or 'my_variable_name') into a regular expression that matches various forms:
# - camelCase: myVariableName
# - PascalCase: MyVariableName
# - snake_case: my_variable_name
# - kebab-case: my-variable-name
# - space-separated: my variable name
# It then uses this regex with grep to perform a case-insensitive search.

grep_all_cases() {
    if [[ $# -lt 1 ]]; then
        echo "Usage: $0 <query> [grep_options] [file...]"
        echo "This script searches for a term in all possible casings and spacings (camelCase, snake_case, etc.)."
        return 1
    fi

    query="$1"
    shift # Remove the first argument (the query) so that $@ contains only grep options and files

    # Step 1: Insert a space before each uppercase letter (to split camelCase/PascalCase)
    spaced_camel_pascal=$(awk '{ gsub(/[A-Z]/, " &"); print }' <<<"${query}")

    # Step 2: Replace underscores and hyphens with spaces (to split snake_case/kebab-case)
    spaced_all_separators=${spaced_camel_pascal//[_-]/ }

    # Step 3: Convert the entire string to lowercase
    lowercase_query=$(echo "${spaced_all_separators}" | tr '[:upper:]' '[:lower:]')

    # Step 4: Squeeze multiple spaces into a single space
    single_spaced_query=$(echo "${lowercase_query}" | tr -s ' ')

    # Step 5: Trim leading and trailing whitespace
    trimmed_query=$(echo "${single_spaced_query}" | sed 's/^ *//;s/ *$//')

    # Create a regex from the normalized words. This regex allows for different
    # separators (space, underscore, hyphen, or no separator) between words.
    flexible_separator_regex=${trimmed_query// /[ _-]*}

    # Run grep with the generated regex.
    # -i: case-insensitive search
    # -E: use extended regular expressions
    # --color=auto: highlight matches
    echo "🔎 Searching with regex: ${flexible_separator_regex}"
    grep -iE --color=auto "${flexible_separator_regex}" "$@"
}

grep_all_cases "$@"
