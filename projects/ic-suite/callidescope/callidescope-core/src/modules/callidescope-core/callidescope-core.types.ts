// 🏷️ Types

/**
 * One callable and every distinct callable it calls directly, unfiltered by
 * any limit.
 *
 * Held on a `ProjectReport` the same way `stacks` holds every `CallStack`
 * regardless of `maximumDepth`: computing breadth does not require a
 * configured limit, only reporting a violation does.
 */
export interface CallableBreadthReport {
  readonly breadth: number;
  readonly callees: readonly WideCallableCallee[];
  readonly displayName: string;
  readonly id: CallableId;
  readonly location: SourceLocation;
  /** Absent when the checker could not resolve a signature. */
  readonly signature: CallableSignature | undefined;
}

/** What the documentation comment above a callable says. */
export interface CallableDocumentation {
  readonly isDeprecated: boolean;
  /**
   * The comment's prose in full, newlines collapsed. Empty when it is all tags.
   *
   * Never shortened. How much of it fits belongs to whatever renders it, and
   * a consumer reading this has no line to fit inside.
   */
  readonly summary: string;
  /** Tag names present, without the leading `@`, in source order. */
  readonly tags: readonly string[];
}

/**
 * Stable identifier for one callable: workspace-relative path plus the byte
 * offset its declaration starts at.
 *
 * The offset rather than a line number, because two callables can share a line
 * — an arrow property and its enclosing statement do — while exactly one
 * declaration can start at one offset.
 */
export type CallableId = string;

/** The declaration shape a callable was found as. */
export type CallableKind =
  | "accessor"
  | "arrow-property"
  | "callback"
  | "constructor"
  | "function"
  | "method"
  | "module"
  | "object-literal-method";

/** One function-like declaration in the workspace. */
export interface CallableNode {
  readonly displayName: string;
  readonly enclosingTypeName: string | undefined;
  readonly id: CallableId;
  readonly isExported: boolean;
  readonly kind: CallableKind;
  readonly location: SourceLocation;
  readonly memberName: string;
  readonly projectName: string;
  readonly statementCount: number;
}

/** One parameter of a callable, as the type checker renders it. */
export interface CallableParameter {
  /** True for a parameter with a `?` or a default value. */
  readonly isOptional: boolean;
  readonly isRest: boolean;
  readonly name: string;
  readonly type: string;
}

/** What a callable takes and gives back. */
export interface CallableSignature {
  readonly parameters: readonly CallableParameter[];
  readonly returnType: string;
  /**
   * The whole signature on one line, as TypeScript writes it.
   *
   * Kept alongside the parts because TypeScript renders some shapes better
   * than reassembling them does — a destructured parameter reads as
   * `{ alpha, beta }` here and as the synthetic `__0` in `parameters`.
   */
  readonly text: string;
}

/** One caller-to-callee edge, produced by one call site. */
export interface CallEdge {
  readonly calleeId: CallableId;
  readonly callerId: CallableId;
  readonly callSite: SourceLocation;
  /** Above one means a virtual dispatch: the call site had several targets. */
  readonly candidateCount: number;
  readonly resolution: EdgeResolution;
}

/** Everything one callidescope run produced. */
export interface CallGraphResult {
  readonly deepStacks: readonly DeepStackFinding[];
  /** One report per project traced, in the order projects were discovered. */
  readonly projects: readonly ProjectReport[];
  readonly summary: CallGraphSummary;
  readonly wideCallables: readonly WideCallableFinding[];
}

/** Counts describing the graph a run built. */
export interface CallGraphSummary {
  readonly callableCount: number;
  readonly cyclicComponentCount: number;
  readonly edgeCount: number;
  readonly entryPointCount: number;
  readonly fileCount: number;
  readonly maximumDepth: number;
  readonly projectCount: number;
  readonly unresolvedCallCount: number;
}

/** One entry point and the deepest stack below it. */
export interface CallStack {
  readonly depth: number;
  readonly entryPointKind: EntryPointKind;
  readonly frames: readonly StackFrame[];
  /**
   * True when a frame on this path holds an unresolved call, making `depth` a
   * floor rather than a measurement.
   */
  readonly isLowerBound: boolean;
}

/** A call stack deeper than the configured limit. */
export interface DeepStackFinding extends CallStack {
  readonly limit: number;
}

/** How a call site was resolved to its target. */
export type EdgeResolution =
  | "alias"
  | "callback"
  | "direct"
  | "implementation"
  | "super";

/** A callable a framework, a runtime, or nothing at all calls. */
export interface EntryPoint {
  readonly callableId: CallableId;
  readonly kind: EntryPointKind;
}

/**
 * What promoted a callable to the root of a call stack.
 *
 * `declared` is the only one a person chose: a configuration named that
 * callable's address outright, saying "this is the surface this package has".
 * Every other kind is inferred — from a decorator, a file name, an export, or
 * from nothing at all having called it.
 */
export type EntryPointKind =
  | "declared"
  | "decorated-method"
  | "exported-function"
  | "lifecycle"
  | "module-bootstrap"
  | "orphan-root";

/**
 * Everything one project contributed to a run.
 *
 * Scoped by the project the entry point sits in, so a section embedded in a
 * project's own README describes that project rather than the workspace.
 */
export interface ProjectReport {
  /** Every callable with at least one direct callee. */
  readonly callableBreadths: readonly CallableBreadthReport[];
  readonly projectName: string;
  /** Every stack that makes at least one call, deepest first. */
  readonly stacks: readonly CallStack[];
  readonly summary: CallGraphSummary;
}

/** Where a declaration or a call site sits. */
export interface SourceLocation {
  readonly column: number;
  /** Workspace-relative, POSIX separators, so reports are machine-independent. */
  readonly filePath: string;
  readonly line: number;
}

/** One frame of a reported call stack. */
export interface StackFrame {
  readonly displayName: string;
  /** Absent when the callable carries no documentation comment. */
  readonly documentation: CallableDocumentation | undefined;
  readonly id: CallableId;
  /** True when this frame belongs to a recursive cycle. */
  readonly isCycle: boolean;
  readonly location: SourceLocation;
  /** Absent when the checker could not resolve a signature. */
  readonly signature: CallableSignature | undefined;
}

/**
 * A call site that produced no edge.
 *
 * Every depth measured through a callable holding one of these is a lower
 * bound, which is why the reason is kept rather than discarded.
 */
export interface UnresolvedCall {
  readonly calleeText: string;
  readonly callerId: CallableId;
  readonly callSite: SourceLocation;
  readonly reason: UnresolvedReason;
}

/** Why a call site produced no edge. */
export type UnresolvedReason =
  | "computed-member"
  | "dynamic-value"
  | "generic-parameter"
  | "no-implementation"
  | "no-symbol"
  | "too-many-implementations";

/** One callable reached directly by another, named in its breadth report. */
export interface WideCallableCallee {
  readonly displayName: string;
  readonly id: CallableId;
}

/** A callable calling more callables directly than the configured limit. */
export interface WideCallableFinding extends CallableBreadthReport {
  readonly limit: number;
}
