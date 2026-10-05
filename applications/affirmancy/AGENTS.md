# Affirmancy Application

Python application that generates structured affirmations for spiritual practices (tarot, astrology, chakras, kabbalah, runes, lenormand, and more) using LangChain, LangGraph, and a local Ollama LLM. Features a LangGraph ReAct agent with a SearxNG metasearch tool (aggregating Wikipedia and 135+ engines), plus a Trafilatura-powered research processing layer. Output is structured JSON organized by practice.

## Architecture

- **LLM**: `ChatOllama` → `gemma4:e2b` — configured in the notebook
- **Chains**: LCEL pipe syntax (`ChatPromptTemplate | llm.with_structured_output(Affirmation)`)
- **Agent**: LangGraph `create_react_agent` with research tools
- **Research tools**: SearxNG self-hosted (aggregates Wikipedia, DuckDuckGo, Google Scholar, ArXiv, and more)
- **Research processing**: Trafilatura HTML extraction → relevance truncation → deduplication → context budgeting
- **Output**: Pydantic-validated JSON files in `output/{practice}.json`

## Project Structure

```text
applications/affirmancy/
├── src/
│   ├── __init__.py          # Package marker
│   ├── affirmancy.ipynb     # Main Jupyter notebook pipeline
│   ├── grammars.py          # Grammar enums (Mood, Voice, Tense, etc.) and Grammar model
│   ├── models.py            # Pydantic models (Affirmation, SubjectAffirmations, etc.)
│   ├── output.py            # JSON/Markdown file I/O utilities
│   ├── prices.ipynb         # Pricing research notebook
│   ├── prompts.py           # LangChain prompt templates
│   ├── py.typed             # PEP 561 marker (typed package)
│   ├── semantics.ipynb      # Semantic analysis notebook
│   └── subjects.py          # Spiritual subject configuration (Subject, SubjectCategory)
├── testing/
│   ├── __init__.py
│   ├── test_grammars.py
│   ├── test_models.py
│   ├── test_output.py
│   ├── test_prompts.py
│   └── test_subjects.py
├── output/
│   └── .gitkeep
├── AGENTS.md
├── pyproject.toml
├── uv.lock
├── searxng.settings.yml
└── README.md
```

## Key Commands

```bash
# Lint, format, typecheck, test
nx run affirmancy:type-codebase,lint-codebase,tidy-codebase,form-codebase,gate-codebase       # every static check, in one graph
nx run affirmancy:ruff-lint           # linting
nx run affirmancy:ruff-format         # formatting
nx run affirmancy:typecheck           # pyright + ty (parallel)
nx run affirmancy:pytest              # all tests
nx run affirmancy:pytest:unit         # only unit tests
nx run affirmancy:pytest:integration  # only integration tests
nx run affirmancy:test-coverage       # all tests + coverage report
nx run affirmancy:vulture             # dead code detection
nx run affirmancy:ty                 # ty type checker (standalone)
nx run affirmancy:bandit             # security linter

# Open browser UIs
nx run affirmancy:open-webui --configuration=open
nx run affirmancy:searxng --configuration=open

# Docker service management
nx run affirmancy:ollama --configuration=start
nx run affirmancy:ollama --configuration=stop
nx run affirmancy:ollama --configuration=pull-small   # pull gemma4:e2b
nx run affirmancy:searxng --configuration=start
nx run affirmancy:searxng --configuration=stop
nx run affirmancy:open-webui --configuration=start
nx run affirmancy:open-webui --configuration=stop
```

## Conventions

- Python ≥ 3.11, managed with `uv` (`pyproject.toml` + `uv.lock`)
- **Tool targets are inherited from `nx.json` targetDefaults** — `ruff-format`, `ruff-lint`, `pyright`, `pytest`, `vulture`, `ty`, and `bandit` all resolve to codebase-wide defaults. Project-level targets (`format`, `lint`, `typecheck`, `test`) are thin composite overrides that delegate to these sub-targets.
- Ruff for linting and formatting — `nx run affirmancy:lint` / `nx run affirmancy:format`
- pyright strict mode as primary type checker — `nx run affirmancy:pyright`
- ty as supplementary type checker (pre-1.0, project-level config in `pyproject.toml`) — `nx run affirmancy:ty`
- bandit for security analysis — `nx run affirmancy:bandit`
- Vulture for dead code detection — `nx run affirmancy:vulture`
- pytest for tests, located in `testing/`, named `test_*_unit.py` or `test_*_integration.py`
- All Pydantic models use `model_dump_json(indent=2)` for JSON serialization
- No API keys required for core functionality (Ollama is local, Wikipedia/SearxNG are keyless)

## Environment Variables

| Variable       | Required | Description                                           |
| -------------- | -------- | ----------------------------------------------------- |
| `OLLAMA_HOST`  | No       | Ollama server URL (default: `http://localhost:11434`) |
| `SEARXNG_HOST` | No       | SearxNG server URL (default: `http://localhost:8889`) |

## Services

| Service    | URL                      | Description                                  |
| ---------- | ------------------------ | -------------------------------------------- |
| Ollama     | `http://localhost:11434` | Local LLM server (`gemma4:e2b`)              |
| Open WebUI | `http://localhost:3001`  | Browser-based Ollama chat interface          |
| SearxNG    | `http://localhost:8889`  | Self-hosted metasearch engine (135+ engines) |
