# 🐍 Python through an interpreter

Python analysis runs through an actual interpreter rather than a parser written
in TypeScript. That buys correctness and costs portability, and this example is
both halves.

## Run it

```bash
cd examples/corpus
codometer --config ../python/uv.config.ts --format json \
  | jq '.targets[0].metrics[] | select(.path | startswith("python."))'
```

## What is here

```text
python/
├── default-interpreter.config.ts     nothing declared — python3 on PATH
├── uv.config.ts                      python: { command: "uv run python" }
└── unreachable-interpreter.config.ts an interpreter that is not installed
```

| Example | Declares | `python.classes` |
| ------- | -------- | ---------------- |
| [`default-interpreter.config.ts`](default-interpreter.config.ts) | nothing — `python3` on PATH | 3 |
| [`uv.config.ts`](uv.config.ts) | `python: { command: "uv run python" }` | 3 |
| [`unreachable-interpreter.config.ts`](unreachable-interpreter.config.ts) | an interpreter that is not installed | 0 |

The first two agree **on a machine whose `python3` is adequate**, and the test
asserts that agreement rather than assuming it. Naming the interpreter is what
stops the numbers depending on which machine the run happened on — a continuous
integration runner without `python3`, or with one too old for a sample's syntax,
gets the third row.

## The failure to recognize by shape

The third row **exits 0**, warns once on standard error, and reports every
`python.*` counter at 0 — including `python.files`, so the file is found and
simply cannot be read:

```text
🐍 Skipped Python analysis
   { reason: "Command failed: python-that-is-not-installed …: command not found" }
```

Nothing in the report says the interpreter was the problem. **A Python counter
reading zero for a directory you know has Python in it means the interpreter,
not the corpus.**

## One missing interpreter, two groups

The notebook shows the seam plainly: `jupyter.cells` stays at 5 and
`jupyter.markdownCells` at 2, while `jupyter.classes` and `jupyter.functions`
fall to 0 alongside the standalone module — because a notebook's code cells go
to the same interpreter. That is
[composition](../../README.md#notebooks-measured-by-composition) seen from the
failure side.

## Next

[targets](../targets/README.md), for measuring files the corpus does not hold.
