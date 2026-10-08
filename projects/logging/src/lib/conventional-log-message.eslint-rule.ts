import {
  FIRST_WORD_PATTERN,
  IRREGULAR_PAST_VERBS,
  LEADING_EMOJI_PATTERN,
} from "../modules/logger/logger.constants.js";

import type { ESLint, Rule } from "eslint";

// cspell:ignore quasis — ESTree's own name for a `TemplateLiteral`'s static
// text chunks (the parts between interpolations); not a coined abbreviation.

// ♟️ Constants

/** Method names on a logger field this rule inspects. */
const LOGGER_METHOD_NAMES = new Set([
  "debug",
  "error",
  "info",
  "log",
  "verbose",
  "warn",
]);

// 🏷️ Types

/** Either half of the message convention a log call can fail. */
type ConventionalLogMessageViolation =
  | { data: { word: string }; messageId: "nonConventionalVerb" }
  | { data?: undefined; messageId: "missingLeadingEmoji" };

/**
 * The narrow slice of a message argument's shape this rule reads.
 *
 * Hand-rolled instead of imported from `@types/estree` — that package isn't
 * part of this package's own dependency graph, and every field here is
 * optional except `type`, so the real `Literal`/`TemplateLiteral`/etc. node
 * ESLint hands the visitor is always structurally assignable to it.
 */
interface MessageArgumentShape {
  quasis?: readonly { value: { cooked?: null | string | undefined } }[];
  type: string;
  value?: unknown;
}

/** A message split into the emoji the console shows and the prose after it. */
interface ParsedLogMessage {
  emoji: string | undefined;
  text: string;
}

// 🔏 Message Convention
// Mirrors `LoggerService`'s own `parseMessage`/`isConventionalVerb`, minus the
// production and context-exemption branches — those only matter at runtime,
// never while scanning source text. The AST inspection itself lives directly
// in the rule's `CallExpression` visitor below rather than in named helpers,
// so this file never has to name an ESTree node type: `@types/estree` isn't
// part of this package's own dependency graph, and the visitor's parameter
// already carries the precise type ESLint infers for it.

/** Checks a static message's text against the logging convention. */
function checkConventionalMessage(
  text: string,
): ConventionalLogMessageViolation | undefined {
  const { emoji, text: remainder } = parseLogMessage(text);

  if (emoji === undefined) {
    return { messageId: "missingLeadingEmoji" };
  }

  const firstWord = FIRST_WORD_PATTERN.exec(remainder)?.[1];

  if (firstWord === undefined || !isConventionalVerb(firstWord)) {
    return {
      data: { word: firstWord ?? "" },
      messageId: "nonConventionalVerb",
    };
  }

  return undefined;
}

/**
 * Extracts a message argument's static text, if it has one, and checks it
 * against the logging convention.
 *
 * Only a `Literal` string or a `TemplateLiteral`'s static prefix (the text
 * before its first interpolation) can be checked; anything else — an
 * identifier, a caught error, a non-string literal — has no statically
 * knowable text, so it is left unchecked rather than reported.
 */
function checkMessageArgumentConvention(
  argument: MessageArgumentShape,
): ConventionalLogMessageViolation | undefined {
  let messageText: string | undefined;

  if (argument.type === "Literal" && typeof argument.value === "string") {
    messageText = argument.value;
  } else if (argument.type === "TemplateLiteral") {
    messageText = argument.quasis?.[0]?.value.cooked ?? undefined;
  }

  return messageText === undefined
    ? undefined
    : checkConventionalMessage(messageText);
}

/** Whether a word is a verb in present progressive or past tense. */
function isConventionalVerb(word: string): boolean {
  const lowercased = word.toLowerCase();

  return (
    lowercased.endsWith("ing") ||
    lowercased.endsWith("ed") ||
    IRREGULAR_PAST_VERBS.has(lowercased)
  );
}

/** Whether a call expression's object reads as a logger field. */
function isLoggerObjectText(text: string): boolean {
  return text === "logger" || text.endsWith(".logger");
}

/** Splits a leading emoji off a message, leaving prose behind. */
function parseLogMessage(message: string): ParsedLogMessage {
  const match = LEADING_EMOJI_PATTERN.exec(message);
  const emoji = match?.[1];

  return emoji === undefined
    ? { emoji: undefined, text: message }
    : { emoji, text: message.slice(match?.[0].length) };
}

// 📏 Rule

/**
 * Flags a log call whose message doesn't start with an emoji naming its
 * subject, then a verb in present progressive or past tense — the same
 * convention `LoggerService` enforces at runtime, checked here statically so
 * a violation surfaces at lint time rather than the first time the line runs.
 *
 * A call counts as a log call when its callee is an `info`/`log`/`warn`/
 * `error`/`debug`/`verbose` method on an object whose source text is exactly
 * `logger` or ends with `.logger`. Only a `Literal` string or the static prefix of a
 * `TemplateLiteral` message can be checked; any other expression (an
 * identifier, a caught error, a function call) is skipped silently, since
 * static analysis cannot know its runtime value.
 */
const conventionalLogMessageMeta: {
  documentation: { description: string };
  messages: {
    missingLeadingEmoji: string;
    nonConventionalVerb: string;
  };
  schema: [];
  type: "problem";
} = {
  documentation: {
    description:
      "Require a log call message to start with an emoji naming its subject, then a verb in present progressive or past tense.",
  },
  messages: {
    missingLeadingEmoji:
      "Log message must start with an emoji naming its subject, then a verb.",
    nonConventionalVerb:
      'Log message must begin with a verb in present progressive or past tense, got "{{word}}".',
  },
  schema: [],
  type: "problem",
};

export const conventionalLogMessageRule: Rule.RuleModule = {
  create(context): Rule.RuleListener {
    return {
      CallExpression(node): void {
        const { callee } = node;

        if (callee.type !== "MemberExpression" || callee.computed) {
          return;
        }

        if (
          callee.property.type !== "Identifier" ||
          !LOGGER_METHOD_NAMES.has(callee.property.name)
        ) {
          return;
        }

        if (!isLoggerObjectText(context.sourceCode.getText(callee.object))) {
          return;
        }

        const messageArgument = node.arguments[0];

        if (messageArgument === undefined) {
          return;
        }

        const violation = checkMessageArgumentConvention(messageArgument);

        if (violation === undefined) {
          return;
        }

        context.report({
          data: violation.data,
          messageId: violation.messageId,
          node: messageArgument,
        });
      },
    };
  },
  meta: conventionalLogMessageMeta,
};

/** The flat-config plugin object `configuration/eslint.config.ts` registers. */
export const conventionalLogMessagePlugin: ESLint.Plugin = {
  rules: {
    "conventional-log-message": conventionalLogMessageRule,
  },
};
