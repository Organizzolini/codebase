import { Injectable } from "@nestjs/common";

import { HASH_COMMENT_MARKER_PATTERN } from "./comments.constants";

import type { CommentToken } from "./comments.types";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Reads the comments of a language whose comments start with `#`.
 *
 * Shell, TOML, and Python all mark a comment the same way and all three
 * already scan their sources line by line, which is why one reader serves
 * them.
 *
 * It is a line scanner, not a tokenizer, and that is a real limitation rather
 * than an oversight: a `#` inside a string literal is read as a comment here,
 * exactly as those three analyzers' own `comments` counters already read it.
 * YAML is measured by `YamlCommentsService` instead, whose tokenizer knows the
 * difference, because YAML's `#` sits next to quoted scalars constantly.
 */
@Injectable()
/* v8 ignore stop */
export class HashCommentsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Whether this is the interpreter line rather than a comment.
   *
   * `#!` on the first line is an instruction to the kernel, not prose. Left in,
   * it would be grouped with whatever comment follows it — every shell script
   * opening with a shebang and a comment would measure one block carrying
   * `!/bin/sh` as its first word.
   */
  private isShebang(index: number, marker: number, line: string): boolean {
    return index === 0 && marker === 0 && line.startsWith("#!");
  }

  // 🌎 Public Methods

  /** Reads every `#` comment in a file, with its line and its placement. */
  read(content: string): CommentToken[] {
    const tokens: CommentToken[] = [];

    for (const [index, line] of content.split("\n").entries()) {
      const marker = line.indexOf("#");

      if (marker !== -1 && !this.isShebang(index, marker, line)) {
        const source = line.slice(marker);

        tokens.push({
          line: index + 1,
          ownLine: line.slice(0, marker).trim() === "",
          prose: source.replace(HASH_COMMENT_MARKER_PATTERN, ""),
          source,
        });
      }
    }

    return tokens;
  }
}
