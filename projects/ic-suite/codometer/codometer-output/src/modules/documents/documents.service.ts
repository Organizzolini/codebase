import { readFile, writeFile } from "node:fs/promises";

import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import type { DocumentMarkers, EmitArguments } from "./documents.types";

/**
 * Puts a rendered report body where it was asked for.
 *
 * Every report shares this: wrap the body in its markers, then write it to a
 * file, splice it into a document, or print it. Nothing here knows what any
 * report measures, and nothing here talks to a forge — handing the markdown to
 * a pull request, an issue, or a wiki is the caller's job.
 */
@Injectable()
export class DocumentsService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(DocumentsService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Reads a document, treating an absent one as empty. */
  private async readDocument(documentPath: string): Promise<string> {
    try {
      const existing = await readFile(documentPath, "utf8");
      return existing.trimEnd();
    } catch {
      return "";
    }
  }

  // 🌎 Public Methods

  /**
   * Wraps a rendered body in its markers, then writes it wherever the
   * destination says.
   *
   * With neither a file nor a document the section goes to standard output,
   * which is what makes any report inspectable before it is wired into
   * anything.
   */
  async emit(args: EmitArguments): Promise<void> {
    const { body, destination, label, markers } = args;
    const section = this.wrap(body, markers);

    if (destination.output !== undefined) {
      await writeFile(destination.output, `${section}\n`, "utf8");
      this.logger.info("📝 Wrote a report", undefined, {
        label,
        path: destination.output,
      });
    }

    if (destination.markdown !== undefined) {
      const document = await this.readDocument(destination.markdown);
      const spliced = this.splice(document, section, markers);
      await writeFile(destination.markdown, `${spliced}\n`, "utf8");
      this.logger.info("📝 Spliced a report", undefined, {
        label,
        path: destination.markdown,
      });
    }

    if (
      destination.output === undefined &&
      destination.markdown === undefined
    ) {
      process.stdout.write(`${section}\n`);
      this.logger.debug("🖨️ Printed the report to standard output", undefined, {
        label,
      });
    }
  }

  /**
   * Splices a section into a document, or appends it when the markers are
   * absent, and leaves the author's prose either side of it alone.
   */
  splice(document: string, section: string, markers: DocumentMarkers): string {
    const start = document.indexOf(markers.start);
    const before = (
      start === -1 ? document : document.slice(0, start)
    ).trimEnd();
    const end = document.indexOf(markers.end);
    const after =
      end === -1 ? "" : document.slice(end + markers.end.length).trimStart();

    return [before, section, after]
      .filter((part) => part.length > 0)
      .join("\n\n");
  }

  /** Wraps a rendered body in its markers. */
  wrap(body: string, markers: DocumentMarkers): string {
    return [markers.start, body, markers.end].join("\n");
  }
}
