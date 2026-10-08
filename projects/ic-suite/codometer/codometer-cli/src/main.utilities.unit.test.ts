import { describe, expect, it } from "vitest";

import { withDefaultCommand } from "./main.utilities";

describe(withDefaultCommand, () => {
  it("inserts measure ahead of a bare flag", () => {
    expect(withDefaultCommand(["--directory", "."])).toStrictEqual([
      "measure",
      "--directory",
      ".",
    ]);
  });

  it("inserts measure when no arguments were given", () => {
    expect(withDefaultCommand([])).toStrictEqual(["measure"]);
  });

  it("leaves an explicit measure invocation alone", () => {
    expect(withDefaultCommand(["measure", "--write"])).toStrictEqual([
      "measure",
      "--write",
    ]);
  });

  it("leaves an explicit changes invocation alone", () => {
    expect(
      withDefaultCommand(["changes", "--baseline", ".baseline"]),
    ).toStrictEqual(["changes", "--baseline", ".baseline"]);
  });

  it.each(["-h", "--help"])(
    "leaves a bare %s alone, so it lists every command",
    (flag) => {
      expect(withDefaultCommand([flag])).toStrictEqual([flag]);
    },
  );

  it("leaves the help command alone", () => {
    expect(withDefaultCommand(["help", "changes"])).toStrictEqual([
      "help",
      "changes",
    ]);
  });
});
