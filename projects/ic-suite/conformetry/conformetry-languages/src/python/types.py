"""🔎 Conformance difference types for Python validators."""

from dataclasses import dataclass
from typing import Literal

ConformetryDifferenceType = Literal["comment", "directory", "file", "code"]
ConformetryDifferenceLanguage = Literal["javascript", "json", "markdown", "python", "text"]

StringCaseValue = Literal["CAMEL_CASE", "KEBAB_CASE", "PASCAL_CASE", "SNAKE_CASE"]


class StringCase:
    CAMEL_CASE: StringCaseValue = "CAMEL_CASE"
    KEBAB_CASE: StringCaseValue = "KEBAB_CASE"
    PASCAL_CASE: StringCaseValue = "PASCAL_CASE"
    SNAKE_CASE: StringCaseValue = "SNAKE_CASE"


@dataclass
class TreeComparison:
    """What comparing two syntax trees produced.

    The total is reported even when nothing is wrong: a conforming document is
    still evidence, and leaving it out of the denominator would score an
    instance only against the parts of itself that are wrong.
    """

    differences: "list[ConformetryDifference]"
    total_weight: int


@dataclass
class ConformetryDifference:
    """A structured conformance difference produced by any Python validator."""

    difference_type: ConformetryDifferenceType
    fix: str
    message: str
    language: ConformetryDifferenceLanguage | None = None
    instance_line: int | None = None
    instance_column: int | None = None
    instance_path: str | None = None
    template_line: int | None = None
    template_column: int | None = None
    template_path: str | None = None
    expected: str | None = None
    actual: str | None = None
    weight: int = 1
    """Template nodes this one finding stands in for — the missing subtree.

    A validator reports a missing element once, however much of the template
    that element contained, so the weight restores the proportion when the
    instance is scored.
    """
