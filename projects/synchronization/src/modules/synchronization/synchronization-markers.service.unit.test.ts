import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { SynchronizationMarkersService } from "./synchronization-markers.service";

describe(SynchronizationMarkersService, () => {
  let service: SynchronizationMarkersService;

  const marker = "nestjs-module-graph";
  const content = [
    "# Title",
    "",
    "<!-- nestjs-module-graph-start -->",
    "",
    "old diagram",
    "",
    "<!-- nestjs-module-graph-end -->",
    "",
    "## After",
    "",
  ].join("\n");

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [SynchronizationMarkersService],
    }).compile();

    service = await module.resolve(SynchronizationMarkersService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("renders the marker comments", () => {
    expect(service.getStartMarker(marker)).toBe(
      "<!-- nestjs-module-graph-start -->",
    );
    expect(service.getEndMarker(marker)).toBe(
      "<!-- nestjs-module-graph-end -->",
    );
  });

  it("extracts the content between the markers", () => {
    expect(service.extractContent(content, marker)?.trim()).toBe("old diagram");
  });

  it("returns undefined when a marker is missing", () => {
    expect(service.extractContent("# Title\n", marker)).toBeUndefined();
    expect(
      service.extractContent("<!-- nestjs-module-graph-start -->\n", marker),
    ).toBeUndefined();
    expect(
      service.extractContent("<!-- nestjs-module-graph-end -->\n", marker),
    ).toBeUndefined();
  });

  // An end marker before the start marker would otherwise slice backwards and
  // silently produce an empty block.
  it("returns undefined when the markers are inverted", () => {
    const inverted = [
      "<!-- nestjs-module-graph-end -->",
      "<!-- nestjs-module-graph-start -->",
    ].join("\n");

    expect(service.extractContent(inverted, marker)).toBeUndefined();
  });

  it("replaces the content between the markers and keeps the surroundings", () => {
    const replaced = service.replaceContent(content, marker, "new diagram");

    expect(replaced).toContain("# Title");
    expect(replaced).toContain("## After");
    expect(replaced).not.toContain("old diagram");
    expect(service.extractContent(replaced, marker)?.trim()).toBe(
      "new diagram",
    );
  });

  it("surrounds the replacement with blank lines", () => {
    const replaced = service.replaceContent(content, marker, "new diagram");

    expect(replaced).toContain(
      "<!-- nestjs-module-graph-start -->\n\nnew diagram\n\n<!-- nestjs-module-graph-end -->",
    );
  });

  it("leaves content without markers untouched", () => {
    expect(service.replaceContent("# Title\n", marker, "new")).toBe(
      "# Title\n",
    );
  });
});
