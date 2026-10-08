# What a difference means, per language

A language is chosen by file extension and decides how a template and an instance
are compared. Every language enforces the same shape — the instance must carry
everything the template declares — but each words its differences differently and
each has a distinct place where a difference cannot occur.

Use this to turn a reported difference into the right edit. For deciding what a
template _should_ declare in the first place, the `conformetry-configure` skill
covers the other direction.

## TypeScript and JavaScript — `.ts`, `.tsx`

Differences read `Missing <Kind> "<key>"`, with a line and column on both sides.
The key tells you what to search for:

| Kind | The key is |
| --- | --- |
| Import or export | the module specifier |
| Decorator | the dotted callee, so `Injectable` means `@Injectable` |
| Call statement | the callee plus its first string argument |
| String literal | the exact text |
| Anything else | the declaration name |

**A missing string literal is usually a pinned message, not missing logic.** The
template declares that exact text, so the fix is to restore the wording — or to
accept that the template should not have pinned it. This is the one difference
where the template is more often wrong than the instance.

**Class member order is never a difference.** The instance may reorder freely, so
never rearrange members to satisfy a report.

**A difference can never point inside a function body.** Bodies are not compared.
If a report seems to be about logic, re-read it — it is about a declaration.

`Missing Comment` differences are separate, and comments are compared as an
**ordered subsequence**. So a marker that exists but sits in the wrong place
reports as missing. Check position before adding a duplicate.

## Python — `.py`

Differences read the same way, with a line and column on both sides.

Two places a difference can never come from: **inside a function body**, and
**inside a function at all beyond its decorators**. Classes have their bodies
compared; functions have only their decorators compared.

**A difference saying Python is unavailable is about your machine, not the
file.** Comparison runs in a subprocess, and a missing or broken `python3` is
reported as a difference rather than crashing the run. Install `python3` and
re-run; do not edit the template.

## JSON — `.json`, `.jsonc`

Differences carry a **JSON path** such as `scripts.build[0]` instead of a line
number, on both sides. Comments in a `.json` file are tolerated by the parser and
are never the cause.

- A missing key: add it. Key order is never a difference.
- A scalar mismatch reports both `Expected` and `Actual`. Take the expected value
  literally — comparison is exact, so `"3"` and `3` differ.
- `Missing required array structure` means the template requires an entry in an
  array your instance leaves empty.

Extra keys and extra array entries are never differences, so never prune a
config file to satisfy a report.

## Markdown — `.md`

Differences read `Missing markdown <nodeType>: "<text>"`.

**The reported instance line is an insertion point, not a fault.** It is the line
after the last node that did match, which is where the missing content belongs.
Read it as "put it here" rather than "something here is wrong".

A heading is identified by **both its level and its text**, so a difference
naming a heading you can see means the level is wrong. A code block is identified
by its language and its contents together. A table is identified by the column
count of its first row.

Order is preserved but not position-locked, so extra sections between required
ones are fine.

## Plain text — `.txt`, and every unclaimed extension

This is the floor: any extension no other language claims lands here, which
covers `.gitignore`, `Dockerfile`, `pyproject.toml`, `.env` files, and similar.

Differences read `Missing line: <line>` and mean an exact string is absent.
Comparison is **duplicate-aware** — a line the template declares twice must
appear twice — and lines are **not trimmed**, so indentation is part of the line.
Order is never enforced.

When a line looks present but is still reported, compare whitespace first.

## Jupyter notebooks — `.ipynb`

Every cell-derived difference is prefixed `Cell <n> (<kind>):`, so the message
tells you exactly which cell to open.

Differences come from three places:

1. **The envelope**, compared as JSON but restricted to `metadata`, `nbformat`,
   and `nbformat_minor`. The `cells` array is excluded, so a difference in a
   notebook's metadata is never about its content.
2. **A missing cell**, meaning the instance has fewer cells of that kind than the
   template declares.
3. **A paired cell**, compared through markdown or Python depending on its kind.
   Raw cells are never compared.

**Cells pair by position within kind** — the nth markdown cell against the nth
markdown cell, the nth code cell against the nth code cell. So a burst of
differences across several cells usually means one cell was **inserted before a
declared one**, shifting everything after it. Look for the insertion rather than
fixing each cell.

Code cells go through the Python bridge, so an unavailable `python3` shows up here
too.
