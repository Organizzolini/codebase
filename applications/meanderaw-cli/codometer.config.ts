import {
  codometerConfiguration,
  compiledJavaScriptTarget,
} from "../../configuration/codometer.config.js";

export default {
  ...codometerConfiguration,
  inputs: [
    {
      ...compiledJavaScriptTarget,
      include: ["dist/**/*.js"],
    },
  ],
  // 🎯 One rung up from 192 KB, where preserving the historical corpus as
  // hardcoded Code constants (ticket #818 of spec #813) put it: the
  // compiled output measured 205,350 bytes against the old ceiling. The
  // ladder these limits sit on is roughly doubling — 6, 12, 32, 128, 192,
  // 256, 384 — and 256 is the next step that leaves real headroom. This is
  // expected to shrink again once ticket #819 retires the nine per-family
  // procedural motif modules the lattice-first pipeline replaces.
  limits: [{ metric: "Compiled JavaScript.size", value: "256 KB" }],
};
