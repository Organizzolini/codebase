import {
  codometerConfiguration,
  compiledJavaScriptTarget,
} from "../../../../configuration/codometer.config.js";

export default {
  ...codometerConfiguration,
  inputs: [
    {
      ...compiledJavaScriptTarget,
      include: ["dist/**/*.js"],
    },
  ],
  // `generate` gained template resolution and a picker, and `validate` gained
  // the template filter and the two reports that tell "nothing matched" apart
  // from "everything conforms", which is why the 16 KB this package used to
  // declare was breached by 102 bytes and raised to 17 KB. The workspace-wide
  // two-rung raise supersedes that number rather than contradicting it: 32 KB
  // is two rungs above 16 KB and covers the same growth.
  limits: [{ metric: "Compiled JavaScript.size", value: "32 KB" }],
};
