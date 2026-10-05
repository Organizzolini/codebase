import { RuleTester } from "eslint";
import { describe, it } from "vitest";

import { conventionalLogMessageRule } from "./conventional-log-message.eslint-rule";

// RuleTester defaults to Mocha's globals, which this workspace's Vitest
// config does not inject (`globals: false`), so it is pointed at Vitest's
// instead.
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: "latest", sourceType: "module" },
});

ruleTester.run("conventional-log-message", conventionalLogMessageRule, {
  invalid: [
    {
      // One of two real violations a prior audit found in
      // packages/ic-suite/callidescope/callidescope-cli/src/modules/workspace/workspace.service.ts —
      // "Could" is not a conventional verb.
      code: 'logger.error("🔭 Could not apply ignore file: x");',
      errors: [{ data: { word: "Could" }, messageId: "nonConventionalVerb" }],
    },
    {
      // The second real violation from the same audit — "Unreadable" is an
      // adjective, not a verb.
      code: 'logger.error("🔭 Unreadable project manifest: x");',
      errors: [
        { data: { word: "Unreadable" }, messageId: "nonConventionalVerb" },
      ],
    },
    {
      code: 'logger.log("Downloaded files");',
      errors: [{ messageId: "missingLeadingEmoji" }],
    },
    {
      // `info` is the preferred, more descriptive name for `log` — it must be
      // checked exactly the same way, not treated as an unrecognized method.
      code: 'logger.info("🔭 Could not resolve a workspace project");',
      errors: [{ data: { word: "Could" }, messageId: "nonConventionalVerb" }],
    },
  ],
  valid: [
    // Regular past tense.
    'logger.log("👔 Validated conformetry instances");',
    // Present progressive.
    'logger.log("📥 Downloading CSEL sources");',
    // `info` follows the identical convention.
    'logger.info("📥 Downloading CSEL sources");',
    // Irregular past tense, from `IRREGULAR_PAST_VERBS`.
    'logger.log("✅ Built the project");',
    // A template literal's static prefix, before the first interpolation.
    "logger.log(`📥 Downloaded ${count} files`);",
    // A non-literal message — an identifier such as a caught error — cannot
    // be checked statically, so it is skipped rather than reported.
    "logger.error(error);",
    // A non-string literal is just as unknowable as any other expression.
    "logger.log(123);",
    // An unrelated object named `formatter`, not a `logger` field.
    "formatter.log(x);",
    // Not a member expression at all.
    "log(x);",
    // A computed member access, deliberately outside the heuristic.
    'logger["log"](x);',
    // A method the heuristic doesn't recognize as a logging call.
    'logger.fatal("👔 Something");',
    // No message argument to check.
    "logger.log();",
  ],
});
