"""🔧 Shared constants for Python validators."""

import re
from collections.abc import Callable

from python.types import StringCase, StringCaseValue

TODO_LINE_REGEX = re.compile(r"\bTODO\b")


def _to_camel_case(s: str) -> str:
    parts = re.split(r"[-_]", s)
    return parts[0] + "".join(word.capitalize() for word in parts[1:])


def _to_pascal_case(s: str) -> str:
    return "".join(word.capitalize() for word in re.split(r"[-_]", s))


def _to_snake_case(s: str) -> str:
    return s.replace("-", "_")


def _to_kebab_case(s: str) -> str:
    return s.replace("_", "-")


human_readable_string_case: dict[StringCaseValue, str] = {
    StringCase.CAMEL_CASE: "camelCase",
    StringCase.KEBAB_CASE: "kebab-case",
    StringCase.PASCAL_CASE: "PascalCase",
    StringCase.SNAKE_CASE: "snake_case",
}

converter_by_string_case: dict[StringCaseValue, Callable[[str], str]] = {
    StringCase.CAMEL_CASE: _to_camel_case,
    StringCase.KEBAB_CASE: _to_kebab_case,
    StringCase.PASCAL_CASE: _to_pascal_case,
    StringCase.SNAKE_CASE: _to_snake_case,
}
