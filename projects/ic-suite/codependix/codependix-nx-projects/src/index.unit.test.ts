import { describe, expect, it } from "vitest";

import {
  NEIGHBORHOOD_IMPLICIT_LEGEND,
  NEIGHBORHOOD_MERMAID_HEADER,
  NEIGHBORHOOD_SUBJECT_STYLE,
  NEIGHBORHOOD_UNCONNECTED,
  NeighborhoodModule,
  NeighborhoodService,
  WORKSPACE_GRAPH_MERMAID_HEADER,
  WORKSPACE_GRAPH_UNCONNECTED,
  WorkspaceGraphModule,
  WorkspaceGraphService,
} from "./index.js";

describe("codependix-nx-projects index", () => {
  it("exports the neighborhood surface", () => {
    expect(NeighborhoodModule).toBeDefined();
    expect(NeighborhoodService).toBeDefined();
    expect(NEIGHBORHOOD_UNCONNECTED).toBeDefined();
    expect(NEIGHBORHOOD_MERMAID_HEADER).toBeDefined();
    expect(NEIGHBORHOOD_SUBJECT_STYLE).toBeDefined();
    expect(NEIGHBORHOOD_IMPLICIT_LEGEND).toBeDefined();
  });

  it("exports the workspace graph surface", () => {
    expect(WorkspaceGraphModule).toBeDefined();
    expect(WorkspaceGraphService).toBeDefined();
    expect(WORKSPACE_GRAPH_UNCONNECTED).toBeDefined();
    expect(WORKSPACE_GRAPH_MERMAID_HEADER).toBeDefined();
  });
});
