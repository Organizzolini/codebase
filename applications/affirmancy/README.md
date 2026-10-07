# 🤲 Affirmancy

**Affirmations generated across every grammatical mood a language offers.**

A Python and Jupyter application that generates structured affirmations for
spiritual practices using LangChain, LangGraph, and a locally-hosted
`gemma4:e2b` model via Ollama. A LangGraph ReAct agent researches a subject
through SearxNG metasearch, and the model writes affirmations that are
validated against Pydantic models before being saved.

The interesting part is the grammar. Rather than producing a flat list of "I
am…" sentences, the pipeline enumerates moods, voices, tenses, aspects,
persons, numbers, polarities, and deixis — so a single subject yields
affirmations phrased as imperatives, optatives, subjunctives, and more.

## Requirements

- Python `>=3.11`
- [uv](https://docs.astral.sh/uv/) package manager
- Docker, for Ollama and SearxNG

The devcontainer provides Python 3.14.

## Setup

This application is a member of the uv workspace declared in the root
`pyproject.toml`, sharing the root `uv.lock` and `.venv`. Sync from the
repository root — running `uv sync` inside this directory prunes the other
members out of the shared venv.

```bash
uv sync
```

## Quickstart

```bash
# 1. Start the local services
nx run affirmancy:ollama --configuration=start
nx run affirmancy:searxng --configuration=start
nx run affirmancy:open-webui --configuration=start

# 2. Pull the model (one-time download)
nx run affirmancy:ollama --configuration=pull-small   # gemma4:e2b

# 3. Open src/affirmancy.ipynb in VSCode and run the pipeline
```

## Project Structure

```text
applications/affirmancy/
├── src/
│   ├── affirmancy.ipynb     # Main generation pipeline
│   ├── semantics.ipynb      # Semantic exploration of subjects
│   ├── prices.ipynb         # Token accounting for a single run
│   ├── grammars.py          # Mood, Voice, Tense, Aspect, Person, Number,
│   │                        #   Polarity, Deixis, Form — and the Grammar model
│   ├── models.py            # Affirmation, GrammarAffirmations,
│   │                        #   SubjectAffirmations, ValidationResult
│   ├── prompts.py           # LangChain prompt templates
│   ├── subjects.py          # Subject and SubjectCategory definitions
│   └── output.py            # JSON and markdown writers
├── testing/                 # pytest suites, one per module
├── output/                  # Generated files (gitignored)
├── pyproject.toml
└── searxng.settings.yml
```

## Subjects

Subjects are declared in `src/subjects.py` as a `Subject` with a
`SubjectCategory`. The categories in place span tarot cards, Lenormand cards,
astrological signs, planets, nodes, asteroids, aspects and houses, modalities
and polarities, chakras, runes, sephiroth, Hebrew letters, kabbalistic worlds,
solfeggio frequencies, weekdays, and elements.

Adding a practice means adding its category and its subjects to that file —
nothing else in the pipeline needs to know about it.

## Grammar

`src/grammars.py` defines each grammatical axis as a `DescribedEnum`, so every
value carries its own description into the prompt. `Grammar` composes them into
one combination the model is asked to write in.

| Axis | Examples |
| ---- | -------- |
| `Mood` | indicative, imperative, optative, subjunctive, jussive |
| `Voice` | active, middle, passive |
| `Tense` | past, present, future |
| `Aspect` | perfective, imperfective, progressive, habitual |
| `Person` | first, second, third |
| `Number` | singular, dual, plural |
| `Polarity` | affirmative, negative |
| `Deixis` | proximal, medial, distal |
| `Form` | finite and non-finite forms |

## Nx Targets

| Target | Does |
| ------ | ---- |
| `ruff-lint` | Ruff linting |
| `ruff-format` | Ruff formatting |
| `pyright` / `ty` | Static type checking |
| `pytest` / `test-coverage` | Tests, with and without coverage |
| `vulture` | Dead code analysis |
| `bandit` | Security linting |
| `nbstripout` | Strip notebook outputs before commit |
| `spell-check`, `markdown-lint`, `yaml-lint` | Prose and configuration checks |
| `lint-codebase` | All of the above; `--configuration=write` to auto-fix |
| `ollama` | `start`, `stop`, `pull-small`, `pull-medium`, `pull-large` |
| `searxng` | `start`, `stop`, `open` |
| `open-webui` | `start`, `stop`, `open` |

## Run tests

```bash
cd applications/affirmancy
uv run pytest
```

## Lint / format / typecheck

```bash
cd applications/affirmancy
uv run ruff check .
uv run ruff format .
uv run pyright
uv run ty check
uv run vulture src testing
uv run bandit -r src
```

## Services

| Service | Port | Purpose |
| ------- | ---- | ------- |
| Ollama | `11434` | Local LLM server (`gemma4:e2b`) |
| Open WebUI | `3001` | Browser-based chat interface for Ollama |
| SearxNG | `8889` | Self-hosted metasearch, aggregating 135+ engines |

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama server URL |
| `SEARXNG_HOST` | `http://localhost:8889` | SearxNG server URL |

## Notes

- **CPU-only inference.** `gemma4:e2b` is the small variant deliberately —
  generation stays interactive without a GPU. `pull-medium` and `pull-large`
  fetch `gemma4:e4b` and `gemma4:e26b` when more capacity is worth the wait.
- **Model keepalive.** `OLLAMA_KEEP_ALIVE=10m` avoids reloading the model
  between cells.
- **Context budget.** `gemma4:e2b` has a 128k-token window, and research
  results are truncated to stay well inside it.
- **Notebook outputs are stripped** on commit by `nbstripout`, so a diff shows
  the code rather than the last run's results.

See [AGENTS.md](AGENTS.md) for the architecture, and the
[write-python skill](../../.agents/skills/write-python/SKILL.md) for the
workspace's Python tooling conventions.

## License

MIT — see [LICENSE](../../LICENSE).

## 👔 Conformetry

This project was generated from the [jupyter-notebook-application](../../configuration/conformetry-templates/jupyter-notebook-application) conformetry template.

## 🕸️ Codependix

Dependency graphs exported by [codependix](https://github.com/Organizzolini/codebase/tree/main/packages/ic-suite/codependix/codependix-cli), regenerated by `nx run codebase:codependix:write`.

### Nx Neighborhood

<!-- codependix:start name="codependix-nx-projects" -->
_This project has no immediate Nx dependencies or dependents._
<!-- codependix:end name="codependix-nx-projects" -->

<!-- codometer:start -->

### Python File Imports

<!-- codependix:start name="codependix-file-imports" -->
```mermaid
graph LR
  file__vulture_whitelist_py[".vulture_whitelist.py"]
  file_src___init___py["src/__init__.py"]
  file_src_grammars_py["src/grammars.py"]
  file_src_models_py["src/models.py"]
  file_src_output_py["src/output.py"]
  file_src_prompts_py["src/prompts.py"]
  file_src_subjects_py["src/subjects.py"]
  file_testing___init___py["testing/__init__.py"]
  file_testing_test_grammars_py["testing/test_grammars.py"]
  file_testing_test_models_py["testing/test_models.py"]
  file_testing_test_output_py["testing/test_output.py"]
  file_testing_test_prompts_py["testing/test_prompts.py"]
  file_testing_test_subjects_py["testing/test_subjects.py"]
  file_src_models_py --> file_src_grammars_py
  file_src_models_py --> file_src_subjects_py
  file_testing_test_grammars_py --> file_src_grammars_py
  file_testing_test_models_py --> file_src_grammars_py
  file_testing_test_models_py --> file_src_models_py
  file_testing_test_models_py --> file_src_subjects_py
  file_testing_test_output_py --> file_src_grammars_py
  file_testing_test_output_py --> file_src_models_py
  file_testing_test_output_py --> file_src_output_py
  file_testing_test_output_py --> file_src_subjects_py
  file_testing_test_prompts_py --> file_src_prompts_py
  file_testing_test_subjects_py --> file_src_subjects_py
```
<!-- codependix:end name="codependix-file-imports" -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-4271-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-218.42_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-3-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-15-3178c6?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-2-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-0-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-0-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-0-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-0-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-0-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-0-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-0-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-0-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-0-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-0-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-0-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-0-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-0-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-2-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-0-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-0-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-0-475569?style=flat-square)
![TODO Comments](https://img.shields.io/badge/TODO_Comments-0-ca8a04?style=flat-square)

### Python

![Python Files](https://img.shields.io/badge/Python_Files-13-3776ab?style=flat-square)
![Python Lines](https://img.shields.io/badge/Python_Lines-3387-4b8bbe?style=flat-square)
![Python Classes](https://img.shields.io/badge/Python_Classes-18-7c3aed?style=flat-square)
![Python Functions](https://img.shields.io/badge/Python_Functions-73-16a34a?style=flat-square)
![Python Protocols](https://img.shields.io/badge/Python_Protocols-0-0ea5e9?style=flat-square)
![Python Constants](https://img.shields.io/badge/Python_Constants-118-dc2626?style=flat-square)
![Python Imports](https://img.shields.io/badge/Python_Imports-41-0284c7?style=flat-square)
![Python Decorators](https://img.shields.io/badge/Python_Decorators-71-db2777?style=flat-square)
![Docstrings](https://img.shields.io/badge/Docstrings-22-6366f1?style=flat-square)
![Docstring Lines](https://img.shields.io/badge/Docstring_Lines-70-818cf8?style=flat-square)
![Python Comments](https://img.shields.io/badge/Python_Comments-23-64748b?style=flat-square)
![Python Comment Lines](https://img.shields.io/badge/Python_Comment_Lines-23-475569?style=flat-square)

### JSON

![JSON Files](https://img.shields.io/badge/JSON_Files-3-a16207?style=flat-square)
![JSON Lines](https://img.shields.io/badge/JSON_Lines-108-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-46-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-1-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-75-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-34-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-0-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-1-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-4-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-82-dc2626?style=flat-square)
![JSON Max Depth](https://img.shields.io/badge/JSON_Max_Depth-6-ea580c?style=flat-square)

### YAML

![YAML Files](https://img.shields.io/badge/YAML_Files-1-cb171e?style=flat-square)
![YAML Lines](https://img.shields.io/badge/YAML_Lines-364-e34c26?style=flat-square)
![YAML Documents](https://img.shields.io/badge/YAML_Documents-1-f97316?style=flat-square)
![YAML Mappings](https://img.shields.io/badge/YAML_Mappings-20-7c3aed?style=flat-square)
![YAML Sequences](https://img.shields.io/badge/YAML_Sequences-5-8b5cf6?style=flat-square)
![YAML Keys](https://img.shields.io/badge/YAML_Keys-97-0284c7?style=flat-square)
![YAML Scalars](https://img.shields.io/badge/YAML_Scalars-262-16a34a?style=flat-square)
![YAML Anchors](https://img.shields.io/badge/YAML_Anchors-0-059669?style=flat-square)
![YAML Aliases](https://img.shields.io/badge/YAML_Aliases-0-10b981?style=flat-square)
![YAML Comments](https://img.shields.io/badge/YAML_Comments-173-64748b?style=flat-square)
![YAML Max Depth](https://img.shields.io/badge/YAML_Max_Depth-4-ea580c?style=flat-square)

### TOML

![TOML Files](https://img.shields.io/badge/TOML_Files-1-9c4221?style=flat-square)
![TOML Lines](https://img.shields.io/badge/TOML_Lines-96-b45309?style=flat-square)
![TOML Tables](https://img.shields.io/badge/TOML_Tables-12-7c3aed?style=flat-square)
![TOML Array Tables](https://img.shields.io/badge/TOML_Array_Tables-0-8b5cf6?style=flat-square)
![TOML Keys](https://img.shields.io/badge/TOML_Keys-56-0284c7?style=flat-square)
![TOML Arrays](https://img.shields.io/badge/TOML_Arrays-16-16a34a?style=flat-square)
![TOML Comments](https://img.shields.io/badge/TOML_Comments-11-64748b?style=flat-square)

### Shell

![Shell Files](https://img.shields.io/badge/Shell_Files-0-89e051?style=flat-square)
![Shell Lines](https://img.shields.io/badge/Shell_Lines-0-4eaa25?style=flat-square)
![Shell Functions](https://img.shields.io/badge/Shell_Functions-0-16a34a?style=flat-square)
![Shell Variables](https://img.shields.io/badge/Shell_Variables-0-0284c7?style=flat-square)
![Shell Exports](https://img.shields.io/badge/Shell_Exports-0-ea580c?style=flat-square)
![Shell Conditionals](https://img.shields.io/badge/Shell_Conditionals-0-7c3aed?style=flat-square)
![Shell Loops](https://img.shields.io/badge/Shell_Loops-0-8b5cf6?style=flat-square)
![Shell Pipelines](https://img.shields.io/badge/Shell_Pipelines-0-059669?style=flat-square)
![Shebangs](https://img.shields.io/badge/Shebangs-0-6b7280?style=flat-square)
![Shell Comments](https://img.shields.io/badge/Shell_Comments-0-64748b?style=flat-square)
![Shell Comment Lines](https://img.shields.io/badge/Shell_Comment_Lines-0-475569?style=flat-square)

### SQL

![SQL Files](https://img.shields.io/badge/SQL_Files-0-e38c00?style=flat-square)
![SQL Lines](https://img.shields.io/badge/SQL_Lines-0-f29111?style=flat-square)
![SQL Statements](https://img.shields.io/badge/SQL_Statements-0-7c3aed?style=flat-square)
![SQL Selects](https://img.shields.io/badge/SQL_Selects-0-16a34a?style=flat-square)
![SQL Inserts](https://img.shields.io/badge/SQL_Inserts-0-22c55e?style=flat-square)
![SQL Updates](https://img.shields.io/badge/SQL_Updates-0-0ea5e9?style=flat-square)
![SQL Deletes](https://img.shields.io/badge/SQL_Deletes-0-dc2626?style=flat-square)
![SQL Creates](https://img.shields.io/badge/SQL_Creates-0-0284c7?style=flat-square)
![SQL Joins](https://img.shields.io/badge/SQL_Joins-0-8b5cf6?style=flat-square)
![SQL CTEs](https://img.shields.io/badge/SQL_CTEs-0-059669?style=flat-square)
![SQL Comments](https://img.shields.io/badge/SQL_Comments-0-64748b?style=flat-square)

### HCL

![HCL Files](https://img.shields.io/badge/HCL_Files-0-844fba?style=flat-square)
![HCL Lines](https://img.shields.io/badge/HCL_Lines-0-a78bfa?style=flat-square)
![HCL Blocks](https://img.shields.io/badge/HCL_Blocks-0-7c3aed?style=flat-square)
![HCL Resources](https://img.shields.io/badge/HCL_Resources-0-0284c7?style=flat-square)
![HCL Variables](https://img.shields.io/badge/HCL_Variables-0-16a34a?style=flat-square)
![HCL Outputs](https://img.shields.io/badge/HCL_Outputs-0-059669?style=flat-square)
![HCL Attributes](https://img.shields.io/badge/HCL_Attributes-0-0ea5e9?style=flat-square)
![HCL Interpolations](https://img.shields.io/badge/HCL_Interpolations-0-db2777?style=flat-square)
![HCL Comments](https://img.shields.io/badge/HCL_Comments-0-64748b?style=flat-square)

### CSS

![CSS Files](https://img.shields.io/badge/CSS_Files-0-264de4?style=flat-square)
![CSS Lines](https://img.shields.io/badge/CSS_Lines-0-2965f1?style=flat-square)
![CSS Rules](https://img.shields.io/badge/CSS_Rules-0-7c3aed?style=flat-square)
![CSS Selectors](https://img.shields.io/badge/CSS_Selectors-0-8b5cf6?style=flat-square)
![CSS Declarations](https://img.shields.io/badge/CSS_Declarations-0-0284c7?style=flat-square)
![CSS At Rules](https://img.shields.io/badge/CSS_At_Rules-0-f97316?style=flat-square)
![CSS Media Queries](https://img.shields.io/badge/CSS_Media_Queries-0-ea580c?style=flat-square)
![CSS Custom Properties](https://img.shields.io/badge/CSS_Custom_Properties-0-16a34a?style=flat-square)
![CSS Comments](https://img.shields.io/badge/CSS_Comments-0-64748b?style=flat-square)

### Conventions

![Module Files](https://img.shields.io/badge/Module_Files-0-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-0-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-0-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-0-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-0-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-0-0ea5e9?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-059669?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-0-ca8a04?style=flat-square)
![Integration Tests](https://img.shields.io/badge/Integration_Tests-0-7c3aed?style=flat-square)
![End To End Tests](https://img.shields.io/badge/End_To_End_Tests-0-0284c7?style=flat-square)
![CSS Comment Budget](https://img.shields.io/badge/CSS_Comment_Budget-0-16a34a?style=flat-square)
![HCL Comment Budget](https://img.shields.io/badge/HCL_Comment_Budget-0-ea580c?style=flat-square)
![Python Comment Budget](https://img.shields.io/badge/Python_Comment_Budget-0-db2777?style=flat-square)
![SQL Comment Budget](https://img.shields.io/badge/SQL_Comment_Budget-0-0ea5e9?style=flat-square)
![TOML Comment Budget](https://img.shields.io/badge/TOML_Comment_Budget-0-059669?style=flat-square)
![TypeScript Comment Budget](https://img.shields.io/badge/TypeScript_Comment_Budget-0-ca8a04?style=flat-square)
![YAML Comment Budget](https://img.shields.io/badge/YAML_Comment_Budget-0-7c3aed?style=flat-square)
![Shell Comment Budget](https://img.shields.io/badge/Shell_Comment_Budget-0-0284c7?style=flat-square)

### Jupyter

![Notebooks](https://img.shields.io/badge/Notebooks-3-f37626?style=flat-square)
![Notebook Cells](https://img.shields.io/badge/Notebook_Cells-16-e8a33d?style=flat-square)
![Code Cells](https://img.shields.io/badge/Code_Cells-14-3776ab?style=flat-square)
![Markdown Cells](https://img.shields.io/badge/Markdown_Cells-2-083fa1?style=flat-square)
![Raw Cells](https://img.shields.io/badge/Raw_Cells-0-9ca3af?style=flat-square)
![Executed Cells](https://img.shields.io/badge/Executed_Cells-0-16a34a?style=flat-square)
![Cell Outputs](https://img.shields.io/badge/Cell_Outputs-0-059669?style=flat-square)
![Notebook Code Lines](https://img.shields.io/badge/Notebook_Code_Lines-872-4b8bbe?style=flat-square)
![Notebook Classes](https://img.shields.io/badge/Notebook_Classes-9-7c3aed?style=flat-square)
![Notebook Functions](https://img.shields.io/badge/Notebook_Functions-21-22c55e?style=flat-square)
![Notebook Imports](https://img.shields.io/badge/Notebook_Imports-61-0284c7?style=flat-square)
![Notebook Decorators](https://img.shields.io/badge/Notebook_Decorators-1-db2777?style=flat-square)
![Notebook Prose Lines](https://img.shields.io/badge/Notebook_Prose_Lines-7-1f6feb?style=flat-square)
![Notebook Headings](https://img.shields.io/badge/Notebook_Headings-2-a78bfa?style=flat-square)
![Notebook Links](https://img.shields.io/badge/Notebook_Links-0-10b981?style=flat-square)
![Notebook Images](https://img.shields.io/badge/Notebook_Images-0-34d399?style=flat-square)
![Notebook Code Blocks](https://img.shields.io/badge/Notebook_Code_Blocks-0-dc2626?style=flat-square)
![Notebook Properties](https://img.shields.io/badge/Notebook_Properties-126-ca8a04?style=flat-square)
![Notebook Nodes](https://img.shields.io/badge/Notebook_Nodes-1024-a16207?style=flat-square)
![Notebook Max Depth](https://img.shields.io/badge/Notebook_Max_Depth-5-ea580c?style=flat-square)

### Markdown

![Markdown Files](https://img.shields.io/badge/Markdown_Files-1-083fa1?style=flat-square)
![Markdown Lines](https://img.shields.io/badge/Markdown_Lines-102-1f6feb?style=flat-square)
![H1](https://img.shields.io/badge/H1-1-7c3aed?style=flat-square)
![H2](https://img.shields.io/badge/H2-6-8b5cf6?style=flat-square)
![H3](https://img.shields.io/badge/H3-0-a78bfa?style=flat-square)
![H4](https://img.shields.io/badge/H4-0-c4b5fd?style=flat-square)
![H5](https://img.shields.io/badge/H5-0-ddd6fe?style=flat-square)
![H6](https://img.shields.io/badge/H6-0-ede9fe?style=flat-square)
![Paragraphs](https://img.shields.io/badge/Paragraphs-17-64748b?style=flat-square)
![Lists](https://img.shields.io/badge/Lists-2-16a34a?style=flat-square)
![List Items](https://img.shields.io/badge/List_Items-16-22c55e?style=flat-square)
![Task List Items](https://img.shields.io/badge/Task_List_Items-0-4ade80?style=flat-square)
![Tables](https://img.shields.io/badge/Tables-2-0284c7?style=flat-square)
![Table Rows](https://img.shields.io/badge/Table_Rows-7-0ea5e9?style=flat-square)
![Links](https://img.shields.io/badge/Links-0-059669?style=flat-square)
![Images](https://img.shields.io/badge/Images-0-10b981?style=flat-square)
![Code Blocks](https://img.shields.io/badge/Code_Blocks-2-dc2626?style=flat-square)
![Inline Code](https://img.shields.io/badge/Inline_Code-39-ef4444?style=flat-square)
![Block Quotes](https://img.shields.io/badge/Block_Quotes-0-ca8a04?style=flat-square)
![Thematic Breaks](https://img.shields.io/badge/Thematic_Breaks-0-a16207?style=flat-square)
<!-- codometer:end -->
