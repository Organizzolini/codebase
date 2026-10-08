# packages/codometer/src/modules/python/python.service.py
import ast
import io
import json
import re
import sys
import tokenize
from pathlib import Path


def read_paths() -> list[Path]:
    """Read the newline-delimited file list the caller supplies on stdin.

    The caller owns discovery so that every language is measured over the same
    set of files. Walking the tree here instead would also count ignored
    Python -- build output, virtual environments, and sibling git worktrees --
    so the totals depended on whatever sat in the directory.
    """
    return [Path(line.strip()) for line in sys.stdin if line.strip()]


COMMENT_MARKER = re.compile(r"^\s*#+\s?")


def is_shebang(token: tokenize.TokenInfo) -> bool:
    """Whether this is the interpreter line rather than a comment.

    `#!` on the first line is an instruction to the kernel, not prose. Left in,
    it would be grouped with whatever comment follows it, and every script
    opening with a shebang would measure a block whose first word is
    `!/usr/bin/env`.
    """
    return token.start == (1, 0) and token.string.startswith("#!")


def read_comment(token: tokenize.TokenInfo) -> dict[str, object]:
    """Describe one comment the tokenizer found, for measurement upstream.

    Emitted rather than measured here: how long a comment may run is one
    definition shared by every language codometer reads, and it lives in
    `CommentsService`. This side only says what a comment *is*, which is the
    one part `tokenize` knows and a line scanner cannot -- a `#` inside a
    string literal is a STRING token here, never a COMMENT.
    """
    row, column = token.start

    return {
        "line": row,
        "ownLine": token.line[:column].strip() == "",
        "prose": COMMENT_MARKER.sub("", token.string),
        "source": token.string,
    }


def count_docstring(node: ast.AST, stats: dict[str, int]) -> None:
    docstring = ast.get_docstring(node)
    if docstring is None:
        return

    stats["docstrings"] += 1
    stats["docstringLines"] += len(docstring.splitlines())


stats = {
    "files": 0,
    "classes": 0,
    "functions": 0,
    "constants": 0,
    "protocols": 0,
    "imports": 0,
    "decorators": 0,
    "lines": 0,
    "comments": 0,
    "commentLines": 0,
    "docstrings": 0,
    "docstringLines": 0,
}

comments: list[dict[str, object]] = []

for path in read_paths():
    try:
        source = path.read_text(encoding="utf-8")
        tree = ast.parse(source)
        stats["files"] += 1
        stats["lines"] += len(source.splitlines())

        count_docstring(tree, stats)

        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                stats["classes"] += 1
                stats["decorators"] += len(node.decorator_list)
                count_docstring(node, stats)
                if any(getattr(base, "id", "") == "Protocol" for base in node.bases):
                    stats["protocols"] += 1
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                stats["functions"] += 1
                stats["decorators"] += len(node.decorator_list)
                count_docstring(node, stats)
            elif isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id.isupper():
                        stats["constants"] += 1
            elif isinstance(node, (ast.Import, ast.ImportFrom)):
                stats["imports"] += 1

        for token in tokenize.generate_tokens(io.StringIO(source).readline):
            if token.type == tokenize.COMMENT:
                stats["comments"] += 1
                stats["commentLines"] += 1

                if not is_shebang(token):
                    comments.append({**read_comment(token), "file": str(path)})
    except SyntaxError:
        pass

print(json.dumps({**stats, "commentTokens": comments}))
