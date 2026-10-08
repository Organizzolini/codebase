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
  // This package gained the template pickers, the reserved-name rule, and the
  // rule deciding which instance groups a host with no project graph can
  // locate, which is why the 24 KB it used to declare was breached and raised
  // to 26 KB. There was no dead code behind that breach — the output grew
  // because the package did. The workspace-wide two-rung raise supersedes the
  // number rather than contradicting it: 48 KB is two rungs above 24 KB and
  // covers the same growth.
  limits: [{ metric: "Compiled JavaScript.size", value: "32 KB" }],
};
