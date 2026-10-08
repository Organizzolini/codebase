import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { mockProcessExit } from "../../../testing/mocks";

import { PullRequestBodyCommand } from "./pull-request-body.command";
import {
  PULL_REQUEST_BODY_VARIABLE,
  PULL_REQUEST_TEMPLATE_PATH,
} from "./pull-request-body.constants";
import { PullRequestBodyService } from "./pull-request-body.service";

/** The template the mocked workspace holds, and the body a path resolves to. */
const fileContents = new Map<string, string>();

vi.mock("node:fs", () => ({
  readFileSync: vi.fn<(target: string) => string>((target: string) => {
    if (target === "non-error.md") {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw "plain string error";
    }

    const contents = fileContents.get(target);

    if (contents === undefined) {
      throw new Error(`ENOENT: no such file or directory, open '${target}'`);
    }

    return contents;
  }),
}));

/** The template as it stands, prompts and all. */
const templateBody = [
  "## 🌰 Summary",
  "",
  "<!-- Brief description of what this PR does (1-2 sentences) -->",
  "",
  "## 📝 Details",
  "",
  "- <!-- List of specific changes made -->",
  "",
  "## 🧪 Testing",
  "",
  "1. <!-- How to manually verify these changes work correctly -->",
  "",
  "## 🔗 Related",
  "",
  "- <!-- Link any relevant documentation or related resources -->",
  "",
].join("\n");

/** The four headings, each with real content under it. */
const validBody = [
  "## 🌰 Summary",
  "",
  "Moves four checks into a validation application.",
  "",
  "## 📝 Details",
  "",
  "- Adds the project",
  "",
  "## 🧪 Testing",
  "",
  "1. Run the suite",
  "",
  "## 🔗 Related",
  "",
  "- Issue 120",
  "",
].join("\n");

describe(PullRequestBodyCommand, () => {
  let command: PullRequestBodyCommand;
  let reportLines: string[];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PullRequestBodyCommand,
        PullRequestBodyService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(PullRequestBodyCommand);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    Reflect.deleteProperty(process.env, PULL_REQUEST_BODY_VARIABLE);
    fileContents.clear();
    fileContents.set(PULL_REQUEST_TEMPLATE_PATH, templateBody);
    reportLines = [];
    vi.spyOn(console, "info").mockImplementation((line: unknown): void => {
      reportLines.push(String(line));
    });
    vi.spyOn(console, "error").mockImplementation((line: unknown): void => {
      reportLines.push(String(line));
    });
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    expect.hasAssertions();

    const module = await Test.createTestingModule({
      providers: [
        PullRequestBodyCommand,
        PullRequestBodyService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("PullRequestBodyCommand");
  });

  /** Runs the command and reports whether it exited non-zero. */
  const runCommand = async (
    passedParameters: string[] = [],
  ): Promise<boolean> => {
    const processExitSpy = mockProcessExit();

    try {
      await command.run(passedParameters);

      return false;
    } catch (error) {
      expect(error).toStrictEqual(new Error("process.exit:1"));

      return true;
    } finally {
      processExitSpy.mockRestore();
    }
  };

  it("passes a fully valid description", async () => {
    expect.hasAssertions();

    process.env[PULL_REQUEST_BODY_VARIABLE] = validBody;

    await expect(runCommand()).resolves.toBe(false);
    expect(reportLines).toStrictEqual(["✅ All required sections present"]);
  });

  it("reports an empty description", async () => {
    expect.hasAssertions();

    await expect(runCommand()).resolves.toBe(true);
    expect(reportLines).toStrictEqual([
      "❌ Unable to determine Pull Request Body",
    ]);
  });

  it("reports a description of nothing but whitespace", async () => {
    expect.hasAssertions();

    process.env[PULL_REQUEST_BODY_VARIABLE] = "   \n  ";

    await expect(runCommand()).resolves.toBe(true);
    expect(reportLines).toStrictEqual([
      "❌ Unable to determine Pull Request Body",
    ]);
  });

  it("names every missing heading on one line", async () => {
    expect.hasAssertions();

    process.env[PULL_REQUEST_BODY_VARIABLE] = "nothing at all";

    await expect(runCommand()).resolves.toBe(true);
    expect(reportLines[0]).toBe(
      "❌ Missing required sections: 🌰 Summary 📝 Details 🧪 Testing 🔗 Related",
    );
  });

  it("reports an empty section alone", async () => {
    expect.hasAssertions();

    const bodyWithEmptySection = [
      "## 🌰 Summary",
      "",
      "Moves four checks into a validation application.",
      "",
      "## 📝 Details",
      "",
      "## 🧪 Testing",
      "",
      "1. Run the suite",
      "",
      "## 🔗 Related",
      "",
      "- Issue 120",
    ].join("\n");

    process.env[PULL_REQUEST_BODY_VARIABLE] = bodyWithEmptySection;

    await expect(runCommand()).resolves.toBe(true);
    expect(reportLines).toStrictEqual([
      "❌ Empty required sections: 📝 Details",
      "",
      "PR description must include: ## 🌰 Summary, ## 📝 Details, ## 🧪 Testing, ## 🔗 Related, with every template comment replaced by real content.",
      "See: .github/PULL_REQUEST_TEMPLATE.md",
    ]);
  });

  it("reports a surviving prompt alone", async () => {
    expect.hasAssertions();

    process.env[PULL_REQUEST_BODY_VARIABLE] =
      `${validBody}\n- <!-- List of specific changes made -->`;

    await expect(runCommand()).resolves.toBe(true);
    expect(reportLines).toStrictEqual([
      "❌ Unfilled template comments remain:",
      "- <!-- List of specific changes made -->",
      "",
      "PR description must include: ## 🌰 Summary, ## 📝 Details, ## 🧪 Testing, ## 🔗 Related, with every template comment replaced by real content.",
      "See: .github/PULL_REQUEST_TEMPLATE.md",
    ]);
  });

  it("reports a missing heading and a surviving prompt together", async () => {
    expect.hasAssertions();

    process.env[PULL_REQUEST_BODY_VARIABLE] =
      `${validBody.replace("## 🔗 Related", "## Related")}\n- <!-- List of specific changes made -->`;

    await expect(runCommand()).resolves.toBe(true);
    expect(reportLines).toStrictEqual([
      "❌ Missing required sections: 🔗 Related",
      "",
      "❌ Unfilled template comments remain:",
      "- <!-- List of specific changes made -->",
      "",
      "PR description must include: ## 🌰 Summary, ## 📝 Details, ## 🧪 Testing, ## 🔗 Related, with every template comment replaced by real content.",
      "See: .github/PULL_REQUEST_TEMPLATE.md",
    ]);
  });

  it("reports empty sections and all four prompts when handed the raw template", async () => {
    expect.hasAssertions();

    process.env[PULL_REQUEST_BODY_VARIABLE] = templateBody;

    await expect(runCommand()).resolves.toBe(true);
    expect(reportLines).toStrictEqual([
      "❌ Empty required sections: 🌰 Summary 📝 Details 🧪 Testing 🔗 Related",
      "",
      "❌ Unfilled template comments remain:",
      "- <!-- Brief description of what this PR does (1-2 sentences) -->",
      "- <!-- List of specific changes made -->",
      "- <!-- How to manually verify these changes work correctly -->",
      "- <!-- Link any relevant documentation or related resources -->",
      "",
      "PR description must include: ## 🌰 Summary, ## 📝 Details, ## 🧪 Testing, ## 🔗 Related, with every template comment replaced by real content.",
      "See: .github/PULL_REQUEST_TEMPLATE.md",
    ]);
  });

  it("reads the description from a path argument", async () => {
    expect.hasAssertions();

    fileContents.set("body.md", validBody);

    await expect(runCommand(["body.md"])).resolves.toBe(false);
    expect(reportLines).toStrictEqual(["✅ All required sections present"]);
  });

  it("reports a path it cannot read", async () => {
    expect.hasAssertions();

    await expect(runCommand(["missing.md"])).resolves.toBe(true);
    expect(reportLines[0]).toContain(
      "❌ Unable to read the body from missing.md: ",
    );
  });

  it("reports a path read failure when readFileSync throws a non-Error", async () => {
    expect.hasAssertions();

    await expect(runCommand(["non-error.md"])).resolves.toBe(true);
    expect(reportLines[0]).toContain(
      "❌ Unable to read the body from non-error.md: plain string error",
    );
  });

  it("refuses more than one argument", async () => {
    expect.hasAssertions();

    await expect(runCommand(["one.md", "two.md"])).resolves.toBe(true);
    expect(reportLines[0]).toBe(
      "❌ Expected at most one argument, a path to the file holding the body",
    );
  });

  it("prefers the argument over the environment", async () => {
    expect.hasAssertions();

    process.env[PULL_REQUEST_BODY_VARIABLE] = "nothing at all";
    fileContents.set("body.md", validBody);

    await expect(runCommand(["body.md"])).resolves.toBe(false);
    expect(reportLines).toStrictEqual(["✅ All required sections present"]);
  });

  it("catches a prompt added to the template with no code change", async () => {
    expect.hasAssertions();

    fileContents.set(
      PULL_REQUEST_TEMPLATE_PATH,
      `${templateBody}\n## 🧭 Rollout\n\n<!-- How this reaches production, and what to watch -->\n`,
    );
    process.env[PULL_REQUEST_BODY_VARIABLE] =
      `${validBody}\n<!-- How this reaches production, and what to watch -->`;

    await expect(runCommand()).resolves.toBe(true);
    expect(reportLines).toContain(
      "- <!-- How this reaches production, and what to watch -->",
    );
  });
});
