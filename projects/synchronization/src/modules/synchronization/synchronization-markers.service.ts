import { Injectable } from "@nestjs/common";

/**
 * Reads and rewrites the content a marker comment pair encloses in a markdown
 * file.
 *
 * The markers are what make a generated block editable by a command and not by
 * hand: everything outside them is prose someone wrote, and everything inside
 * is regenerated wholesale.
 */
@Injectable()
export class SynchronizationMarkersService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Returns the index range the markers enclose, or undefined when absent. */
  private locateMarkers(
    content: string,
    markerName: string,
  ): undefined | { endIndex: number; startIndex: number } {
    const startMarker = this.getStartMarker(markerName);
    const endMarker = this.getEndMarker(markerName);

    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
      return undefined;
    }

    return { endIndex, startIndex: startIndex + startMarker.length };
  }

  // 🌎 Public Methods

  /** Returns the content between the markers, or undefined when absent. */
  extractContent(content: string, markerName: string): string | undefined {
    const range = this.locateMarkers(content, markerName);
    if (range === undefined) return undefined;

    return content.slice(range.startIndex, range.endIndex);
  }

  /** Renders the closing marker comment for a marker name. */
  getEndMarker(markerName: string): string {
    return `<!-- ${markerName}-end -->`;
  }

  /** Renders the opening marker comment for a marker name. */
  getStartMarker(markerName: string): string {
    return `<!-- ${markerName}-start -->`;
  }

  /**
   * Replaces the content between the markers, surrounding it with the blank
   * lines markdown needs for the block to be parsed as its own element.
   */
  replaceContent(
    content: string,
    markerName: string,
    replacement: string,
  ): string {
    const range = this.locateMarkers(content, markerName);
    if (range === undefined) return content;

    return `${content.slice(0, range.startIndex)}\n\n${replacement}\n\n${content.slice(range.endIndex)}`;
  }
}
