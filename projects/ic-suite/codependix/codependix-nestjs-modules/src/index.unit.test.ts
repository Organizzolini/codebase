import { describe, expect, it } from "vitest";

import {
  MODULE_GRAPH_AMBIENT_LEGEND,
  MODULE_GRAPH_AMBIENT_MINIMUM_MODULES,
  MODULE_GRAPH_MERMAID_HEADER,
  MODULE_GRAPH_UNCONNECTED,
  ModuleGraphModule,
  ModuleGraphService,
  NESTJS_PROJECT_IGNORED_MODULES,
  NESTJS_PROJECT_MODULE_FILE_SUFFIX,
  NESTJS_PROJECT_ROOT_MODULE_EXPORT,
  NESTJS_PROJECT_ROOT_MODULE_FILE,
  NESTJS_PROJECT_SYNTHETIC_IGNORED_MODULES,
  NESTJS_PROJECT_TAG,
  NestjsProjectModule,
  NestjsProjectService,
} from "./index.js";

describe("codependix-nestjs-modules index", () => {
  it("exports the module graph surface", () => {
    expect(ModuleGraphModule).toBeDefined();
    expect(ModuleGraphService).toBeDefined();
    expect(MODULE_GRAPH_UNCONNECTED).toBeDefined();
    expect(MODULE_GRAPH_MERMAID_HEADER).toBeDefined();
    expect(MODULE_GRAPH_AMBIENT_LEGEND).toBeDefined();
    expect(MODULE_GRAPH_AMBIENT_MINIMUM_MODULES).toBeDefined();
  });

  it("exports the nestjs project surface", () => {
    expect(NestjsProjectModule).toBeDefined();
    expect(NestjsProjectService).toBeDefined();
    expect(NESTJS_PROJECT_TAG).toBeDefined();
    expect(NESTJS_PROJECT_MODULE_FILE_SUFFIX).toBeDefined();
    expect(NESTJS_PROJECT_ROOT_MODULE_FILE).toBeDefined();
    expect(NESTJS_PROJECT_ROOT_MODULE_EXPORT).toBeDefined();
    expect(NESTJS_PROJECT_IGNORED_MODULES).toBeDefined();
    expect(NESTJS_PROJECT_SYNTHETIC_IGNORED_MODULES).toBeDefined();
  });
});
