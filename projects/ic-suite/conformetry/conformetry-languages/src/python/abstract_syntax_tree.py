"""🌲 Depth-first search abstract syntax tree conformance validation."""

import ast

from python.nodes import (
    count_subtree,
    filter_by_same_key,
    filter_by_same_type,
    get_children,
    get_key,
)
from python.types import ConformetryDifference, TreeComparison


def _get_node_location(node: ast.AST) -> tuple[int | None, int | None]:
    line = getattr(node, "lineno", None)
    column = getattr(node, "col_offset", None)
    return line, (column + 1 if column is not None else None)


def _build_error(
    template_child: ast.AST, instance_node: ast.AST, filename: str
) -> ConformetryDifference:
    kind = type(template_child).__name__
    key = get_key(template_child)
    breadcrumb = f'{kind} "{key}"' if key is not None else kind
    instance_line, instance_column = _get_node_location(instance_node)
    template_line, template_column = _get_node_location(template_child)
    return ConformetryDifference(
        difference_type="code",
        language="python",
        message=f"Missing {breadcrumb}",
        instance_line=instance_line,
        instance_column=instance_column,
        template_line=template_line,
        template_column=template_column,
        fix=f"Add the missing {breadcrumb} to the instance file. See the template for the expected structure.",
        weight=count_subtree(template_child),
    )


def _failed_weight(differences: list[ConformetryDifference]) -> int:
    return sum(difference.weight for difference in differences)


def _compare_child(
    template_child: ast.AST,
    instance_node: ast.AST,
    instance_children: list[ast.AST],
    template_source: str,
    instance_source: str,
    filename: str,
) -> TreeComparison:
    """Match one template child, descending into whichever instance node fits.

    A child with no counterpart ends the walk on that branch: nothing below it
    can be compared, so its whole subtree counts as both required and absent.
    """
    key = get_key(template_child)
    if key is not None:
        matches = filter_by_same_key(instance_children, template_child)
    else:
        matches = filter_by_same_type(instance_children, template_child)

    if not matches:
        difference = _build_error(template_child, instance_node, filename)
        return TreeComparison(differences=[difference], total_weight=difference.weight)

    candidates = [
        validate_depth_first_search(
            template_child, match, template_source, instance_source, filename
        )
        for match in matches
    ]
    # Weighed by failed weight rather than difference count: one finding standing in
    # for a whole missing class is a worse match than two missing decorators.
    return min(candidates, key=lambda comparison: _failed_weight(comparison.differences))


def validate_depth_first_search(
    template_node: ast.AST,
    instance_node: ast.AST,
    template_source: str,
    instance_source: str,
    filename: str,
) -> TreeComparison:
    """Compare one level of two trees, descending into every match.

    Alongside the differences, the walk counts what it asked for: every
    template node it weighs is one requirement.
    """
    differences: list[ConformetryDifference] = []
    instance_children = get_children(instance_node)
    # The node itself is the one requirement its own level contributes; its
    # children add theirs.
    total_weight = 1
    for template_child in get_children(template_node):
        comparison = _compare_child(
            template_child,
            instance_node,
            instance_children,
            template_source,
            instance_source,
            filename,
        )
        differences.extend(comparison.differences)
        total_weight += comparison.total_weight
    return TreeComparison(differences=differences, total_weight=total_weight)
