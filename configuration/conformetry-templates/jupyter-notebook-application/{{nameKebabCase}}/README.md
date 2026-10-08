## Requirements

- Python `>=3.11`
- [uv](https://docs.astral.sh/uv/) package manager

## Setup

This application is a member of the uv workspace declared in the root
`pyproject.toml`, sharing the root `uv.lock` and `.venv`. Sync from the
repository root — running `uv sync` inside this directory prunes the other
members out of the shared venv.

```bash
uv sync
```

## Run tests

```bash
cd projects/{{nameKebabCase}}
uv run pytest
```

## Lint / format / typecheck

```bash
cd projects/{{nameKebabCase}}
uv run ruff check .
uv run ruff format .
uv run pyright
uv run ty check
uv run vulture src testing
uv run bandit -r src
```

## 👔 Conformetry

This project was generated from the [jupyter-notebook-application](../../configuration/conformetry-templates/jupyter-notebook-application) conformetry template.
