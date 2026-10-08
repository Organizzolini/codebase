"""💬 Comment extraction and validation utilities for Python AST."""

import io
import tokenize

from python.constants import TODO_LINE_REGEX
from python.types import ConformetryDifference, TreeComparison


def extract_comments(source: str) -> list[tuple[str, int, int]]:
    """Extract (comment_text, line, column) from Python source using tokenize."""
    comments = []
    try:
        tokens = tokenize.generate_tokens(io.StringIO(source).readline)
        for tok_type, tok_str, (srow, scol), _, _ in tokens:
            if tok_type == tokenize.COMMENT:
                comments.append((tok_str, srow, scol))
    except tokenize.TokenError:
        pass
    return comments


def validate_comments(template_source: str, instance_source: str) -> TreeComparison:
    """Report each template comment the instance lacks, and how many were checked.

    Every template comment is one requirement, whatever its length: a section
    marker is a marker.
    """
    template_comments = extract_comments(template_source)
    instance_comment_texts = [c[0] for c in extract_comments(instance_source)]
    differences = []
    start_pos = 0
    for comment_text, template_line, template_column in template_comments:
        is_todo = bool(TODO_LINE_REGEX.search(comment_text))
        index = next(
            (
                i
                for i, ic in enumerate(instance_comment_texts[start_pos:])
                if is_todo or ic == comment_text
            ),
            -1,
        )
        if index == -1:
            differences.append(
                ConformetryDifference(
                    difference_type="comment",
                    language="python",
                    message=f'Missing comment: "{comment_text}"',
                    template_line=template_line,
                    template_column=template_column + 1,
                    expected=comment_text,
                    fix=f"Add the comment `{comment_text}` to the instance file at or near line {template_line}.",
                )
            )
        else:
            start_pos += index + 1
    return TreeComparison(differences=differences, total_weight=len(template_comments))
