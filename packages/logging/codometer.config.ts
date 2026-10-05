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
  limits: [{ metric: "Compiled JavaScript.size", value: "12 KB" }],
};
