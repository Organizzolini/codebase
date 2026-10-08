import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { AnchorNotFoundError } from "../anchors/anchors.constants";
import { AnchorsService } from "../anchors/anchors.service";

import { JSON_INDENTATION } from "./delivery.constants";

import type {
  DeliverFileArguments,
  DeliverGraphOutputArguments,
} from "./delivery.types";
import type {
  MarkdownSectionArguments,
  ProjectRunResult,
  StaleExport,
  StaleExportDifference,
} from "@codependix/core";

/**
 * Delivers a resolved graph export to whichever destinations it names.
 *
 * Every codependix graph type — the Nx Neighborhood, the Nx Workspace Graph,
 * and the NestJS module graph — resolves to the same
 * `ResolvedCodependixGraphOutput` shape and is delivered the same way: a JSON
 * file, an anchored or standalone Markdown file, or both. This service is
 * the one place that shape is turned into file I/O, so `GraphRunService`
 * only has to render each graph type's own JSON and diagram content and hand
 * it over.
 */
@Injectable()
export class DeliveryService {
  // 🏗 Dependency Injection

  constructor(private readonly anchorsService: AnchorsService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Checks whether a named anchor block is current against fresh content.
   *
   * A missing anchor is reported as stale rather than throwing, consistent
   * with every other kind of drift this tool reports.
   */
  private checkAnchoredMarkdown(args: {
    absoluteRoot: string;
    anchorName: string;
    content: string;
    path: string;
    staleExports: StaleExport[];
    stalePaths: string[];
  }): void {
    const resolvedPath = path.resolve(args.absoluteRoot, args.path);

    if (!existsSync(resolvedPath)) {
      throw new AnchorNotFoundError(args.anchorName, resolvedPath);
    }

    const fileContent = readFileSync(resolvedPath, "utf8");
    const anchorExists = this.anchorsService.hasAnchor({
      anchorName: args.anchorName,
      fileContent,
      filePath: resolvedPath,
    });

    if (!anchorExists) {
      args.stalePaths.push(args.path);
      args.staleExports.push({
        anchor: args.anchorName,
        difference: "graph",
        path: args.path,
      });
      return;
    }

    const checkResult = this.anchorsService.checkAnchor({
      anchorName: args.anchorName,
      fileContent,
      filePath: resolvedPath,
      freshContent: args.content,
    });

    if (!checkResult.isCurrent) {
      args.stalePaths.push(args.path);
      args.staleExports.push({
        anchor: args.anchorName,
        difference: this.classifyDifference(
          checkResult.currentContent,
          args.content,
          "markdown",
        ),
        path: args.path,
      });
    }
  }

  /** Classifies whether a difference is formatting or graph structure. */
  private classifyDifference(
    current: string,
    fresh: string,
    kind: "json" | "markdown",
  ): StaleExportDifference {
    if (kind === "json") {
      try {
        const currentParsed: unknown = JSON.parse(current);
        const freshParsed: unknown = JSON.parse(fresh);

        if (JSON.stringify(currentParsed) === JSON.stringify(freshParsed)) {
          return "formatting";
        }
      } catch {
        return "graph";
      }

      return "graph";
    }

    const normalizedCurrent = current.replaceAll(/\s+/gu, " ").trim();
    const normalizedFresh = fresh.replaceAll(/\s+/gu, " ").trim();

    if (normalizedCurrent === normalizedFresh && normalizedCurrent.length > 0) {
      return "formatting";
    }

    return "graph";
  }

  /** Delivers a JSON destination, recording it as stale if needed. */
  private deliverJson(args: {
    absoluteRoot: string;
    content: string;
    mode: DeliverFileArguments["mode"];
    path: string;
    staleExports: StaleExport[];
    stalePaths: string[];
  }): void {
    const resolvedPath = path.resolve(args.absoluteRoot, args.path);

    if (args.mode === "check") {
      const existingContent = this.readFileOrEmpty(resolvedPath);

      if (existingContent !== args.content) {
        args.stalePaths.push(args.path);
        args.staleExports.push({
          anchor: undefined,
          difference: this.classifyDifference(
            existingContent,
            args.content,
            "json",
          ),
          path: args.path,
        });
      }
      return;
    }

    mkdirSync(path.dirname(resolvedPath), { recursive: true });
    writeFileSync(resolvedPath, args.content, "utf8");
  }

  /** Delivers a Markdown destination, recording it as stale if needed. */
  private deliverMarkdown(args: {
    absoluteRoot: string;
    anchor: string | undefined;
    content: string;
    markdownSection: MarkdownSectionArguments | undefined;
    mode: DeliverFileArguments["mode"];
    path: string;
    staleExports: StaleExport[];
    stalePaths: string[];
  }): void {
    if (args.anchor === undefined) {
      const resolvedPath = path.resolve(args.absoluteRoot, args.path);
      const expectedContent = `${args.content}\n`;

      if (args.mode === "check") {
        const existingContent = this.readFileOrEmpty(resolvedPath);

        if (existingContent !== expectedContent) {
          args.stalePaths.push(args.path);
          args.staleExports.push({
            anchor: undefined,
            difference: this.classifyDifference(
              existingContent,
              expectedContent,
              "markdown",
            ),
            path: args.path,
          });
        }
        return;
      }

      mkdirSync(path.dirname(resolvedPath), { recursive: true });
      writeFileSync(resolvedPath, expectedContent, "utf8");
      return;
    }

    if (args.mode === "check") {
      this.checkAnchoredMarkdown({
        absoluteRoot: args.absoluteRoot,
        anchorName: args.anchor,
        content: args.content,
        path: args.path,
        staleExports: args.staleExports,
        stalePaths: args.stalePaths,
      });
      return;
    }

    this.writeAnchoredMarkdown({
      absoluteRoot: args.absoluteRoot,
      anchorName: args.anchor,
      content: args.content,
      markdownSection: args.markdownSection,
      path: args.path,
    });
  }

  /** Reads a file's content, or an empty string when it does not exist yet. */
  private readFileOrEmpty(filePath: string): string {
    try {
      return readFileSync(filePath, "utf8");
    } catch {
      return "";
    }
  }

  /**
   * Resolves the JSON destination a graph output should deliver to, or
   * `undefined` when the target does not touch JSON, no destination was
   * configured, or the caller rendered no JSON content for it.
   */
  private resolveJsonDelivery(
    args: DeliverGraphOutputArguments,
  ): undefined | { content: string; path: string } {
    const { jsonContent, resolvedOutput } = args;
    const touchesJson =
      resolvedOutput.target === "both" || resolvedOutput.target === "json";

    if (!touchesJson || resolvedOutput.json === undefined) return undefined;
    if (jsonContent === undefined) return undefined;

    return { content: jsonContent, path: resolvedOutput.json.path };
  }

  /**
   * Resolves the Markdown destination a graph output should deliver to, or
   * `undefined` when the target does not touch Markdown, no destination was
   * configured, or the caller rendered no diagram content for it.
   */
  private resolveMarkdownDelivery(args: DeliverGraphOutputArguments):
    | undefined
    | {
        anchor: string | undefined;
        content: string;
        path: string;
      } {
    const { markdownContent, resolvedOutput } = args;
    const touchesMarkdown =
      resolvedOutput.target === "both" || resolvedOutput.target === "markdown";

    if (!touchesMarkdown || resolvedOutput.markdown === undefined) {
      return undefined;
    }
    if (markdownContent === undefined) return undefined;

    return {
      anchor: resolvedOutput.markdown.anchor,
      content: markdownContent,
      path: resolvedOutput.markdown.path,
    };
  }

  /** Splices content into a named anchor block on write. */
  private writeAnchoredMarkdown(args: {
    absoluteRoot: string;
    anchorName: string;
    content: string;
    markdownSection: MarkdownSectionArguments | undefined;
    path: string;
  }): void {
    const resolvedPath = path.resolve(args.absoluteRoot, args.path);

    if (!existsSync(resolvedPath)) {
      throw new AnchorNotFoundError(args.anchorName, resolvedPath);
    }

    const fileContent = readFileSync(resolvedPath, "utf8");
    const anchorExists = this.anchorsService.hasAnchor({
      anchorName: args.anchorName,
      fileContent,
      filePath: resolvedPath,
    });

    if (!anchorExists) {
      this.writeAutoCreatedAnchorSection({
        anchorName: args.anchorName,
        content: args.content,
        fileContent,
        markdownSection: args.markdownSection,
        resolvedPath,
      });
      return;
    }

    const updated = this.anchorsService.replaceAnchorContent({
      anchorName: args.anchorName,
      fileContent,
      filePath: resolvedPath,
      newContent: args.content,
    });

    if (updated !== fileContent) {
      writeFileSync(resolvedPath, updated, "utf8");
    }
  }

  /**
   * Auto-creates a missing anchor's `## 🕸️ Codependix` section and writes it.
   *
   * Falls back to the historical hard failure when the caller supplied no
   * `markdownSection` — there is nothing safe to build without a heading and
   * intro line, and `GraphRunService` always supplies one for every real
   * anchored destination it delivers.
   */
  private writeAutoCreatedAnchorSection(args: {
    anchorName: string;
    content: string;
    fileContent: string;
    markdownSection: MarkdownSectionArguments | undefined;
    resolvedPath: string;
  }): boolean {
    if (args.markdownSection === undefined) {
      throw new AnchorNotFoundError(args.anchorName, args.resolvedPath);
    }

    const updated = this.anchorsService.insertAnchorSection({
      anchorName: args.anchorName,
      content: args.content,
      fileContent: args.fileContent,
      introLine: args.markdownSection.introLine,
      subheading: args.markdownSection.subheading,
    });

    writeFileSync(args.resolvedPath, updated, "utf8");

    return true;
  }

  // 🌎 Public Methods

  /**
   * Delivers whichever destinations a resolved graph output names.
   *
   * `jsonContent`/`markdownContent` are read only when the resolved target
   * actually touches that destination, mirroring how a project whose target
   * is `"json"` never renders a diagram nobody configured.
   */
  deliverGraphOutput(args: DeliverGraphOutputArguments): ProjectRunResult {
    const { markdownSection, mode, project } = args;
    const staleExports: StaleExport[] = [];
    const stalePaths: string[] = [];
    const jsonDelivery = this.resolveJsonDelivery(args);
    const markdownDelivery = this.resolveMarkdownDelivery(args);

    if (jsonDelivery !== undefined) {
      this.deliverJson({
        absoluteRoot: project.absoluteRoot,
        content: jsonDelivery.content,
        mode,
        path: jsonDelivery.path,
        staleExports,
        stalePaths,
      });
    }

    if (markdownDelivery !== undefined) {
      this.deliverMarkdown({
        absoluteRoot: project.absoluteRoot,
        anchor: markdownDelivery.anchor,
        content: markdownDelivery.content,
        markdownSection,
        mode,
        path: markdownDelivery.path,
        staleExports,
        stalePaths,
      });
    }

    return {
      isCurrent: stalePaths.length === 0,
      projectName: project.name,
      staleExports,
      stalePaths,
    };
  }

  /** Renders an export as JSON the same way every run of codependix would. */
  renderJson(exportedGraph: unknown): string {
    return `${JSON.stringify(exportedGraph, null, JSON_INDENTATION)}\n`;
  }
}
