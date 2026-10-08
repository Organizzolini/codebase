import { Test } from "@nestjs/testing";
import prompts from "prompts";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { InputService } from "./input.service";

// Mocked at the module boundary so the service's own wiring is exercised and
// no test ever reaches for a terminal.
vi.mock("prompts", () => ({ default: vi.fn() }));

const promptRunner = vi.mocked(prompts);

describe(InputService, () => {
  let service: InputService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [InputService],
    }).compile();

    service = await module.resolve(InputService);
  });

  const originalIsTty = process.stdin.isTTY;

  beforeEach(() => {
    // A terminal by default, so a prompt test exercises the prompt rather
    // than the refusal standing in front of it.
    process.stdin.isTTY = true;
  });

  afterEach(() => {
    promptRunner.mockReset();
    delete process.env["CI"];
    process.stdin.isTTY = originalIsTty;
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // 🎛️ Prompt gating

  // `prompts` draws its menu on a non-terminal stdin, never resolves, and
  // lets the process exit 0. Every prompt refuses up front rather than
  // becoming that silent green no-op.
  it.each([
    [
      "an autocomplete multiselect",
      async () =>
        service.promptForAutocompleteMultiselect({
          message: "Which callables?",
          subject: "At least one callable address",
          suggestions: [],
        }),
    ],
    [
      "a select",
      async () =>
        service.promptForSelect({
          choices: ["json"],
          message: "Which format?",
          subject: "An output format",
        }),
    ],
  ])("refuses %s prompt when stdin is not a terminal", async (_name, ask) => {
    process.stdin.isTTY = false;

    await expect(ask()).rejects.toThrow(
      "is required, and stdin is not a terminal so it cannot be asked for",
    );
    expect(promptRunner).not.toHaveBeenCalled();
  });

  it("prompts in CI when a terminal is attached, having no policy of its own", async () => {
    process.stdin.isTTY = true;
    process.env["CI"] = "true";
    promptRunner.mockResolvedValue({ value: "json" });

    await expect(
      service.promptForSelect({
        choices: ["json", "markdown"],
        message: "Which format?",
        subject: "An output format",
      }),
    ).resolves.toBe("json");
  });

  // 🔤 Comma-delimited option

  it("splits a comma-delimited option into its values", () => {
    expect(
      service.parseCommaDelimitedOption("packages/a, packages/b"),
    ).toStrictEqual(["packages/a", "packages/b"]);
  });

  it("reads an absent comma-delimited option as an empty list", () => {
    expect(service.parseCommaDelimitedOption(undefined)).toStrictEqual([]);
  });

  it("drops empty entries from a comma-delimited option", () => {
    expect(
      service.parseCommaDelimitedOption("packages/a,,packages/b,"),
    ).toStrictEqual(["packages/a", "packages/b"]);
  });

  // 🧭 Suggestion completion

  it("narrows the suggestions to what was typed, case-insensitively", () => {
    expect(
      service.completeSuggestions({
        input: "A.B",
        suggestions: ["src/a.service.ts#A.b", "src/z.service.ts#Z.y"],
      }),
    ).toStrictEqual(["src/a.service.ts#A.b"]);
  });

  // The name is far more often what someone remembers than the path.
  it("matches a suggestion on any part of it, not only its start", () => {
    expect(
      service.completeSuggestions({
        input: "Z.y",
        suggestions: ["src/a.service.ts#A.b", "src/z.service.ts#Z.y"],
      }),
    ).toStrictEqual(["src/z.service.ts#Z.y"]);
  });

  // `prompts` submits the selected suggestion and never the raw text, so a
  // value absent from the list could not be typed at all without this.
  it("offers what was typed as its own choice when nothing matches", () => {
    expect(
      service.completeSuggestions({
        input: "src/new.service.ts#New.made",
        suggestions: ["src/a.service.ts#A.b"],
      }),
    ).toStrictEqual(["src/new.service.ts#New.made"]);
  });

  // Alongside real matches it would sit at the top of every list, ahead of
  // the completions that were the point of asking.
  it("never offers the typed text alongside real matches", () => {
    expect(
      service.completeSuggestions({
        input: "A.b",
        suggestions: ["src/a.service.ts#A.b"],
      }),
    ).toStrictEqual(["src/a.service.ts#A.b"]);
  });

  it("offers every suggestion before anything has been typed", () => {
    expect(
      service.completeSuggestions({
        input: "",
        suggestions: ["src/a.service.ts#A.b"],
      }),
    ).toStrictEqual(["src/a.service.ts#A.b"]);
  });

  it("offers nothing for an empty list nobody has typed into", () => {
    expect(
      service.completeSuggestions({ input: "", suggestions: [] }),
    ).toStrictEqual([]);
  });

  // 🧭 Autocomplete multiselect

  it("resolves a multiselect to every value that was ticked", async () => {
    promptRunner.mockResolvedValue({
      value: ["src/a.service.ts#A.b", "src/z.service.ts#Z.y"],
    });

    await expect(
      service.promptForAutocompleteMultiselect({
        message: "Which callables?",
        subject: "At least one callable address",
        suggestions: ["src/a.service.ts#A.b", "src/z.service.ts#Z.y"],
      }),
    ).resolves.toStrictEqual(["src/a.service.ts#A.b", "src/z.service.ts#Z.y"]);
  });

  // `prompts` returns `[]` both for a deliberate empty selection and for a
  // prompt escaped out of, and the caller cannot act on either.
  it.each([[[]], [undefined]])(
    "refuses a multiselect that chose nothing (%s)",
    async (value) => {
      promptRunner.mockResolvedValue({ value });

      await expect(
        service.promptForAutocompleteMultiselect({
          message: "Which callables?",
          subject: "At least one callable address",
          suggestions: ["src/a.service.ts#A.b"],
        }),
      ).rejects.toThrow("At least one callable address was not answered.");
    },
  );

  it("rejects a multiselect that resolved to something other than text", async () => {
    promptRunner.mockResolvedValue({ value: ["src/a.service.ts#A.b", 7] });

    await expect(
      service.promptForAutocompleteMultiselect({
        message: "Which callables?",
        subject: "At least one callable address",
        suggestions: ["src/a.service.ts#A.b"],
      }),
    ).rejects.toThrow("Prompt resolved to something other than a list of text");
  });

  // The same completion rule as the single autocomplete, so a name narrows
  // the list here exactly as it would there.
  it("hands the multiselect each completion as a titled choice", async () => {
    promptRunner.mockResolvedValue({ value: ["src/a.service.ts#A.b"] });

    await service.promptForAutocompleteMultiselect({
      message: "Which callables?",
      subject: "At least one callable address",
      suggestions: ["src/a.service.ts#A.b", "src/z.service.ts#Z.y"],
    });

    const request = promptRunner.mock.calls[0]?.[0];

    if (
      request === undefined ||
      Array.isArray(request) ||
      !("suggest" in request) ||
      request.suggest === undefined
    ) {
      throw new Error("The prompt was asked for without a completer.");
    }

    const offered = (await request.suggest("A.b", [])) as {
      title: string;
      value: string;
    }[];

    expect(offered).toStrictEqual([
      { title: "src/a.service.ts#A.b", value: "src/a.service.ts#A.b" },
    ]);
  });

  // 🔡 Optional option

  it("passes a non-blank optional option through trimmed", () => {
    expect(service.parseOptionalOption("  callidescope.config.ts  ")).toBe(
      "callidescope.config.ts",
    );
  });

  it("reads a blank optional option as absent", () => {
    expect(service.parseOptionalOption("   ")).toBeUndefined();
  });

  it("reads an absent optional option as absent", () => {
    expect(service.parseOptionalOption(undefined)).toBeUndefined();
  });

  // 🗣️ Prompting

  it("resolves a select prompt to the choice the user picked", async () => {
    promptRunner.mockResolvedValue({ value: "json" });

    await expect(
      service.promptForSelect({
        choices: ["json", "markdown", "mermaid"],
        message: "Which format?",
        subject: "An output format",
      }),
    ).resolves.toBe("json");
  });

  it("rejects a select prompt that resolved outside its choices", async () => {
    promptRunner.mockResolvedValue({ value: "nonsense" });

    await expect(
      service.promptForSelect({
        choices: ["json", "markdown", "mermaid"],
        message: "Which format?",
        subject: "An output format",
      }),
    ).rejects.toThrow("Prompt did not resolve to one of");
  });

  // Escape resolves the prompt with nothing rather than rejecting, so an
  // ordinary dismissal has to be told apart from an unrecognized answer.
  it("rejects a select prompt that was cancelled", async () => {
    promptRunner.mockResolvedValue({});

    await expect(
      service.promptForSelect({
        choices: ["json", "markdown", "mermaid"],
        message: "Which format?",
        subject: "An output format",
      }),
    ).rejects.toThrow("An output format was not answered.");
  });
});
