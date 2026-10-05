# ⏲️ Codometer Languages

[![npm](https://img.shields.io/npm/v/@codometer/languages?logo=npm&label=npm)](https://www.npmjs.com/package/@codometer/languages)

**Language parsers and comment analyzers across TypeScript, JSON, Markdown, Python, and SQL for Codometer.**

## Test

```bash
nx run codometer-languages:vitest
```

<!-- callidescope:start -->

## 🔭 Callidescope

Call stacks traced through `packages/ic-suite/codometer/codometer-languages`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 210 |
| Files | 68 |
| Calls traced | 207 |
| Call stacks | 17 |
| Deepest stack | 5 |
| Stacks through recursion | 0 |
| Unfollowable calls | 5 |

### Limits

What this project is judged against, as declared in its own `callidescope.config.ts`.

| Limit | Value |
| --- | --- |
| `maximumDepth` | 11 |
| `maximumBreadth` | 12 |

### Call stacks (depth)

**1. `LanguageCommentsService.read`** — depth ≥ 5 · orphan-root

```text
🚀 LanguageCommentsService.read(content: string): CommentToken[] [packages/ic-suite/codometer/codometer-languages/src/modules/comments/language-comments.service.ts:124]
  └─> HclCommentsService.read(content: string): CommentToken[] [packages/ic-suite/codometer/codometer-languages/src/modules/comments/hcl-comments.service.ts:122]
     ↳ Reads every `#`, `//`, and `/* *\/` comment, in the order they appear.
    └─> HclCommentsService.readBlocks(content: string): { end: number; start: number; token: CommentToken; }[] [packages/ic-suite/codometer/codometer-languages/src/modules/comments/hcl-comments.service.ts:75]
       ↳ Every block comment's span, as a positioned token.
      └─> HclCommentsService.map(…)(…): { end: number; start: number; token: { line: number; ownLine: boolean; prose: string; source: string; }; } [packages/ic-suite/codometer/codometer-languages/src/modules/comments/hcl-comments.service.ts:78]
        └─> HclCommentsService.lineOf(content: string, index: number): number [packages/ic-suite/codometer/codometer-languages/src/modules/comments/hcl-comments.service.ts:70]
           ↳ The 1-indexed line an offset sits on.
```

**2. `LanguageCommentsService.read`** — depth ≥ 5 · orphan-root

```text
🚀 LanguageCommentsService.read(content: string): CommentToken[] [packages/ic-suite/codometer/codometer-languages/src/modules/comments/language-comments.service.ts:132]
  └─> SqlCommentsService.read(content: string): CommentToken[] [packages/ic-suite/codometer/codometer-languages/src/modules/comments/sql-comments.service.ts:118]
     ↳ Reads every `--` and `/* *\/` comment, in the order they appear.
    └─> SqlCommentsService.readBlocks(content: string): { end: number; start: number; token: CommentToken; }[] [packages/ic-suite/codometer/codometer-languages/src/modules/comments/sql-comments.service.ts:70]
       ↳ Every block comment's span, as a positioned token.
      └─> SqlCommentsService.map(…)(…): { end: number; start: number; token: { line: number; ownLine: boolean; prose: string; source: string; }; } [packages/ic-suite/codometer/codometer-languages/src/modules/comments/sql-comments.service.ts:73]
        └─> SqlCommentsService.lineOf(content: string, index: number): number [packages/ic-suite/codometer/codometer-languages/src/modules/comments/sql-comments.service.ts:65]
           ↳ The 1-indexed line an offset sits on.
```

**3. `LanguageCommentsService.read`** — depth 5 · orphan-root

```text
🚀 LanguageCommentsService.read(content: string, filePath: string): CommentToken[] [packages/ic-suite/codometer/codometer-languages/src/modules/comments/language-comments.service.ts:137]
  └─> TypescriptCommentsService.read(content: string, filePath: string): CommentToken[] [packages/ic-suite/codometer/codometer-languages/src/modules/comments/typescript-comments.service.ts:140]
     ↳ Reads every non-JSDoc comment the parse finds, in source order.
    └─> TypescriptCommentsService.flatMap(…)(this: undefined, range: tsCompiler.CommentRange): CommentToken[] [packages/ic-suite/codometer/codometer-languages/src/modules/comments/typescript-comments.service.ts:154]
      └─> TypescriptCommentsService.toToken(range: tsCompiler.CommentRange, content: string): CommentToken | undefined [packages/ic-suite/codometer/codometer-languages/src/modules/comments/typescript-comments.service.ts:119]
         ↳ Turns one comment range into a token, unless it is a JSDoc block.
        └─> TypescriptCommentsService.isJsDoc(range: tsCompiler.CommentRange, source: string): boolean [packages/ic-suite/codometer/codometer-languages/src/modules/comments/typescript-comments.service.ts:90]
           ↳ Whether this range is a JSDoc block, measured elsewhere.
```

<details>
<summary>14 more call stacks</summary>

**4. `LanguageCommentsService.read`** — depth 4 · orphan-root

```text
🚀 LanguageCommentsService.read(content: string): CommentToken[] [packages/ic-suite/codometer/codometer-languages/src/modules/comments/language-comments.service.ts:120]
  └─> CssCommentsService.read(content: string): CommentToken[] [packages/ic-suite/codometer/codometer-languages/src/modules/comments/css-comments.service.ts:70]
     ↳ Reads every comment postcss's parse finds, in document order.
    └─> CssCommentsService.walkComments(…)(comment: postcss.Comment): void [packages/ic-suite/codometer/codometer-languages/src/modules/comments/css-comments.service.ts:74]
      └─> CssCommentsService.toBody(comment: Comment): string [packages/ic-suite/codometer/codometer-languages/src/modules/comments/css-comments.service.ts:36]
         ↳ A comment's text with the whitespace postcss split off restored. `raws.left`/`raws.right` are typed optional, but…
```

**5. `LanguageCommentsService.read`** — depth 4 · orphan-root

```text
🚀 LanguageCommentsService.read(content: string): CommentToken[] [packages/ic-suite/codometer/codometer-languages/src/modules/comments/language-comments.service.ts:142]
  └─> YamlCommentsService.read(content: string): CommentToken[] [packages/ic-suite/codometer/codometer-languages/src/modules/comments/yaml-comments.service.ts:103]
     ↳ Reads every comment the tokenizer found, in the order they appear.
    └─> YamlCommentsService.collectComments(candidate: unknown, scan: YamlCommentScan): void [packages/ic-suite/codometer/codometer-languages/src/modules/comments/yaml-comments.service.ts:43]
       ↳ Walks one parsed token, recording every comment beneath it.
      └─> YamlCommentsService.isCommentToken(…): boolean [packages/ic-suite/codometer/codometer-languages/src/modules/comments/yaml-comments.service.ts:70]
         ↳ Whether a parsed token is a comment carrying an offset.
```

**6. `TypescriptService.anonymous`** — depth 4 · orphan-root

```text
🚀 TypescriptService.anonymous(node: tsCompiler.Node, stats: TypescriptResult, insideClass: boolean): void [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:66]
  └─> TypescriptService.handleFunction(node: tsCompiler.Node, stats: TypescriptResult, insideClass: boolean): void [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:298]
     ↳ Increments function, method, async, sync, exported, and generic counts for a function node.
    └─> TypescriptService.hasExportKeyword(node: tsCompiler.Node): boolean [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:388]
       ↳ Returns true when the node has an export modifier keyword.
      └─> TypescriptService.some(…)(modifier: tsCompiler.Modifier): modifier is tsCompiler.ExportKeyword [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:394]
```

**7. `TypescriptService.anonymous`** — depth 4 · orphan-root

```text
🚀 TypescriptService.anonymous(node: tsCompiler.Node, stats: TypescriptResult): void [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:71]
  └─> TypescriptService.handleEnum(node: tsCompiler.Node, stats: TypescriptResult): void [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:292]
     ↳ Increments enum and exported counts for an enum declaration node.
    └─> TypescriptService.hasExportKeyword(node: tsCompiler.Node): boolean [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:388]
       ↳ Returns true when the node has an export modifier keyword.
      └─> TypescriptService.some(…)(modifier: tsCompiler.Modifier): modifier is tsCompiler.ExportKeyword [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:394]
```

**8. `TypescriptService.anonymous`** — depth 4 · orphan-root

```text
🚀 TypescriptService.anonymous(node: tsCompiler.Node, stats: TypescriptResult, insideClass: boolean): void [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:73]
  └─> TypescriptService.handleFunction(node: tsCompiler.Node, stats: TypescriptResult, insideClass: boolean): void [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:298]
     ↳ Increments function, method, async, sync, exported, and generic counts for a function node.
    └─> TypescriptService.hasExportKeyword(node: tsCompiler.Node): boolean [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:388]
       ↳ Returns true when the node has an export modifier keyword.
      └─> TypescriptService.some(…)(modifier: tsCompiler.Modifier): modifier is tsCompiler.ExportKeyword [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:394]
```

**9. `TypescriptService.anonymous`** — depth 4 · orphan-root

```text
🚀 TypescriptService.anonymous(node: tsCompiler.Node, stats: TypescriptResult, insideClass: boolean): void [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:75]
  └─> TypescriptService.handleFunction(node: tsCompiler.Node, stats: TypescriptResult, insideClass: boolean): void [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:298]
     ↳ Increments function, method, async, sync, exported, and generic counts for a function node.
    └─> TypescriptService.hasExportKeyword(node: tsCompiler.Node): boolean [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:388]
       ↳ Returns true when the node has an export modifier keyword.
      └─> TypescriptService.some(…)(modifier: tsCompiler.Modifier): modifier is tsCompiler.ExportKeyword [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:394]
```

**10. `TypescriptService.anonymous`** — depth 4 · orphan-root

```text
🚀 TypescriptService.anonymous(node: tsCompiler.Node, stats: TypescriptResult): void [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:77]
  └─> TypescriptService.handleMethodOrAccessor(node: tsCompiler.Node, stats: TypescriptResult): void [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:342]
     ↳ Increments method and async or sync counts for a method or accessor node.
    └─> TypescriptService.hasAsyncKeyword(node: tsCompiler.Node): boolean [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:376]
       ↳ Returns true when the node has an async modifier keyword.
      └─> TypescriptService.some(…)(modifier: tsCompiler.Modifier): modifier is tsCompiler.AsyncKeyword [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:382]
```

**11. `TypescriptService.anonymous`** — depth 4 · orphan-root

```text
🚀 TypescriptService.anonymous(node: tsCompiler.Node, stats: TypescriptResult): void [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:81]
  └─> TypescriptService.handleInterface(node: tsCompiler.Node, stats: TypescriptResult): void [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:332]
     ↳ Increments interface, exported, and generic counts for an interface declaration node.
    └─> TypescriptService.hasExportKeyword(node: tsCompiler.Node): boolean [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:388]
       ↳ Returns true when the node has an export modifier keyword.
      └─> TypescriptService.some(…)(modifier: tsCompiler.Modifier): modifier is tsCompiler.ExportKeyword [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:394]
```

**12. `TypescriptService.anonymous`** — depth 4 · orphan-root

```text
🚀 TypescriptService.anonymous(node: tsCompiler.Node, stats: TypescriptResult): void [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:83]
  └─> TypescriptService.handleMethodOrAccessor(node: tsCompiler.Node, stats: TypescriptResult): void [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:342]
     ↳ Increments method and async or sync counts for a method or accessor node.
    └─> TypescriptService.hasAsyncKeyword(node: tsCompiler.Node): boolean [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:376]
       ↳ Returns true when the node has an async modifier keyword.
      └─> TypescriptService.some(…)(modifier: tsCompiler.Modifier): modifier is tsCompiler.AsyncKeyword [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:382]
```

**13. `TypescriptService.anonymous`** — depth 4 · orphan-root

```text
🚀 TypescriptService.anonymous(node: tsCompiler.Node, stats: TypescriptResult): void [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:85]
  └─> TypescriptService.handleMethodOrAccessor(node: tsCompiler.Node, stats: TypescriptResult): void [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:342]
     ↳ Increments method and async or sync counts for a method or accessor node.
    └─> TypescriptService.hasAsyncKeyword(node: tsCompiler.Node): boolean [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:376]
       ↳ Returns true when the node has an async modifier keyword.
      └─> TypescriptService.some(…)(modifier: tsCompiler.Modifier): modifier is tsCompiler.AsyncKeyword [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:382]
```

**14. `TypescriptService.anonymous`** — depth 4 · orphan-root

```text
🚀 TypescriptService.anonymous(node: tsCompiler.Node, stats: TypescriptResult): void [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:87]
  └─> TypescriptService.handleTypeAlias(node: tsCompiler.Node, stats: TypescriptResult): void [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:355]
     ↳ Increments exported and generic counts for a type alias declaration node.
    └─> TypescriptService.hasExportKeyword(node: tsCompiler.Node): boolean [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:388]
       ↳ Returns true when the node has an export modifier keyword.
      └─> TypescriptService.some(…)(modifier: tsCompiler.Modifier): modifier is tsCompiler.ExportKeyword [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:394]
```

**15. `TypescriptService.anonymous`** — depth 4 · orphan-root

```text
🚀 TypescriptService.anonymous(node: tsCompiler.Node, stats: TypescriptResult): void [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:89]
  └─> TypescriptService.handleVariable(node: tsCompiler.Node, stats: TypescriptResult): void [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:364]
     ↳ Increments constant and exported counts for a const variable statement.
    └─> TypescriptService.hasExportKeyword(node: tsCompiler.Node): boolean [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:388]
       ↳ Returns true when the node has an export modifier keyword.
      └─> TypescriptService.some(…)(modifier: tsCompiler.Modifier): modifier is tsCompiler.ExportKeyword [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:394]
```

**16. `LanguageCommentsService.readHash`** — depth 3 · orphan-root

```text
🚀 LanguageCommentsService.readHash(content: string): CommentToken[] [packages/ic-suite/codometer/codometer-languages/src/modules/comments/language-comments.service.ts:109]
  └─> HashCommentsService.read(content: string): CommentToken[] [packages/ic-suite/codometer/codometer-languages/src/modules/comments/hash-comments.service.ts:49]
     ↳ Reads every `#` comment in a file, with its line and its placement.
    └─> HashCommentsService.isShebang(index: number, marker: number, line: string): boolean [packages/ic-suite/codometer/codometer-languages/src/modules/comments/hash-comments.service.ts:42]
       ↳ Whether this is the interpreter line rather than a comment. `#!` on the first line is an instruction to the kernel, not…
```

**17. `TypescriptService.anonymous`** — depth 2 · orphan-root

```text
🚀 TypescriptService.anonymous(node: tsCompiler.Node, stats: TypescriptResult): void [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:79]
  └─> TypescriptService.handleImport(node: tsCompiler.Node, stats: TypescriptResult): void [packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:318]
     ↳ Increments import count and tracks the external package name if applicable.
```

</details>

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `LanguagesService.analyze` | 12 | `PythonService.analyze`, `LanguageCommentsService.measure`, `CssService.analyze`, `HclService.analyze`, `JsonService.analyze`, `JupyterService.analyze`, `MarkdownService.analyze`, `ShellService.analyze`, `SqlService.analyze`, `TomlService.analyze`, `TypescriptService.analyze`, `YamlService.analyze` | `packages/ic-suite/codometer/codometer-languages/src/modules/languages/languages.service.ts:56` |
| `HclCommentsService.read` | 8 | `HclCommentsService.readBlocks`, `HclCommentsService.filter(…)`, `HclCommentsService.readMatches(…)`, `HclCommentsService.readMatches`, `HclCommentsService.filter(…)`, `HclCommentsService.readMatches(…)`, `HclCommentsService.map(…)`, `HclCommentsService.toSorted(…)` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/hcl-comments.service.ts:122` |
| `SqlCommentsService.read` | 6 | `SqlCommentsService.readBlocks`, `SqlCommentsService.filter(…)`, `SqlCommentsService.readMatches(…)`, `SqlCommentsService.readMatches`, `SqlCommentsService.map(…)`, `SqlCommentsService.toSorted(…)` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/sql-comments.service.ts:118` |

<details>
<summary>103 more callables</summary>

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `TypescriptService.walkNode` | 6 | `TypescriptService.countSymbols`, `TypescriptService.collectDeclarationComments`, `TypescriptService.handleClass`, `TypescriptService.forEachChild(…)`, `TypescriptService.dispatchNode`, `TypescriptService.forEachChild(…)` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:459` |
| `JsonService.countNode` | 5 | `JsonService.isArrayNode`, `JsonService.countArrayNode`, `JsonService.isRecordNode`, `JsonService.countRecordNode`, `JsonService.countPrimitiveNode` | `packages/ic-suite/codometer/codometer-languages/src/modules/json/json.service.ts:111` |
| `JupyterService.analyze` | 5 | `JupyterService.collectParts`, `JsonService.analyze`, `PythonService.analyzeContents`, `MarkdownService.analyzeContents`, `JupyterService.countHeadings` | `packages/ic-suite/codometer/codometer-languages/src/modules/jupyter/jupyter.service.ts:166` |
| `TypescriptService.createEmptyResult` | 5 | `TypescriptService.seedDeclarationCommentCounts`, `TypescriptService.filter(…)`, `TypescriptService.map(…)`, `TypescriptService.filter(…)`, `TypescriptService.filter(…)` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:203` |
| `CommentsService.flatMap(…)` | 4 | `CommentsService.readProse`, `CommentsService.measureText`, `CommentsService.toExcerpt`, `CommentsService.readSource` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/comments.service.ts:165` |
| `TypescriptCommentsService.toToken` | 4 | `TypescriptCommentsService.isJsDoc`, `TypescriptCommentsService.lineOf`, `TypescriptCommentsService.isOwnLine`, `TypescriptCommentsService.toProse` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/typescript-comments.service.ts:119` |
| `TypescriptCommentsService.read` | 4 | `TypescriptCommentsService.getScriptKind`, `TypescriptCommentsService.collectComments`, `TypescriptCommentsService.flatMap(…)`, `TypescriptCommentsService.toSorted(…)` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/typescript-comments.service.ts:140` |
| `JsonService.consumeJsoncCharacter` | 4 | `JsonService.handleLineCommentState`, `JsonService.handleBlockCommentState`, `JsonService.handleStringState`, `JsonService.consumeCharacterOutsideComments` | `packages/ic-suite/codometer/codometer-languages/src/modules/json/json.service.ts:66` |
| `DeclarationCommentsService.prepare` | 4 | `DeclarationCommentsService.filter(…)`, `DeclarationCommentsService.getJsDocRange`, `DeclarationCommentsService.getDeclarationName`, `DeclarationCommentsService.readProse` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/declaration-comments.service.ts:71` |
| `YamlCommentsService.read` | 3 | `YamlCommentsService.collectComments`, `YamlCommentsService.map(…)`, `YamlCommentsService.toSorted(…)` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/yaml-comments.service.ts:103` |
| `JsonService.parseDocuments` | 3 | `JsonService.map(…)`, `JsonService.filter(…)`, `JsonService.stripJsoncComments` | `packages/ic-suite/codometer/codometer-languages/src/modules/json/json.service.ts:258` |
| `JsonService.analyze` | 3 | `JsonService.filter(…)`, `JsonService.parseDocuments`, `JsonService.countNode` | `packages/ic-suite/codometer/codometer-languages/src/modules/json/json.service.ts:308` |
| `SqlService.analyze` | 3 | `SqlService.stripComments`, `SqlService.filter(…)`, `SqlService.countKeywords` | `packages/ic-suite/codometer/codometer-languages/src/modules/sql/sql.service.ts:63` |
| `TypescriptService.analyzeFile` | 3 | `TypescriptService.getScriptKind`, `TypescriptService.scanComments`, `TypescriptService.walkNode` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:98` |
| `TypescriptService.handleFunction` | 3 | `TypescriptService.hasExportKeyword`, `TypescriptService.hasAsyncKeyword`, `TypescriptService.hasTypeParameters` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:298` |
| `TypescriptService.analyze` | 3 | `TypescriptService.createEmptyResult`, `TypescriptService.analyzeFile`, `TypescriptService.getCountersForFile` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:485` |
| `CommentsService.measure` | 2 | `CommentsService.flatMap(…)`, `CommentsService.groupIntoBlocks` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/comments.service.ts:164` |
| `CommentsService.measureText` | 2 | `CommentsService.map(…)`, `CommentsService.declaredLimits` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/comments.service.ts:187` |
| `CssCommentsService.walkComments(…)` | 2 | `CssCommentsService.toBody`, `CssCommentsService.toOwnLine` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/css-comments.service.ts:74` |
| `HclCommentsService.readBlocks` | 2 | `HclCommentsService.map(…)`, `HclCommentsService.findBlockComments` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/hcl-comments.service.ts:75` |
| `HclCommentsService.map(…)` | 2 | `HclCommentsService.lineOf`, `HclCommentsService.isOwnLine` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/hcl-comments.service.ts:78` |
| `HclCommentsService.map(…)` | 2 | `HclCommentsService.lineOf`, `HclCommentsService.isOwnLine` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/hcl-comments.service.ts:96` |
| `SqlCommentsService.readBlocks` | 2 | `SqlCommentsService.map(…)`, `SqlCommentsService.findBlockComments` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/sql-comments.service.ts:70` |
| `SqlCommentsService.map(…)` | 2 | `SqlCommentsService.lineOf`, `SqlCommentsService.isOwnLine` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/sql-comments.service.ts:73` |
| `SqlCommentsService.map(…)` | 2 | `SqlCommentsService.lineOf`, `SqlCommentsService.isOwnLine` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/sql-comments.service.ts:91` |
| `YamlCommentsService.collectComments` | 2 | `YamlCommentsService.isCommentToken`, `YamlCommentsService.toToken` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/yaml-comments.service.ts:43` |
| `LanguageCommentsService.measureLanguage` | 2 | `LanguageCommentsService.readFile`, `CommentsService.measure` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/language-comments.service.ts:68` |
| `LanguageCommentsService.measureOneLanguage` | 2 | `LanguageCommentsService.measurePython`, `LanguageCommentsService.measureLanguage` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/language-comments.service.ts:96` |
| `MarkdownService.countNode` | 2 | `MarkdownService.countHeading`, `MarkdownService.countListItem` | `packages/ic-suite/codometer/codometer-languages/src/modules/markdown/markdown.service.ts:62` |
| `PythonService.analyzeContents` | 2 | `PythonService.map(…)`, `PythonService.analyze` | `packages/ic-suite/codometer/codometer-languages/src/modules/python/python.service.ts:87` |
| `JupyterService.collectParts` | 2 | `JupyterService.readNotebook`, `JupyterService.collectCell` | `packages/ic-suite/codometer/codometer-languages/src/modules/jupyter/jupyter.service.ts:88` |
| `SqlService.stripComments` | 2 | `SqlService.replaceAll(…)`, `SqlService.replaceAll(…)` | `packages/ic-suite/codometer/codometer-languages/src/modules/sql/sql.service.ts:48` |
| `TomlService.analyze` | 2 | `TomlService.countLine`, `TomlService.isInsideMultilineString` | `packages/ic-suite/codometer/codometer-languages/src/modules/toml/toml.service.ts:98` |
| `DeclarationCommentsService.measure` | 2 | `DeclarationCommentsService.prepare`, `CommentsService.measureText` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/declaration-comments.service.ts:139` |
| `TypescriptService.countSymbols` | 2 | `TypescriptService.getSymbolModifiers`, `TypescriptService.every(…)` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:173` |
| `TypescriptService.handleClass` | 2 | `TypescriptService.hasExportKeyword`, `TypescriptService.hasTypeParameters` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:285` |
| `TypescriptService.handleInterface` | 2 | `TypescriptService.hasExportKeyword`, `TypescriptService.hasTypeParameters` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:332` |
| `TypescriptService.handleTypeAlias` | 2 | `TypescriptService.hasExportKeyword`, `TypescriptService.hasTypeParameters` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:355` |
| `YamlService.countDocument` | 2 | `YamlService.countComments`, `YamlService.countNode` | `packages/ic-suite/codometer/codometer-languages/src/modules/yaml/yaml.service.ts:88` |
| `YamlService.countNode` | 2 | `YamlService.countComments`, `YamlService.countCollection` | `packages/ic-suite/codometer/codometer-languages/src/modules/yaml/yaml.service.ts:95` |
| `CommentsService.declaredLimits` | 1 | `CommentsService.countWords` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/comments.service.ts:64` |
| `CommentsService.readProse` | 1 | `CommentsService.map(…)` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/comments.service.ts:102` |
| `CommentsService.readSource` | 1 | `CommentsService.map(…)` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/comments.service.ts:110` |
| `CssCommentsService.read` | 1 | `CssCommentsService.walkComments(…)` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/css-comments.service.ts:70` |
| `HashCommentsService.read` | 1 | `HashCommentsService.isShebang` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/hash-comments.service.ts:49` |
| `HclCommentsService.readMatches` | 1 | `HclCommentsService.map(…)` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/hcl-comments.service.ts:91` |
| `HclCommentsService.overlapsBlock` | 1 | `HclCommentsService.some(…)` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/hcl-comments.service.ts:124` |
| `HclCommentsService.filter(…)` | 1 | `HclCommentsService.overlapsBlock` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/hcl-comments.service.ts:131` |
| `HclCommentsService.filter(…)` | 1 | `HclCommentsService.overlapsBlock` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/hcl-comments.service.ts:136` |
| `SqlCommentsService.readMatches` | 1 | `SqlCommentsService.map(…)` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/sql-comments.service.ts:86` |
| `SqlCommentsService.filter(…)` | 1 | `SqlCommentsService.some(…)` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/sql-comments.service.ts:125` |
| `TypescriptCommentsService.flatMap(…)` | 1 | `TypescriptCommentsService.toToken` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/typescript-comments.service.ts:154` |
| `LanguageCommentsService.readHash` | 1 | `HashCommentsService.read` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/language-comments.service.ts:109` |
| `LanguageCommentsService.read` | 1 | `CssCommentsService.read` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/language-comments.service.ts:120` |
| `LanguageCommentsService.read` | 1 | `HclCommentsService.read` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/language-comments.service.ts:124` |
| `LanguageCommentsService.read` | 1 | `SqlCommentsService.read` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/language-comments.service.ts:132` |
| `LanguageCommentsService.read` | 1 | `TypescriptCommentsService.read` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/language-comments.service.ts:137` |
| `LanguageCommentsService.read` | 1 | `YamlCommentsService.read` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/language-comments.service.ts:142` |
| `LanguageCommentsService.measurePython` | 1 | `LanguageCommentsService.flatMap(…)` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/language-comments.service.ts:162` |
| `LanguageCommentsService.flatMap(…)` | 1 | `CommentsService.measure` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/language-comments.service.ts:175` |
| `LanguageCommentsService.measure` | 1 | `LanguageCommentsService.flatMap(…)` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/language-comments.service.ts:212` |
| `LanguageCommentsService.flatMap(…)` | 1 | `LanguageCommentsService.measureOneLanguage` | `packages/ic-suite/codometer/codometer-languages/src/modules/comments/language-comments.service.ts:234` |
| `CssService.analyze` | 1 | `CssService.walk(…)` | `packages/ic-suite/codometer/codometer-languages/src/modules/css/css.service.ts:74` |
| `CssService.walk(…)` | 1 | `CssService.countNode` | `packages/ic-suite/codometer/codometer-languages/src/modules/css/css.service.ts:88` |
| `HclService.countLine` | 1 | `HclService.countBlock` | `packages/ic-suite/codometer/codometer-languages/src/modules/hcl/hcl.service.ts:60` |
| `HclService.analyze` | 1 | `HclService.countLine` | `packages/ic-suite/codometer/codometer-languages/src/modules/hcl/hcl.service.ts:87` |
| `JsonService.countArrayNode` | 1 | `JsonService.countNode` | `packages/ic-suite/codometer/codometer-languages/src/modules/json/json.service.ts:95` |
| `JsonService.countPrimitiveNode` | 1 | `JsonService.countPrimitiveValue` | `packages/ic-suite/codometer/codometer-languages/src/modules/json/json.service.ts:126` |
| `JsonService.countRecordNode` | 1 | `JsonService.countNode` | `packages/ic-suite/codometer/codometer-languages/src/modules/json/json.service.ts:162` |
| `JsonService.stripJsoncComments` | 1 | `JsonService.consumeJsoncCharacter` | `packages/ic-suite/codometer/codometer-languages/src/modules/json/json.service.ts:273` |
| `MarkdownService.walk` | 1 | `MarkdownService.countNode` | `packages/ic-suite/codometer/codometer-languages/src/modules/markdown/markdown.service.ts:81` |
| `MarkdownService.analyze` | 1 | `MarkdownService.analyzeContents` | `packages/ic-suite/codometer/codometer-languages/src/modules/markdown/markdown.service.ts:98` |
| `MarkdownService.analyzeContents` | 1 | `MarkdownService.walk` | `packages/ic-suite/codometer/codometer-languages/src/modules/markdown/markdown.service.ts:126` |
| `JupyterService.collectCell` | 1 | `JupyterService.readSource` | `packages/ic-suite/codometer/codometer-languages/src/modules/jupyter/jupyter.service.ts:57` |
| `ShellService.countLine` | 1 | `ShellService.countStatements` | `packages/ic-suite/codometer/codometer-languages/src/modules/shell/shell.service.ts:45` |
| `ShellService.analyze` | 1 | `ShellService.countLine` | `packages/ic-suite/codometer/codometer-languages/src/modules/shell/shell.service.ts:93` |
| `TomlService.countLine` | 1 | `TomlService.countKey` | `packages/ic-suite/codometer/codometer-languages/src/modules/toml/toml.service.ts:61` |
| `DeclarationCommentsService.getJsDocRange` | 1 | `DeclarationCommentsService.findLast(…)` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/declaration-comments.service.ts:46` |
| `DeclarationCommentsService.readProse` | 1 | `DeclarationCommentsService.map(…)` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/declaration-comments.service.ts:117` |
| `TypescriptService.anonymous` | 1 | `TypescriptService.handleFunction` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:66` |
| `TypescriptService.anonymous` | 1 | `TypescriptService.handleEnum` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:71` |
| `TypescriptService.anonymous` | 1 | `TypescriptService.handleFunction` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:73` |
| `TypescriptService.anonymous` | 1 | `TypescriptService.handleFunction` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:75` |
| `TypescriptService.anonymous` | 1 | `TypescriptService.handleMethodOrAccessor` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:77` |
| `TypescriptService.anonymous` | 1 | `TypescriptService.handleImport` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:79` |
| `TypescriptService.anonymous` | 1 | `TypescriptService.handleInterface` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:81` |
| `TypescriptService.anonymous` | 1 | `TypescriptService.handleMethodOrAccessor` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:83` |
| `TypescriptService.anonymous` | 1 | `TypescriptService.handleMethodOrAccessor` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:85` |
| `TypescriptService.anonymous` | 1 | `TypescriptService.handleTypeAlias` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:87` |
| `TypescriptService.anonymous` | 1 | `TypescriptService.handleVariable` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:89` |
| `TypescriptService.collectDeclarationComments` | 1 | `DeclarationCommentsService.measure` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:127` |
| `TypescriptService.getCountersForFile` | 1 | `TypescriptService.filter(…)` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:240` |
| `TypescriptService.filter(…)` | 1 | `TypescriptService.some(…)` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:245` |
| `TypescriptService.handleEnum` | 1 | `TypescriptService.hasExportKeyword` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:292` |
| `TypescriptService.handleMethodOrAccessor` | 1 | `TypescriptService.hasAsyncKeyword` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:342` |
| `TypescriptService.handleVariable` | 1 | `TypescriptService.hasExportKeyword` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:364` |
| `TypescriptService.hasAsyncKeyword` | 1 | `TypescriptService.some(…)` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:376` |
| `TypescriptService.hasExportKeyword` | 1 | `TypescriptService.some(…)` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:388` |
| `TypescriptService.scanComments` | 1 | `TypescriptService.countComment` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:412` |
| `TypescriptService.forEachChild(…)` | 1 | `TypescriptService.walkNode` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:472` |
| `TypescriptService.forEachChild(…)` | 1 | `TypescriptService.walkNode` | `packages/ic-suite/codometer/codometer-languages/src/modules/typescript/typescript.service.ts:479` |
| `YamlService.countCollection` | 1 | `YamlService.countNode` | `packages/ic-suite/codometer/codometer-languages/src/modules/yaml/yaml.service.ts:46` |
| `YamlService.analyze` | 1 | `YamlService.countDocument` | `packages/ic-suite/codometer/codometer-languages/src/modules/yaml/yaml.service.ts:123` |

</details>
<!-- callidescope:end -->

## 🕸️ Codependix

Dependency graphs exported by [codependix](https://github.com/Organizzolini/codebase/tree/main/packages/ic-suite/codependix/codependix-cli), regenerated by `nx run codebase:codependix:write`.

### Nx Neighborhood

<!-- codependix:start name="codependix-nx-projects" -->
```mermaid
graph LR
  codometer_configuration["codometer-configuration"]
  codometer_core["codometer-core"]
  codometer_languages["codometer-languages"]
  codometer_measurement["codometer-measurement"]
  logging["logging"]
  codometer_languages --> codometer_configuration
  codometer_languages --> codometer_core
  codometer_languages --> logging
  codometer_measurement --> codometer_languages
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class codometer_languages subject
```
<!-- codependix:end name="codependix-nx-projects" -->

### NestJS Module Graph

<!-- codependix:start name="codependix-nestjs-modules" -->
```mermaid
flowchart LR
  CommentsModule
  CssModule
  HclModule
  JsonModule
  JupyterModule
  LanguagesModule
  LoggerModule([LoggerModule])
  MarkdownModule
  PythonModule
  ShellModule
  SqlModule
  TomlModule
  TypescriptModule
  YamlModule
  JupyterModule --> JsonModule
  JupyterModule --> MarkdownModule
  JupyterModule --> PythonModule
  LanguagesModule --> CommentsModule
  LanguagesModule --> CssModule
  LanguagesModule --> HclModule
  LanguagesModule --> JsonModule
  LanguagesModule --> JupyterModule
  LanguagesModule --> MarkdownModule
  LanguagesModule --> PythonModule
  LanguagesModule --> ShellModule
  LanguagesModule --> SqlModule
  LanguagesModule --> TomlModule
  LanguagesModule --> TypescriptModule
  LanguagesModule --> YamlModule
  TypescriptModule --> CommentsModule
```

_Rounded modules are global: every module can inject them, so their edges are left out._
<!-- codependix:end name="codependix-nestjs-modules" -->

### File Imports

<!-- codependix:start name="codependix-file-imports" -->
```mermaid
graph LR
  file_callidescope_config_ts["callidescope.config.ts"]
  file_codependix_config_ts["codependix.config.ts"]
  file_codometer_config_ts["codometer.config.ts"]
  file_eslint_config_ts["eslint.config.ts"]
  file_src_index_ts["src/index.ts"]
  file_src_modules_comments_comments_constants_ts["src/modules/comments/comments.constants.ts"]
  file_src_modules_comments_comments_module_ts["src/modules/comments/comments.module.ts"]
  file_src_modules_comments_comments_module_unit_test_ts["src/modules/comments/comments.module.unit.test.ts"]
  file_src_modules_comments_comments_service_ts["src/modules/comments/comments.service.ts"]
  file_src_modules_comments_comments_service_unit_test_ts["src/modules/comments/comments.service.unit.test.ts"]
  file_src_modules_comments_comments_types_ts["src/modules/comments/comments.types.ts"]
  file_src_modules_comments_css_comments_service_ts["src/modules/comments/css-comments.service.ts"]
  file_src_modules_comments_css_comments_service_unit_test_ts["src/modules/comments/css-comments.service.unit.test.ts"]
  file_src_modules_comments_hash_comments_service_ts["src/modules/comments/hash-comments.service.ts"]
  file_src_modules_comments_hash_comments_service_unit_test_ts["src/modules/comments/hash-comments.service.unit.test.ts"]
  file_src_modules_comments_hcl_comments_service_ts["src/modules/comments/hcl-comments.service.ts"]
  file_src_modules_comments_hcl_comments_service_unit_test_ts["src/modules/comments/hcl-comments.service.unit.test.ts"]
  file_src_modules_comments_language_comments_service_ts["src/modules/comments/language-comments.service.ts"]
  file_src_modules_comments_language_comments_service_unit_test_ts["src/modules/comments/language-comments.service.unit.test.ts"]
  file_src_modules_comments_sql_comments_service_ts["src/modules/comments/sql-comments.service.ts"]
  file_src_modules_comments_sql_comments_service_unit_test_ts["src/modules/comments/sql-comments.service.unit.test.ts"]
  file_src_modules_comments_typescript_comments_constants_ts["src/modules/comments/typescript-comments.constants.ts"]
  file_src_modules_comments_typescript_comments_service_ts["src/modules/comments/typescript-comments.service.ts"]
  file_src_modules_comments_typescript_comments_service_unit_test_ts["src/modules/comments/typescript-comments.service.unit.test.ts"]
  file_src_modules_comments_yaml_comments_service_ts["src/modules/comments/yaml-comments.service.ts"]
  file_src_modules_comments_yaml_comments_service_unit_test_ts["src/modules/comments/yaml-comments.service.unit.test.ts"]
  file_src_modules_css_css_constants_ts["src/modules/css/css.constants.ts"]
  file_src_modules_css_css_module_ts["src/modules/css/css.module.ts"]
  file_src_modules_css_css_module_unit_test_ts["src/modules/css/css.module.unit.test.ts"]
  file_src_modules_css_css_service_ts["src/modules/css/css.service.ts"]
  file_src_modules_css_css_service_unit_test_ts["src/modules/css/css.service.unit.test.ts"]
  file_src_modules_css_css_types_ts["src/modules/css/css.types.ts"]
  file_src_modules_hcl_hcl_constants_ts["src/modules/hcl/hcl.constants.ts"]
  file_src_modules_hcl_hcl_module_ts["src/modules/hcl/hcl.module.ts"]
  file_src_modules_hcl_hcl_module_unit_test_ts["src/modules/hcl/hcl.module.unit.test.ts"]
  file_src_modules_hcl_hcl_service_ts["src/modules/hcl/hcl.service.ts"]
  file_src_modules_hcl_hcl_service_unit_test_ts["src/modules/hcl/hcl.service.unit.test.ts"]
  file_src_modules_hcl_hcl_types_ts["src/modules/hcl/hcl.types.ts"]
  file_src_modules_json_json_constants_ts["src/modules/json/json.constants.ts"]
  file_src_modules_json_json_module_ts["src/modules/json/json.module.ts"]
  file_src_modules_json_json_module_unit_test_ts["src/modules/json/json.module.unit.test.ts"]
  file_src_modules_json_json_service_ts["src/modules/json/json.service.ts"]
  file_src_modules_json_json_service_unit_test_ts["src/modules/json/json.service.unit.test.ts"]
  file_src_modules_json_json_types_ts["src/modules/json/json.types.ts"]
  file_src_modules_jupyter_jupyter_constants_ts["src/modules/jupyter/jupyter.constants.ts"]
  file_src_modules_jupyter_jupyter_module_ts["src/modules/jupyter/jupyter.module.ts"]
  file_src_modules_jupyter_jupyter_module_unit_test_ts["src/modules/jupyter/jupyter.module.unit.test.ts"]
  file_src_modules_jupyter_jupyter_service_ts["src/modules/jupyter/jupyter.service.ts"]
  file_src_modules_jupyter_jupyter_service_unit_test_ts["src/modules/jupyter/jupyter.service.unit.test.ts"]
  file_src_modules_jupyter_jupyter_types_ts["src/modules/jupyter/jupyter.types.ts"]
  file_src_modules_languages_languages_constants_ts["src/modules/languages/languages.constants.ts"]
  file_src_modules_languages_languages_module_ts["src/modules/languages/languages.module.ts"]
  file_src_modules_languages_languages_module_unit_test_ts["src/modules/languages/languages.module.unit.test.ts"]
  file_src_modules_languages_languages_service_ts["src/modules/languages/languages.service.ts"]
  file_src_modules_languages_languages_service_unit_test_ts["src/modules/languages/languages.service.unit.test.ts"]
  file_src_modules_languages_languages_types_ts["src/modules/languages/languages.types.ts"]
  file_src_modules_markdown_markdown_constants_ts["src/modules/markdown/markdown.constants.ts"]
  file_src_modules_markdown_markdown_module_ts["src/modules/markdown/markdown.module.ts"]
  file_src_modules_markdown_markdown_module_unit_test_ts["src/modules/markdown/markdown.module.unit.test.ts"]
  file_src_modules_markdown_markdown_service_ts["src/modules/markdown/markdown.service.ts"]
  file_src_modules_markdown_markdown_service_unit_test_ts["src/modules/markdown/markdown.service.unit.test.ts"]
  file_src_modules_markdown_markdown_types_ts["src/modules/markdown/markdown.types.ts"]
  file_src_modules_python_python_constants_ts["src/modules/python/python.constants.ts"]
  file_src_modules_python_python_module_ts["src/modules/python/python.module.ts"]
  file_src_modules_python_python_module_unit_test_ts["src/modules/python/python.module.unit.test.ts"]
  file_src_modules_python_python_service_ts["src/modules/python/python.service.ts"]
  file_src_modules_python_python_service_unit_test_ts["src/modules/python/python.service.unit.test.ts"]
  file_src_modules_python_python_types_ts["src/modules/python/python.types.ts"]
  file_src_modules_shell_shell_constants_ts["src/modules/shell/shell.constants.ts"]
  file_src_modules_shell_shell_module_ts["src/modules/shell/shell.module.ts"]
  file_src_modules_shell_shell_module_unit_test_ts["src/modules/shell/shell.module.unit.test.ts"]
  file_src_modules_shell_shell_service_ts["src/modules/shell/shell.service.ts"]
  file_src_modules_shell_shell_service_unit_test_ts["src/modules/shell/shell.service.unit.test.ts"]
  file_src_modules_shell_shell_types_ts["src/modules/shell/shell.types.ts"]
  file_src_modules_sql_sql_constants_ts["src/modules/sql/sql.constants.ts"]
  file_src_modules_sql_sql_module_ts["src/modules/sql/sql.module.ts"]
  file_src_modules_sql_sql_module_unit_test_ts["src/modules/sql/sql.module.unit.test.ts"]
  file_src_modules_sql_sql_service_ts["src/modules/sql/sql.service.ts"]
  file_src_modules_sql_sql_service_unit_test_ts["src/modules/sql/sql.service.unit.test.ts"]
  file_src_modules_sql_sql_types_ts["src/modules/sql/sql.types.ts"]
  file_src_modules_toml_toml_constants_ts["src/modules/toml/toml.constants.ts"]
  file_src_modules_toml_toml_module_ts["src/modules/toml/toml.module.ts"]
  file_src_modules_toml_toml_module_unit_test_ts["src/modules/toml/toml.module.unit.test.ts"]
  file_src_modules_toml_toml_service_ts["src/modules/toml/toml.service.ts"]
  file_src_modules_toml_toml_service_unit_test_ts["src/modules/toml/toml.service.unit.test.ts"]
  file_src_modules_toml_toml_types_ts["src/modules/toml/toml.types.ts"]
  file_src_modules_typescript_declaration_comments_service_ts["src/modules/typescript/declaration-comments.service.ts"]
  file_src_modules_typescript_declaration_comments_service_unit_test_ts["src/modules/typescript/declaration-comments.service.unit.test.ts"]
  file_src_modules_typescript_typescript_constants_ts["src/modules/typescript/typescript.constants.ts"]
  file_src_modules_typescript_typescript_module_ts["src/modules/typescript/typescript.module.ts"]
  file_src_modules_typescript_typescript_module_unit_test_ts["src/modules/typescript/typescript.module.unit.test.ts"]
  file_src_modules_typescript_typescript_service_ts["src/modules/typescript/typescript.service.ts"]
  file_src_modules_typescript_typescript_service_unit_test_ts["src/modules/typescript/typescript.service.unit.test.ts"]
  file_src_modules_typescript_typescript_types_ts["src/modules/typescript/typescript.types.ts"]
  file_src_modules_yaml_yaml_constants_ts["src/modules/yaml/yaml.constants.ts"]
  file_src_modules_yaml_yaml_module_ts["src/modules/yaml/yaml.module.ts"]
  file_src_modules_yaml_yaml_module_unit_test_ts["src/modules/yaml/yaml.module.unit.test.ts"]
  file_src_modules_yaml_yaml_service_ts["src/modules/yaml/yaml.service.ts"]
  file_src_modules_yaml_yaml_service_unit_test_ts["src/modules/yaml/yaml.service.unit.test.ts"]
  file_src_modules_yaml_yaml_types_ts["src/modules/yaml/yaml.types.ts"]
  file_testing_mocks_ts["testing/mocks.ts"]
  file_testing_setup_ts["testing/setup.ts"]
  file_vite_config_ts["vite.config.ts"]
  file_vitest_config_ts["vitest.config.ts"]
  file_src_modules_comments_comments_module_ts --> file_src_modules_comments_comments_service_ts
  file_src_modules_comments_comments_module_ts --> file_src_modules_comments_css_comments_service_ts
  file_src_modules_comments_comments_module_ts --> file_src_modules_comments_hash_comments_service_ts
  file_src_modules_comments_comments_module_ts --> file_src_modules_comments_hcl_comments_service_ts
  file_src_modules_comments_comments_module_ts --> file_src_modules_comments_language_comments_service_ts
  file_src_modules_comments_comments_module_ts --> file_src_modules_comments_sql_comments_service_ts
  file_src_modules_comments_comments_module_ts --> file_src_modules_comments_typescript_comments_service_ts
  file_src_modules_comments_comments_module_ts --> file_src_modules_comments_yaml_comments_service_ts
  file_src_modules_comments_comments_module_unit_test_ts --> file_src_modules_comments_comments_module_ts
  file_src_modules_comments_comments_module_unit_test_ts --> file_src_modules_comments_comments_service_ts
  file_src_modules_comments_comments_module_unit_test_ts --> file_src_modules_comments_css_comments_service_ts
  file_src_modules_comments_comments_module_unit_test_ts --> file_src_modules_comments_hash_comments_service_ts
  file_src_modules_comments_comments_module_unit_test_ts --> file_src_modules_comments_hcl_comments_service_ts
  file_src_modules_comments_comments_module_unit_test_ts --> file_src_modules_comments_language_comments_service_ts
  file_src_modules_comments_comments_module_unit_test_ts --> file_src_modules_comments_sql_comments_service_ts
  file_src_modules_comments_comments_module_unit_test_ts --> file_src_modules_comments_typescript_comments_service_ts
  file_src_modules_comments_comments_module_unit_test_ts --> file_src_modules_comments_yaml_comments_service_ts
  file_src_modules_comments_comments_service_ts --> file_src_modules_comments_comments_constants_ts
  file_src_modules_comments_comments_service_ts --> file_src_modules_comments_comments_types_ts
  file_src_modules_comments_comments_service_unit_test_ts --> file_src_modules_comments_comments_service_ts
  file_src_modules_comments_comments_service_unit_test_ts --> file_src_modules_comments_comments_types_ts
  file_src_modules_comments_comments_service_unit_test_ts --> file_src_modules_comments_hash_comments_service_ts
  file_src_modules_comments_css_comments_service_ts --> file_src_modules_comments_comments_types_ts
  file_src_modules_comments_css_comments_service_unit_test_ts --> file_src_modules_comments_css_comments_service_ts
  file_src_modules_comments_hash_comments_service_ts --> file_src_modules_comments_comments_constants_ts
  file_src_modules_comments_hash_comments_service_ts --> file_src_modules_comments_comments_types_ts
  file_src_modules_comments_hash_comments_service_unit_test_ts --> file_src_modules_comments_hash_comments_service_ts
  file_src_modules_comments_hcl_comments_service_ts --> file_src_modules_comments_comments_constants_ts
  file_src_modules_comments_hcl_comments_service_ts --> file_src_modules_comments_comments_types_ts
  file_src_modules_comments_hcl_comments_service_unit_test_ts --> file_src_modules_comments_hcl_comments_service_ts
  file_src_modules_comments_language_comments_service_ts --> file_src_modules_comments_comments_service_ts
  file_src_modules_comments_language_comments_service_ts --> file_src_modules_comments_comments_types_ts
  file_src_modules_comments_language_comments_service_ts --> file_src_modules_comments_css_comments_service_ts
  file_src_modules_comments_language_comments_service_ts --> file_src_modules_comments_hash_comments_service_ts
  file_src_modules_comments_language_comments_service_ts --> file_src_modules_comments_hcl_comments_service_ts
  file_src_modules_comments_language_comments_service_ts --> file_src_modules_comments_sql_comments_service_ts
  file_src_modules_comments_language_comments_service_ts --> file_src_modules_comments_typescript_comments_service_ts
  file_src_modules_comments_language_comments_service_ts --> file_src_modules_comments_yaml_comments_service_ts
  file_src_modules_comments_language_comments_service_unit_test_ts --> file_src_modules_comments_comments_service_ts
  file_src_modules_comments_language_comments_service_unit_test_ts --> file_src_modules_comments_comments_types_ts
  file_src_modules_comments_language_comments_service_unit_test_ts --> file_src_modules_comments_css_comments_service_ts
  file_src_modules_comments_language_comments_service_unit_test_ts --> file_src_modules_comments_hash_comments_service_ts
  file_src_modules_comments_language_comments_service_unit_test_ts --> file_src_modules_comments_hcl_comments_service_ts
  file_src_modules_comments_language_comments_service_unit_test_ts --> file_src_modules_comments_language_comments_service_ts
  file_src_modules_comments_language_comments_service_unit_test_ts --> file_src_modules_comments_sql_comments_service_ts
  file_src_modules_comments_language_comments_service_unit_test_ts --> file_src_modules_comments_typescript_comments_service_ts
  file_src_modules_comments_language_comments_service_unit_test_ts --> file_src_modules_comments_yaml_comments_service_ts
  file_src_modules_comments_sql_comments_service_ts --> file_src_modules_comments_comments_types_ts
  file_src_modules_comments_sql_comments_service_ts --> file_src_modules_sql_sql_constants_ts
  file_src_modules_comments_sql_comments_service_unit_test_ts --> file_src_modules_comments_sql_comments_service_ts
  file_src_modules_comments_typescript_comments_service_ts --> file_src_modules_comments_comments_types_ts
  file_src_modules_comments_typescript_comments_service_ts --> file_src_modules_comments_typescript_comments_constants_ts
  file_src_modules_comments_typescript_comments_service_unit_test_ts --> file_src_modules_comments_typescript_comments_service_ts
  file_src_modules_comments_yaml_comments_service_ts --> file_src_modules_comments_comments_constants_ts
  file_src_modules_comments_yaml_comments_service_ts --> file_src_modules_comments_comments_types_ts
  file_src_modules_comments_yaml_comments_service_unit_test_ts --> file_src_modules_comments_yaml_comments_service_ts
  file_src_modules_css_css_constants_ts --> file_src_modules_css_css_types_ts
  file_src_modules_css_css_module_ts --> file_src_modules_css_css_service_ts
  file_src_modules_css_css_module_unit_test_ts --> file_src_modules_css_css_module_ts
  file_src_modules_css_css_module_unit_test_ts --> file_src_modules_css_css_service_ts
  file_src_modules_css_css_service_ts --> file_src_modules_css_css_constants_ts
  file_src_modules_css_css_service_ts --> file_src_modules_css_css_types_ts
  file_src_modules_css_css_service_unit_test_ts --> file_src_modules_css_css_service_ts
  file_src_modules_hcl_hcl_constants_ts --> file_src_modules_hcl_hcl_types_ts
  file_src_modules_hcl_hcl_module_ts --> file_src_modules_hcl_hcl_service_ts
  file_src_modules_hcl_hcl_module_unit_test_ts --> file_src_modules_hcl_hcl_module_ts
  file_src_modules_hcl_hcl_module_unit_test_ts --> file_src_modules_hcl_hcl_service_ts
  file_src_modules_hcl_hcl_service_ts --> file_src_modules_hcl_hcl_constants_ts
  file_src_modules_hcl_hcl_service_ts --> file_src_modules_hcl_hcl_types_ts
  file_src_modules_hcl_hcl_service_unit_test_ts --> file_src_modules_hcl_hcl_service_ts
  file_src_modules_json_json_constants_ts --> file_src_modules_json_json_types_ts
  file_src_modules_json_json_module_ts --> file_src_modules_json_json_service_ts
  file_src_modules_json_json_module_unit_test_ts --> file_src_modules_json_json_module_ts
  file_src_modules_json_json_module_unit_test_ts --> file_src_modules_json_json_service_ts
  file_src_modules_json_json_service_ts --> file_src_modules_json_json_constants_ts
  file_src_modules_json_json_service_ts --> file_src_modules_json_json_types_ts
  file_src_modules_json_json_service_unit_test_ts --> file_src_modules_json_json_service_ts
  file_src_modules_jupyter_jupyter_constants_ts --> file_src_modules_jupyter_jupyter_types_ts
  file_src_modules_jupyter_jupyter_module_ts --> file_src_modules_json_json_module_ts
  file_src_modules_jupyter_jupyter_module_ts --> file_src_modules_jupyter_jupyter_service_ts
  file_src_modules_jupyter_jupyter_module_ts --> file_src_modules_markdown_markdown_module_ts
  file_src_modules_jupyter_jupyter_module_ts --> file_src_modules_python_python_module_ts
  file_src_modules_jupyter_jupyter_module_unit_test_ts --> file_src_modules_jupyter_jupyter_module_ts
  file_src_modules_jupyter_jupyter_module_unit_test_ts --> file_src_modules_jupyter_jupyter_service_ts
  file_src_modules_jupyter_jupyter_service_ts --> file_src_modules_json_json_service_ts
  file_src_modules_jupyter_jupyter_service_ts --> file_src_modules_jupyter_jupyter_constants_ts
  file_src_modules_jupyter_jupyter_service_ts --> file_src_modules_jupyter_jupyter_types_ts
  file_src_modules_jupyter_jupyter_service_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_jupyter_jupyter_service_ts --> file_src_modules_markdown_markdown_types_ts
  file_src_modules_jupyter_jupyter_service_ts --> file_src_modules_python_python_service_ts
  file_src_modules_jupyter_jupyter_service_unit_test_ts --> file_src_modules_json_json_service_ts
  file_src_modules_jupyter_jupyter_service_unit_test_ts --> file_src_modules_jupyter_jupyter_service_ts
  file_src_modules_jupyter_jupyter_service_unit_test_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_jupyter_jupyter_service_unit_test_ts --> file_src_modules_python_python_constants_ts
  file_src_modules_jupyter_jupyter_service_unit_test_ts --> file_src_modules_python_python_service_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_comments_comments_module_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_css_css_module_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_hcl_hcl_module_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_json_json_module_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_jupyter_jupyter_module_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_languages_languages_service_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_markdown_markdown_module_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_python_python_module_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_shell_shell_module_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_sql_sql_module_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_toml_toml_module_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_typescript_typescript_module_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_yaml_yaml_module_ts
  file_src_modules_languages_languages_module_unit_test_ts --> file_src_modules_languages_languages_module_ts
  file_src_modules_languages_languages_module_unit_test_ts --> file_src_modules_languages_languages_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_comments_language_comments_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_css_css_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_hcl_hcl_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_json_json_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_jupyter_jupyter_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_languages_languages_types_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_python_python_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_shell_shell_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_sql_sql_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_toml_toml_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_typescript_typescript_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_yaml_yaml_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_comments_comments_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_comments_comments_types_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_comments_css_comments_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_comments_hash_comments_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_comments_hcl_comments_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_comments_language_comments_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_comments_sql_comments_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_comments_typescript_comments_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_comments_yaml_comments_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_css_css_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_hcl_hcl_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_json_json_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_jupyter_jupyter_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_languages_languages_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_languages_languages_types_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_python_python_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_shell_shell_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_sql_sql_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_toml_toml_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_typescript_typescript_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_yaml_yaml_service_ts
  file_src_modules_languages_languages_types_ts --> file_src_modules_comments_comments_types_ts
  file_src_modules_languages_languages_types_ts --> file_src_modules_css_css_types_ts
  file_src_modules_languages_languages_types_ts --> file_src_modules_hcl_hcl_types_ts
  file_src_modules_languages_languages_types_ts --> file_src_modules_json_json_types_ts
  file_src_modules_languages_languages_types_ts --> file_src_modules_jupyter_jupyter_types_ts
  file_src_modules_languages_languages_types_ts --> file_src_modules_markdown_markdown_types_ts
  file_src_modules_languages_languages_types_ts --> file_src_modules_python_python_types_ts
  file_src_modules_languages_languages_types_ts --> file_src_modules_shell_shell_types_ts
  file_src_modules_languages_languages_types_ts --> file_src_modules_sql_sql_types_ts
  file_src_modules_languages_languages_types_ts --> file_src_modules_toml_toml_types_ts
  file_src_modules_languages_languages_types_ts --> file_src_modules_typescript_typescript_types_ts
  file_src_modules_languages_languages_types_ts --> file_src_modules_yaml_yaml_types_ts
  file_src_modules_markdown_markdown_constants_ts --> file_src_modules_markdown_markdown_types_ts
  file_src_modules_markdown_markdown_module_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_markdown_markdown_module_unit_test_ts --> file_src_modules_markdown_markdown_module_ts
  file_src_modules_markdown_markdown_module_unit_test_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_markdown_markdown_service_ts --> file_src_modules_markdown_markdown_constants_ts
  file_src_modules_markdown_markdown_service_ts --> file_src_modules_markdown_markdown_types_ts
  file_src_modules_markdown_markdown_service_unit_test_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_python_python_constants_ts --> file_src_modules_python_python_types_ts
  file_src_modules_python_python_module_ts --> file_src_modules_python_python_service_ts
  file_src_modules_python_python_module_unit_test_ts --> file_src_modules_python_python_module_ts
  file_src_modules_python_python_module_unit_test_ts --> file_src_modules_python_python_service_ts
  file_src_modules_python_python_service_ts --> file_src_modules_python_python_constants_ts
  file_src_modules_python_python_service_ts --> file_src_modules_python_python_types_ts
  file_src_modules_python_python_service_unit_test_ts --> file_src_modules_python_python_constants_ts
  file_src_modules_python_python_service_unit_test_ts --> file_src_modules_python_python_service_ts
  file_src_modules_python_python_types_ts --> file_src_modules_comments_comments_types_ts
  file_src_modules_shell_shell_constants_ts --> file_src_modules_shell_shell_types_ts
  file_src_modules_shell_shell_module_ts --> file_src_modules_shell_shell_service_ts
  file_src_modules_shell_shell_module_unit_test_ts --> file_src_modules_shell_shell_module_ts
  file_src_modules_shell_shell_module_unit_test_ts --> file_src_modules_shell_shell_service_ts
  file_src_modules_shell_shell_service_ts --> file_src_modules_shell_shell_constants_ts
  file_src_modules_shell_shell_service_ts --> file_src_modules_shell_shell_types_ts
  file_src_modules_shell_shell_service_unit_test_ts --> file_src_modules_shell_shell_service_ts
  file_src_modules_sql_sql_constants_ts --> file_src_modules_sql_sql_types_ts
  file_src_modules_sql_sql_module_ts --> file_src_modules_sql_sql_service_ts
  file_src_modules_sql_sql_module_unit_test_ts --> file_src_modules_sql_sql_module_ts
  file_src_modules_sql_sql_module_unit_test_ts --> file_src_modules_sql_sql_service_ts
  file_src_modules_sql_sql_service_ts --> file_src_modules_sql_sql_constants_ts
  file_src_modules_sql_sql_service_ts --> file_src_modules_sql_sql_types_ts
  file_src_modules_sql_sql_service_unit_test_ts --> file_src_modules_sql_sql_service_ts
  file_src_modules_toml_toml_constants_ts --> file_src_modules_toml_toml_types_ts
  file_src_modules_toml_toml_module_ts --> file_src_modules_toml_toml_service_ts
  file_src_modules_toml_toml_module_unit_test_ts --> file_src_modules_toml_toml_module_ts
  file_src_modules_toml_toml_module_unit_test_ts --> file_src_modules_toml_toml_service_ts
  file_src_modules_toml_toml_service_ts --> file_src_modules_toml_toml_constants_ts
  file_src_modules_toml_toml_service_ts --> file_src_modules_toml_toml_types_ts
  file_src_modules_toml_toml_service_unit_test_ts --> file_src_modules_toml_toml_service_ts
  file_src_modules_typescript_declaration_comments_service_ts --> file_src_modules_comments_comments_service_ts
  file_src_modules_typescript_declaration_comments_service_ts --> file_src_modules_comments_comments_types_ts
  file_src_modules_typescript_declaration_comments_service_ts --> file_src_modules_typescript_typescript_constants_ts
  file_src_modules_typescript_declaration_comments_service_ts --> file_src_modules_typescript_typescript_types_ts
  file_src_modules_typescript_declaration_comments_service_unit_test_ts --> file_src_modules_comments_comments_service_ts
  file_src_modules_typescript_declaration_comments_service_unit_test_ts --> file_src_modules_comments_comments_types_ts
  file_src_modules_typescript_declaration_comments_service_unit_test_ts --> file_src_modules_typescript_declaration_comments_service_ts
  file_src_modules_typescript_declaration_comments_service_unit_test_ts --> file_src_modules_typescript_typescript_types_ts
  file_src_modules_typescript_typescript_constants_ts --> file_src_modules_typescript_typescript_types_ts
  file_src_modules_typescript_typescript_module_ts --> file_src_modules_comments_comments_module_ts
  file_src_modules_typescript_typescript_module_ts --> file_src_modules_typescript_declaration_comments_service_ts
  file_src_modules_typescript_typescript_module_ts --> file_src_modules_typescript_typescript_service_ts
  file_src_modules_typescript_typescript_module_unit_test_ts --> file_src_modules_typescript_declaration_comments_service_ts
  file_src_modules_typescript_typescript_module_unit_test_ts --> file_src_modules_typescript_typescript_module_ts
  file_src_modules_typescript_typescript_module_unit_test_ts --> file_src_modules_typescript_typescript_service_ts
  file_src_modules_typescript_typescript_service_ts --> file_src_modules_comments_comments_types_ts
  file_src_modules_typescript_typescript_service_ts --> file_src_modules_typescript_declaration_comments_service_ts
  file_src_modules_typescript_typescript_service_ts --> file_src_modules_typescript_typescript_constants_ts
  file_src_modules_typescript_typescript_service_ts --> file_src_modules_typescript_typescript_types_ts
  file_src_modules_typescript_typescript_service_unit_test_ts --> file_src_modules_comments_comments_service_ts
  file_src_modules_typescript_typescript_service_unit_test_ts --> file_src_modules_comments_comments_types_ts
  file_src_modules_typescript_typescript_service_unit_test_ts --> file_src_modules_typescript_declaration_comments_service_ts
  file_src_modules_typescript_typescript_service_unit_test_ts --> file_src_modules_typescript_typescript_service_ts
  file_src_modules_typescript_typescript_service_unit_test_ts --> file_src_modules_typescript_typescript_types_ts
  file_src_modules_typescript_typescript_types_ts --> file_src_modules_comments_comments_types_ts
  file_src_modules_yaml_yaml_constants_ts --> file_src_modules_yaml_yaml_types_ts
  file_src_modules_yaml_yaml_module_ts --> file_src_modules_yaml_yaml_service_ts
  file_src_modules_yaml_yaml_module_unit_test_ts --> file_src_modules_yaml_yaml_module_ts
  file_src_modules_yaml_yaml_module_unit_test_ts --> file_src_modules_yaml_yaml_service_ts
  file_src_modules_yaml_yaml_service_ts --> file_src_modules_yaml_yaml_constants_ts
  file_src_modules_yaml_yaml_service_ts --> file_src_modules_yaml_yaml_types_ts
  file_src_modules_yaml_yaml_service_unit_test_ts --> file_src_modules_yaml_yaml_service_ts
```
<!-- codependix:end name="codependix-file-imports" -->

<!-- codometer:start -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-10290-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-311.65_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-16-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-103-3178c6?style=flat-square)

### Measured Targets

![Compiled JavaScript Size](https://img.shields.io/badge/Compiled_JavaScript_Size-49.05_kB_gzip-6b7280?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-102-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-45-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-0-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-34-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-266-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-0-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-34-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-20-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-34-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-370-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-189-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-527-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-32-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-544-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-494-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-126-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-558-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-989-475569?style=flat-square)
![TODO Comments](https://img.shields.io/badge/TODO_Comments-3-ca8a04?style=flat-square)

### Python

![Python Files](https://img.shields.io/badge/Python_Files-1-3776ab?style=flat-square)
![Python Lines](https://img.shields.io/badge/Python_Lines-118-4b8bbe?style=flat-square)
![Python Classes](https://img.shields.io/badge/Python_Classes-0-7c3aed?style=flat-square)
![Python Functions](https://img.shields.io/badge/Python_Functions-4-16a34a?style=flat-square)
![Python Protocols](https://img.shields.io/badge/Python_Protocols-0-0ea5e9?style=flat-square)
![Python Constants](https://img.shields.io/badge/Python_Constants-1-dc2626?style=flat-square)
![Python Imports](https://img.shields.io/badge/Python_Imports-7-0284c7?style=flat-square)
![Python Decorators](https://img.shields.io/badge/Python_Decorators-0-db2777?style=flat-square)
![Docstrings](https://img.shields.io/badge/Docstrings-3-6366f1?style=flat-square)
![Docstring Lines](https://img.shields.io/badge/Docstring_Lines-19-818cf8?style=flat-square)
![Python Comments](https://img.shields.io/badge/Python_Comments-1-64748b?style=flat-square)
![Python Comment Lines](https://img.shields.io/badge/Python_Comment_Lines-1-475569?style=flat-square)

### JSON

![JSON Files](https://img.shields.io/badge/JSON_Files-4-a16207?style=flat-square)
![JSON Lines](https://img.shields.io/badge/JSON_Lines-147-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-30-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-13-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-94-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-83-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-1-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-7-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-36-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-134-dc2626?style=flat-square)
![JSON Max Depth](https://img.shields.io/badge/JSON_Max_Depth-7-ea580c?style=flat-square)

### YAML

![YAML Files](https://img.shields.io/badge/YAML_Files-0-cb171e?style=flat-square)
![YAML Lines](https://img.shields.io/badge/YAML_Lines-0-e34c26?style=flat-square)
![YAML Documents](https://img.shields.io/badge/YAML_Documents-0-f97316?style=flat-square)
![YAML Mappings](https://img.shields.io/badge/YAML_Mappings-0-7c3aed?style=flat-square)
![YAML Sequences](https://img.shields.io/badge/YAML_Sequences-0-8b5cf6?style=flat-square)
![YAML Keys](https://img.shields.io/badge/YAML_Keys-0-0284c7?style=flat-square)
![YAML Scalars](https://img.shields.io/badge/YAML_Scalars-0-16a34a?style=flat-square)
![YAML Anchors](https://img.shields.io/badge/YAML_Anchors-0-059669?style=flat-square)
![YAML Aliases](https://img.shields.io/badge/YAML_Aliases-0-10b981?style=flat-square)
![YAML Comments](https://img.shields.io/badge/YAML_Comments-0-64748b?style=flat-square)
![YAML Max Depth](https://img.shields.io/badge/YAML_Max_Depth-0-ea580c?style=flat-square)

### TOML

![TOML Files](https://img.shields.io/badge/TOML_Files-0-9c4221?style=flat-square)
![TOML Lines](https://img.shields.io/badge/TOML_Lines-0-b45309?style=flat-square)
![TOML Tables](https://img.shields.io/badge/TOML_Tables-0-7c3aed?style=flat-square)
![TOML Array Tables](https://img.shields.io/badge/TOML_Array_Tables-0-8b5cf6?style=flat-square)
![TOML Keys](https://img.shields.io/badge/TOML_Keys-0-0284c7?style=flat-square)
![TOML Arrays](https://img.shields.io/badge/TOML_Arrays-0-16a34a?style=flat-square)
![TOML Comments](https://img.shields.io/badge/TOML_Comments-0-64748b?style=flat-square)

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

![Module Files](https://img.shields.io/badge/Module_Files-13-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-21-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-0-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-14-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-13-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-0-0ea5e9?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-059669?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-34-ca8a04?style=flat-square)
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

![Notebooks](https://img.shields.io/badge/Notebooks-0-f37626?style=flat-square)
![Notebook Cells](https://img.shields.io/badge/Notebook_Cells-0-e8a33d?style=flat-square)
![Code Cells](https://img.shields.io/badge/Code_Cells-0-3776ab?style=flat-square)
![Markdown Cells](https://img.shields.io/badge/Markdown_Cells-0-083fa1?style=flat-square)
![Raw Cells](https://img.shields.io/badge/Raw_Cells-0-9ca3af?style=flat-square)
![Executed Cells](https://img.shields.io/badge/Executed_Cells-0-16a34a?style=flat-square)
![Cell Outputs](https://img.shields.io/badge/Cell_Outputs-0-059669?style=flat-square)
![Notebook Code Lines](https://img.shields.io/badge/Notebook_Code_Lines-0-4b8bbe?style=flat-square)
![Notebook Classes](https://img.shields.io/badge/Notebook_Classes-0-7c3aed?style=flat-square)
![Notebook Functions](https://img.shields.io/badge/Notebook_Functions-0-22c55e?style=flat-square)
![Notebook Imports](https://img.shields.io/badge/Notebook_Imports-0-0284c7?style=flat-square)
![Notebook Decorators](https://img.shields.io/badge/Notebook_Decorators-0-db2777?style=flat-square)
![Notebook Prose Lines](https://img.shields.io/badge/Notebook_Prose_Lines-0-1f6feb?style=flat-square)
![Notebook Headings](https://img.shields.io/badge/Notebook_Headings-0-a78bfa?style=flat-square)
![Notebook Links](https://img.shields.io/badge/Notebook_Links-0-10b981?style=flat-square)
![Notebook Images](https://img.shields.io/badge/Notebook_Images-0-34d399?style=flat-square)
![Notebook Code Blocks](https://img.shields.io/badge/Notebook_Code_Blocks-0-dc2626?style=flat-square)
![Notebook Properties](https://img.shields.io/badge/Notebook_Properties-0-ca8a04?style=flat-square)
![Notebook Nodes](https://img.shields.io/badge/Notebook_Nodes-0-a16207?style=flat-square)
![Notebook Max Depth](https://img.shields.io/badge/Notebook_Max_Depth-0-ea580c?style=flat-square)

### Markdown

![Markdown Files](https://img.shields.io/badge/Markdown_Files-1-083fa1?style=flat-square)
![Markdown Lines](https://img.shields.io/badge/Markdown_Lines-222-1f6feb?style=flat-square)
![H1](https://img.shields.io/badge/H1-1-7c3aed?style=flat-square)
![H2](https://img.shields.io/badge/H2-7-8b5cf6?style=flat-square)
![H3](https://img.shields.io/badge/H3-12-a78bfa?style=flat-square)
![H4](https://img.shields.io/badge/H4-0-c4b5fd?style=flat-square)
![H5](https://img.shields.io/badge/H5-0-ddd6fe?style=flat-square)
![H6](https://img.shields.io/badge/H6-0-ede9fe?style=flat-square)
![Paragraphs](https://img.shields.io/badge/Paragraphs-45-64748b?style=flat-square)
![Lists](https://img.shields.io/badge/Lists-6-16a34a?style=flat-square)
![List Items](https://img.shields.io/badge/List_Items-25-22c55e?style=flat-square)
![Task List Items](https://img.shields.io/badge/Task_List_Items-0-4ade80?style=flat-square)
![Tables](https://img.shields.io/badge/Tables-2-0284c7?style=flat-square)
![Table Rows](https://img.shields.io/badge/Table_Rows-10-0ea5e9?style=flat-square)
![Links](https://img.shields.io/badge/Links-9-059669?style=flat-square)
![Images](https://img.shields.io/badge/Images-0-10b981?style=flat-square)
![Code Blocks](https://img.shields.io/badge/Code_Blocks-11-dc2626?style=flat-square)
![Inline Code](https://img.shields.io/badge/Inline_Code-73-ef4444?style=flat-square)
![Block Quotes](https://img.shields.io/badge/Block_Quotes-0-ca8a04?style=flat-square)
![Thematic Breaks](https://img.shields.io/badge/Thematic_Breaks-0-a16207?style=flat-square)
<!-- codometer:end -->
