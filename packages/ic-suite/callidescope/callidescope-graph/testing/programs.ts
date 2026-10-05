import { createMock } from "@golevelup/ts-vitest";
import ts from "typescript";

import { CallableIdentityService } from "../src/modules/callables/callable-identity.service";
import { CallablesService } from "../src/modules/callables/callables.service";
import { ClassesService } from "../src/modules/classes/classes.service";
import { ExternalService } from "../src/modules/classes/external.service";
import { CallSitesService } from "../src/modules/edges/call-sites.service";
import { EdgesService } from "../src/modules/edges/edges.service";
import { SymbolResolutionService } from "../src/modules/edges/symbol-resolution.service";
import { CompilerHostService } from "../src/modules/program/compiler-host.service";
import { ProgramService } from "../src/modules/program/program.service";
import { WorkspaceService } from "../src/modules/workspace/workspace.service";

import type { ProjectProgram } from "../src/modules/program/program.types";
import type { LoggerService } from "@codebase/logging";

/** Root every in-memory fixture file is written under. */
export const FIXTURE_ROOT = "/workspace";

/** The project an in-memory fixture belongs to. */
export const FIXTURE_PROJECT = {
  configurationPath: `${FIXTURE_ROOT}/packages/example/tsconfig.json`,
  hasPackageManifest: true,
  name: "example",
  root: "packages/example",
};

/** Every service the call-graph pipeline needs, wired together. */
export interface FixtureServices {
  readonly callables: CallablesService;
  readonly edges: EdgesService;
  readonly external: ExternalService;
  readonly hierarchy: ClassesService;
  readonly identity: CallableIdentityService;
  readonly programService: ProgramService;
  readonly workspace: WorkspaceService;
}

/**
 * Builds a real program over files that only exist in memory.
 *
 * `noLib` is what keeps these fast and focused: without it every fixture pulls
 * in the whole standard library, each test costs a second, and every graph is
 * full of frames from `lib.es5.d.ts` that the assertions then have to ignore.
 */
export function buildFixtureProgram(
  files: Record<string, string>,
): ProjectProgram {
  const sources = new Map<string, ts.SourceFile>();

  for (const [name, text] of Object.entries(files)) {
    sources.set(
      `${FIXTURE_ROOT}/${name}`,
      ts.createSourceFile(
        `${FIXTURE_ROOT}/${name}`,
        text,
        ts.ScriptTarget.ES2022,
        true,
        name.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      ),
    );
  }

  const host: ts.CompilerHost = {
    fileExists: (fileName) => sources.has(fileName),
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => FIXTURE_ROOT,
    getDefaultLibFileName: () => "lib.d.ts",
    getNewLine: () => "\n",
    getSourceFile: (fileName) => sources.get(fileName),
    readFile: (fileName) => sources.get(fileName)?.text,
    useCaseSensitiveFileNames: () => true,
    writeFile: () => undefined,
  };

  const rootNames = [...sources.keys()];
  const program = ts.createProgram({
    host,
    options: {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      noLib: true,
      target: ts.ScriptTarget.ES2022,
    },
    rootNames,
  });

  return {
    checker: program.getTypeChecker(),
    ownedFilePaths: new Set(rootNames),
    program,
    project: FIXTURE_PROJECT,
  };
}

/**
 * Wires the analysis services by hand.
 *
 * Constructed directly rather than through a testing module: none of these read
 * anything from Nest, and a container would only make the dependency order
 * harder to see.
 */
export function buildFixtureServices(args: {
  projectProgram: ProjectProgram;
}): FixtureServices {
  const workspace = new WorkspaceService(createMock<LoggerService>());
  const identity = new CallableIdentityService();
  // A real one, though nothing here ever asks it for a file: fixture programs
  // bring their own host, and a stub would only need casting into place.
  const programService = new ProgramService(
    new CompilerHostService(),
    createMock<LoggerService>(),
    workspace,
  );
  const external = new ExternalService();
  const hierarchy = new ClassesService(external);

  external.configure({
    ownedFilePaths: args.projectProgram.ownedFilePaths,
    workspaceRoot: FIXTURE_ROOT,
  });
  hierarchy.build({ programs: [args.projectProgram] });

  return {
    callables: new CallablesService(identity, programService, workspace),
    edges: new EdgesService(
      new CallSitesService(),
      external,
      programService,
      new SymbolResolutionService(hierarchy, external),
      workspace,
      createMock<LoggerService>(),
    ),
    external,
    hierarchy,
    identity,
    programService,
    workspace,
  };
}

/** Collects every callable in a fixture, keyed by identifier. */
export function collectFixtureCallables(args: {
  projectProgram: ProjectProgram;
  services: FixtureServices;
}): ReturnType<CallablesService["collect"]> {
  return args.services.callables.collect({
    fileFilter: { isExcluded: () => false },
    includeTests: true,
    includeTestsByProject: new Map(),
    ownerByFilePath: new Map(
      [...args.projectProgram.ownedFilePaths].map((filePath) => [
        filePath,
        args.projectProgram,
      ]),
    ),
    workspaceRoot: FIXTURE_ROOT,
  });
}

/**
 * Finds an abstract method declaration in a fixture.
 *
 * Real rather than fabricated: a method with no body is the one shape the
 * collector filters out, so the services that guard against it can only be
 * shown that guard working by being handed a genuine one.
 */
export function findAbstractMethod(
  projectProgram: ProjectProgram,
): ts.MethodDeclaration | undefined {
  for (const sourceFile of projectProgram.program.getSourceFiles()) {
    for (const statement of sourceFile.statements) {
      if (!ts.isClassDeclaration(statement)) {
        continue;
      }

      for (const member of statement.members) {
        if (ts.isMethodDeclaration(member) && member.body === undefined) {
          return member;
        }
      }
    }
  }

  return undefined;
}
