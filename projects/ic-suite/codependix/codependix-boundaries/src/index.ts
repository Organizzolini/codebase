// 📤 Exports
export {
  CYCLE_SEPARATOR,
  describeCycle,
  describeDisallowedEdge,
  describeForbiddenEdge,
} from "./modules/boundaries/boundaries.constants";
export { BoundariesModule } from "./modules/boundaries/boundaries.module";
export { BoundariesService } from "./modules/boundaries/boundaries.service";
export type {
  BoundaryCycle,
  BoundaryEdge,
  BoundaryGraph,
  BoundaryNode,
  BoundaryViolation,
  EvaluateBoundariesArguments,
  FindCyclesArguments,
} from "./modules/boundaries/boundaries.types";
export { BoundaryCyclesService } from "./modules/boundaries/boundary-cycles.service";
export { BoundaryReportService } from "./modules/boundaries/boundary-report.service";
export { BoundarySelectorService } from "./modules/boundaries/boundary-selector.service";
export {
  BOUNDARY_LEVEL_ORDER,
  WORKSPACE_SCOPE,
} from "./modules/boundary-check/boundary-check.constants";
export { BoundaryCheckModule } from "./modules/boundary-check/boundary-check.module";
export { BoundaryCheckService } from "./modules/boundary-check/boundary-check.service";
export type {
  BoundaryCheckContext,
  BoundaryCheckFailure,
  BoundaryCheckOutcome,
  LevelCheckArguments,
} from "./modules/boundary-check/boundary-check.types";
export { BoundaryGraphService } from "./modules/boundary-check/boundary-graph.service";
export { RunContextModule } from "./modules/run-context/run-context.module";
export { RunContextService } from "./modules/run-context/run-context.service";
export type { GraphRunContext } from "./modules/run-context/run-context.types";
