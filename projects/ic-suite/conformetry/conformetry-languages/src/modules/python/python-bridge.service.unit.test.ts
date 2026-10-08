import { spawnSync } from "node:child_process";

import { Test } from "@nestjs/testing";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DifferencesModule } from "../differences/differences.module";
import { ScoringModule } from "../scoring/scoring.module";

import { PythonBridgeService } from "./python-bridge.service";

import type { ConformetryDifference } from "@conformetry/core";
import type childProcess from "node:child_process";

// Calls through by default so most tests exercise the real bridge; the
// failure paths, which need no `python3`, stage a return value instead.
vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof childProcess>();

  return { ...actual, spawnSync: vi.fn(actual.spawnSync) };
});

const spawnSyncMock = vi.mocked(spawnSync);

describe(PythonBridgeService, () => {
  let service: PythonBridgeService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [DifferencesModule, ScoringModule],
      providers: [PythonBridgeService],
    }).compile();

    service = await module.resolve(PythonBridgeService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("validatePythonSource", () => {
    it("reports nothing when the instance satisfies the template", () => {
      expect(
        service.validatePythonSource({
          filename: "alpha.py",
          instance: "import os\n\n\ndef alpha():\n    return os\n",
          template: "import os\n",
        }).differences,
      ).toStrictEqual([]);
    });

    it("reports an import the instance lacks", () => {
      const { differences } = service.validatePythonSource({
        filename: "alpha.py",
        instance: "def alpha():\n    return 1\n",
        template: "import os\n",
      });

      expect(differences.length).toBeGreaterThan(0);
      expect(differences[0]?.language).toBe("python");
    });

    it("ignores statements the template does not declare", () => {
      expect(
        service.validatePythonSource({
          filename: "alpha.py",
          instance: "import os\nimport sys\n",
          template: "import os\n",
        }).differences,
      ).toStrictEqual([]);
    });
  });

  describe("bridge failures", () => {
    afterEach(() => {
      spawnSyncMock.mockReset();
    });

    /** Compares a file against itself, so only the staged failure shows up. */
    function runBridge(): ConformetryDifference[] {
      return service.validatePythonSource({
        filename: "alpha.py",
        instance: "import os\n",
        template: "import os\n",
      }).differences;
    }

    function weighBridge(): number {
      return service.validatePythonSource({
        filename: "alpha.py",
        instance: "import os\n",
        template: "import os\n",
      }).totalWeight;
    }

    it("reports a python3 that could not be started", () => {
      spawnSyncMock.mockReturnValue({
        error: new Error("spawn python3 ENOENT"),
        output: [],
        pid: 0,
        signal: null,
        status: null,
        stderr: "",
        stdout: "",
      });

      expect(runBridge()[0]?.message).toContain("spawn python3 ENOENT");
    });

    it("reports a non-zero exit with whatever the bridge printed", () => {
      spawnSyncMock.mockReturnValue({
        output: [],
        pid: 0,
        signal: null,
        status: 1,
        stderr: "Traceback: boom",
        stdout: "",
      });

      expect(runBridge()[0]?.message).toContain("Traceback: boom");
    });

    it("falls back to stdout when the bridge printed nothing to stderr", () => {
      spawnSyncMock.mockReturnValue({
        output: [],
        pid: 0,
        signal: null,
        status: 2,
        stderr: "",
        stdout: "bridge said no",
      });

      expect(runBridge()[0]?.message).toContain("bridge said no");
    });

    it("fills in defaults for an error the bridge only partly described", () => {
      spawnSyncMock.mockReturnValue({
        output: [],
        pid: 0,
        signal: null,
        status: 0,
        stderr: "",
        stdout: JSON.stringify({ differences: [{}] }),
      });

      const [error] = runBridge();

      expect(error?.fix).toBe("Fix the conformance issue.");
      expect(error?.language).toBe("python");
      expect(error?.message).toBe("Python conformance issue found.");
      expect(error?.actual).toBeUndefined();
      expect(error?.expected).toBeUndefined();
    });

    it("carries through every field the bridge did describe", () => {
      spawnSyncMock.mockReturnValue({
        output: [],
        pid: 0,
        signal: null,
        status: 0,
        stderr: "",
        stdout: JSON.stringify({
          differences: [
            {
              actual: "def beta()",
              difference_type: "code",
              expected: "def alpha()",
              fix: "Rename it.",
              language: "python",
              message: "Missing function",
            },
          ],
        }),
      });

      const [error] = runBridge();

      expect(error?.actual).toBe("def beta()");
      expect(error?.expected).toBe("def alpha()");
      expect(error?.fix).toBe("Rename it.");
    });

    it("carries the weight the bridge reported for a finding", () => {
      spawnSyncMock.mockReturnValue({
        output: [],
        pid: 0,
        signal: null,
        status: 0,
        stderr: "",
        stdout: JSON.stringify({
          differences: [{ message: "Missing ClassDef", weight: 24 }],
          total_weight: 30,
        }),
      });

      const [error] = runBridge();

      expect(error?.weight).toBe(24);
      expect(weighBridge()).toBe(30);
    });

    it("defaults a finding the bridge gave no weight to one", () => {
      spawnSyncMock.mockReturnValue({
        output: [],
        pid: 0,
        signal: null,
        status: 0,
        stderr: "",
        stdout: JSON.stringify({ differences: [{}], total_weight: 5 }),
      });

      expect(runBridge()[0]?.weight).toBe(1);
    });

    it("falls back to the findings' own weight when the bridge omits a total", () => {
      spawnSyncMock.mockReturnValue({
        output: [],
        pid: 0,
        signal: null,
        status: 0,
        stderr: "",
        stdout: JSON.stringify({ differences: [{ weight: 4 }, { weight: 3 }] }),
      });

      // A bridge reporting findings but no denominator would otherwise score a
      // perfect 1 on a file it just said was broken.
      expect(weighBridge()).toBe(7);
    });

    it("reports output it cannot parse", () => {
      spawnSyncMock.mockReturnValue({
        output: [],
        pid: 0,
        signal: null,
        status: 0,
        stderr: "",
        stdout: "not json",
      });

      expect(runBridge()[0]?.message).toContain("could not be parsed");
    });
  });
});
