#!/bin/bash
#
# # sed (stream editor) 📝
#
# sed -i 's/search/replace/flags' input.txt > output.txt
#
# ## Options 🔧
# - `s/` is a substitute
#   - `p/` is a print (use with `-n` flag)
#   - `d/` is a delete
# - Omit `> output.txt` to simply print the output
# - Regex flags:
#   - `/g` global
#   - `/m` multiline
#   - `/i` case insensitive
#   - `/` no flags
# - Perform multiple commands with multiple `-e 'command'` flags
# - `-r` use extended regular expressions
# - `-n` quiet output
#
# ## Examples 📝
#
# Substitute 'foo' with 'bar' in a file:
# sed -i 's/foo/bar/g' input.txt
#
# Print lines containing 'foo':
# sed -n '/foo/p' input.txt
#
# Delete lines containing 'foo':
# sed '/foo/d' input.txt
#
# Use multiple commands:
# sed -e 's/foo/bar/g' -e '/baz/d' input.txt
#
# Use extended regex:
# sed -r 's/(foo|bar)/baz/g' input.txt
#

sed_all_cases() {
	if [[ $# -lt 3 ]]; then
		echo "Usage: sed_all_cases <search> <replace> <file>"
		return 1
	fi

	search="$1"
  shift
	replace="$1"
  shift
	file="$1"
  shift

	temporary_file="${file}"
	base="$(basename "${file}")"
	dir="$(dirname "${file}")"

	# CONSTANT_CASE (all uppercase, underscores)
	search_constant=$(echo "${search}" | sed 's/ /_/g' | tr '[:lower:]' '[:upper:]')
	replace_constant=$(echo "${replace}" | sed 's/ /_/g' | tr '[:lower:]' '[:upper:]')
	sed -E "s/\b${search_constant}\b/${replace_constant}/g" "${temporary_file}" > "${dir}/${base}.CONSTANT_CASE";
  temporary_file="${dir}/${base}.CONSTANT_CASE"

	# snake_case (all lowercase, underscores)
	search_snake=$(echo "${search}" | sed 's/ /_/g' | tr '[:upper:]' '[:lower:]')
	replace_snake=$(echo "${replace}" | sed 's/ /_/g' | tr '[:upper:]' '[:lower:]')
	sed -E "s/\b${search_snake}\b/${replace_snake}/g" "${temporary_file}" > "${dir}/${base}.snake_case";
  temporary_file="${dir}/${base}.snake_case"

	# kebab-case (all lowercase, hyphens)
	search_kebab=$(echo "${search}" | sed 's/ /-/g' | tr '[:upper:]' '[:lower:]')
	replace_kebab=$(echo "${replace}" | sed 's/ /-/g' | tr '[:upper:]' '[:lower:]')
	sed -E "s/\b${search_kebab}\b/${replace_kebab}/g" "${temporary_file}" > "${dir}/${base}.kebab_case";
  temporary_file="${dir}/${base}.kebab_case"

	# PascalCase (first letter of each word uppercase, no separators)
	search_pascal=$(echo "${search}" | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2))}1' OFS="" )
	replace_pascal=$(echo "${replace}" | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2))}1' OFS="" )
	sed -E "s/\b${search_pascal}\b/${replace_pascal}/g" "${temporary_file}" > "${dir}/${base}.PascalCase";
  temporary_file="${dir}/${base}.PascalCase"

	# camelCase (first word lowercase, rest PascalCase, no separators)
	search_camel=$(echo "${search}" | awk '{for(i=1;i<=NF;i++) $i=(i==1?toupper(substr($i,1,1)):tolower(substr($i,1,1))) tolower(substr($i,2))}1' OFS="" | sed 's/^./\u0000/')
	search_camel=$(echo "${search_camel}" | awk '{print tolower(substr($0,1,1)) substr($0,2)}')
	replace_camel=$(echo "${replace}" | awk '{for(i=1;i<=NF;i++) $i=(i==1?toupper(substr($i,1,1)):tolower(substr($i,1,1))) tolower(substr($i,2))}1' OFS="" | sed 's/^./\u0000/')
	replace_camel=$(echo "${replace_camel}" | awk '{print tolower(substr($0,1,1)) substr($0,2)}')
	sed -E "s/\b${search_camel}\b/${replace_camel}/g" "${temporary_file}" > "${dir}/${base}.camelCase";
  temporary_file="${dir}/${base}.camelCase"

	# UPPERCASE (all uppercase, no separators)
	search_upper=$(echo "${search}" | sed 's/ //g' | tr '[:lower:]' '[:upper:]')
	replace_upper=$(echo "${replace}" | sed 's/ //g' | tr '[:lower:]' '[:upper:]')
	sed -E "s/\b${search_upper}\b/${replace_upper}/g" "${temporary_file}" > "${dir}/${base}.UPPERCASE";
  temporary_file="${dir}/${base}.UPPERCASE"

	# lowercase (all lowercase, no separators)
	search_lower=$(echo "${search}" | sed 's/ //g' | tr '[:upper:]' '[:lower:]')
	replace_lower=$(echo "${replace}" | sed 's/ //g' | tr '[:upper:]' '[:lower:]')
	sed -E "s/\b${search_lower}\b/${replace_lower}/g" "${temporary_file}" > "${dir}/${base}.lowercase";
  temporary_file="${dir}/${base}.lowercase"

	# Output result and clean up
	cat "${temporary_file}"
	rm -f "${dir}/${base}.CONSTANT_CASE" "${dir}/${base}.snake_case" "${dir}/${base}.kebab_case" "${dir}/${base}.PascalCase" "${dir}/${base}.camelCase" "${dir}/${base}.UPPERCASE" "${dir}/${base}.lowercase"
}

sed_all_cases "$@"