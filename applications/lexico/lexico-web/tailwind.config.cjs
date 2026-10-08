const path = require("node:path");

const baseConfig = require("../../../packages/components-web/tailwind.config.cjs");

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...baseConfig,
  content: [
    path.join(__dirname, "src/**/*.{js,ts,jsx,tsx,html}"),
    path.join(
      __dirname,
      "../../../packages/components-web/src/**/*.{js,ts,jsx,tsx}",
    ),
  ],
};
