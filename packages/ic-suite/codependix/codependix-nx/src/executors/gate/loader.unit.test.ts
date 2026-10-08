import { describe, expect, it, vi } from "vitest";

/** `node:module`'s `register`, which the shim calls once on import. */
const register = vi.hoisted(() =>
  vi.fn<(specifier: string, parentUrl: string) => void>(),
);

vi.mock("node:module", () => ({ register }));

/** The shim, named by a variable: it is JavaScript, with no types to check. */
const LOADER_PATH = "./loader.mjs";

describe("gate loader", () => {
  it("registers the swc hooks resolved from this plugin, not the working directory", async () => {
    expect.hasAssertions();

    await import(LOADER_PATH);

    // `@swc-node/register/esm-register` registers the same hooks relative to
    // the working directory — the consumer's root, which need not have them.
    expect(register).toHaveBeenCalledWith(
      "@swc-node/register/esm",
      expect.stringMatching(/\/src\/executors\/gate\/loader\.mjs$/u),
    );
  });
});
