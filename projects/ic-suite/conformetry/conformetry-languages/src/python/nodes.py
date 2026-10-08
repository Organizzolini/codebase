"""🌳 Node traversal and identity utilities for Python AST."""

import ast


def get_key(node: ast.AST) -> str | None:
    """Get a stable identity key for a Python AST node, or None if keyless."""
    if isinstance(node, ast.Import):
        return ",".join(alias.name for alias in node.names)
    if isinstance(node, ast.ImportFrom):
        return node.module or ""
    if isinstance(node, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
        return node.name
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    if isinstance(node, ast.Call):
        return get_key(node.func)
    if isinstance(node, ast.Attribute):
        return node.attr
    return None


def get_children(node: ast.AST) -> list[ast.AST]:
    """Get semantically meaningful children of a Python AST node."""
    if isinstance(node, ast.Module):
        return list(node.body)
    if isinstance(node, ast.ClassDef):
        return [*node.decorator_list, *node.body]
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        return list(node.decorator_list)
    return []


def count_subtree(node: ast.AST) -> int:
    """Count a node and every semantically meaningful node beneath it.

    This is what a missing declaration costs. Comparison reports a vanished
    class once, but the template asked for the class and every member inside
    it, so weighing the finding by its subtree keeps a deleted class from
    scoring the same as a deleted decorator.
    """
    return 1 + sum(count_subtree(child) for child in get_children(node))


def filter_by_same_key(instance_nodes: list[ast.AST], template_node: ast.AST) -> list[ast.AST]:
    key = get_key(template_node)
    return [n for n in instance_nodes if get_key(n) == key]


def filter_by_same_type(instance_nodes: list[ast.AST], template_node: ast.AST) -> list[ast.AST]:
    return [n for n in instance_nodes if type(n) is type(template_node)]
