# What to declare in a template, per language

A language is chosen by file extension and decides what "the instance has this"
means. Every language enforces the same shape — the instance must carry
everything the template declares, and may add whatever it likes — but
_what counts as a declaration_ differs sharply. Declaring something a language
cannot see is wasted; declaring something it pins too tightly is worse.

Read this before writing template content in an unfamiliar file type. For
reading a difference that has already been reported, the `conformetry-validate`
skill covers the other direction.

**Where a placeholder nobody supplied is read from.** During validation such a
placeholder renders as a random stand-in, and a template node whose identity
holds the stand-in is matched as a pattern: literal parts exactly, the
stand-in capturing a non-empty value. TypeScript captures through any node key
below — a string literal, a declaration name, a call's `callee:first-argument`
— against nodes of the same syntax kind. JSON captures through string values,
Markdown through a node's text such as a heading, and text through a whole line.
Python, Jupyter, and comments capture nothing.

## TypeScript and JavaScript — `.ts`, `.tsx`

Compared as a syntax tree. Every declaration in the template must exist
_somewhere_ in the instance. The instance may add anything, and may **reorder
class members freely**.

What identifies a node, and therefore what you are pinning:

| Template construct | Matched on |
| --- | --- |
| Import | the module specifier |
| Export | the module specifier |
| Decorator | the dotted callee, so `@Injectable()` matches `@Injectable` |
| Call statement | callee plus its first string argument, so `describe("a")` differs from `describe("b")` |
| Any string literal | its exact text |
| Everything else | the declaration name |

Two consequences worth planning around:

- **A string literal is pinned verbatim.** Put a description, message, or label
  in a template and every instance is required to keep that exact wording
  forever. There is no `TODO` escape for strings as there is for comments. Leave
  such values out of the template unless the wording is genuinely a standard.
- **Function bodies are compared too.** The walk descends into every child
  node, so each statement a template puts inside a function or method is
  required in the instance's matching body — matched by its key, or by syntax
  kind when it has none, so an anonymous statement is satisfied by any
  statement of that kind. The instance may add statements freely. Keep logic
  out of a template body unless every instance must contain it.

Comments are checked separately, as an **ordered subsequence**: every comment the
template declares must appear, in that order, with anything else interleaved
freely. Section-marker comments are therefore load-bearing — put them where you
mean them. A template comment containing `TODO` is satisfied by any comment.

Because comments are read from the leading trivia of every token, a marker
between the last class member and the closing brace is enforceable.

## Python — `.py`

Also a syntax tree, and also a superset requirement, but it descends much less
far:

| Node | Children compared |
| --- | --- |
| Module | its body |
| Class | its decorators **and** its body |
| Function | its decorators **only** |

Function bodies are not entered at all, so a template cannot require anything
inside a function beyond its decorators.

Identity: an import by its joined alias names, a from-import by its module, a
class or function by its name, a bare name by its identifier, a string by its
value, a call by its callee, an attribute by its attribute name.

Comments work as they do in TypeScript — ordered subsequence, `TODO` satisfied by
any comment.

Python comparison runs in a subprocess, so **`python3` must be on `PATH`**. When
it is not, that is reported as a difference against the file rather than a crash,
which is worth recognizing before you go looking for a template mistake.

## JSON — `.json`, `.jsonc`

Parsed permissively, so comments in a `.json` file are fine. The template is a
**subset requirement**: the instance may add keys and array entries freely.

- **Objects** — every key the template declares must be present, then compared
  recursively. Key order is irrelevant.
- **Arrays of scalars** — each required value must appear _somewhere_. Order is
  not enforced.
- **Arrays of objects** — each required object is matched against whichever
  instance entry fits it best.
- **Scalars** — compared exactly, and a mismatch reports both expected and
  actual.

Differences here are reported as a **JSON path** such as `scripts.build[0]`
rather than a line number.

So a template `package.json` declaring one script requires that script and
tolerates twenty others. Declare the minimum you actually want to standardize.

## Markdown — `.md`

Parsed to a document tree with GitHub extensions enabled, so tables and task
lists are their own node types. Order is preserved but not position-locked: each
template node may match any later sibling, so an instance may insert sections
between required ones.

What identifies a node:

| Node | Matched on |
| --- | --- |
| Heading | its depth and text |
| Code block | its language and its contents |
| Link | its target and text |
| Image | its target and alternative text |
| List | whether it is ordered |
| Table | the column count of its first row |
| Table row | its number of cells |
| Thematic break | nothing — any one matches |
| Anything else | its rendered text |

A heading is pinned by _both_ level and wording, so changing `## Usage` to
`### Usage` in an instance is a difference.

## Plain text — `.txt`, and every unclaimed extension

The floor. Any extension no other language claims is compared as text, which
covers `.gitignore`, `Dockerfile`, `pyproject.toml`, `.env` files, and anything
else without a dedicated language.

Comparison is **duplicate-aware line containment**: each line the template
declares must appear in the instance, and a line declared twice must appear
twice. Order is not enforced. Lines are not trimmed, so leading whitespace is
part of the line.

This makes text templates blunt but predictable. A template line is an exact
string requirement — avoid lines carrying values that legitimately vary.

## Jupyter notebooks — `.ipynb`

Composed from three of the languages above rather than parsed as a fourth format:

1. **The envelope** is compared as JSON, restricted to `metadata`, `nbformat`,
   and `nbformat_minor`. The `cells` array is deliberately excluded.
2. **Cell count** is checked per kind, so an instance may append cells but may
   not drop a declared one.
3. **Paired cells** are compared positionally _within kind_ — the nth markdown
   cell against the nth markdown cell, the nth code cell against the nth code
   cell. Markdown cells go through the markdown language, code cells through
   Python. Raw cells are not compared at all.

Because cells pair by position within kind, **inserting a markdown cell before a
required one shifts every later markdown cell** and will report differences. Put
new cells after the declared ones.

A notebook that will not parse yields no cells, and the structural pass reports
that rather than throwing. Code cells go through the Python bridge, so `python3`
is required here too.
