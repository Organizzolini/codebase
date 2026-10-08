"""🐍 Python file conformance validation using abstract syntax trees."""

import ast

from python.abstract_syntax_tree import validate_depth_first_search
from python.comments import validate_comments
from python.types import ConformetryDifference


def _syntax_error(*, source: str, difference: SyntaxError) -> ConformetryDifference:
    """Describes a file that could not be parsed at all."""
    return ConformetryDifference(
        difference_type="code",
        language="python",
        message=f"{source} syntax error: {difference}",
        fix=f"Fix the syntax error in the {source.lower()} file.",
    )


def validate_python_conformetry(*, filename: str, instance: str, template: str) -> dict:
    """Validates that a Python file is a structural superset of its template.

    The template arrives already rendered — substitution happens in TypeScript,
    so generation and validation cannot drift apart in how they substitute.
    """
    try:
        template_tree = ast.parse(template, filename=filename)
    except SyntaxError as difference:
        return {"differences": [_syntax_error(source="Template", difference=difference)], "total_weight": 1}

    try:
        instance_tree = ast.parse(instance, filename=filename)
    except SyntaxError as difference:
        return {"differences": [_syntax_error(source="Instance", difference=difference)], "total_weight": 1}

    structure = validate_depth_first_search(
        template_tree, instance_tree, template, instance, filename
    )
    comments = validate_comments(template, instance)

    # The two passes weigh independent things — structure counts syntax nodes,
    # comments count markers — so their totals add rather than one subsuming
    # the other.
    return {
        "differences": [*structure.differences, *comments.differences],
        "total_weight": structure.total_weight + comments.total_weight,
    }
