// 🏷️ Types

/** Arguments for walking one level of two markdown trees. */
export interface CompareChildrenArguments {
  readonly instanceChildren: MarkdownNode[];
  readonly templateChildren: MarkdownNode[];
}

/** The outcome of walking one level of two trees. */
export interface CompareChildrenResult {
  /** What each placeholder value stood for — see `DocumentValidationResult`. */
  readonly captures?: Readonly<Record<string, string>>;
  readonly differences: MarkdownComparisonError[];
  /** Template nodes the level weighed the instance against. */
  readonly totalWeight: number;
}

/** Arguments for matching one template node against the instance's children. */
export interface CompareNodeArguments {
  readonly instanceChildren: MarkdownNode[];
  /**
   * The most recent instance node matched at this level, used to locate an
   * error when the template node itself has no instance counterpart.
   */
  readonly lastMatchedNode: MarkdownNode | undefined;
  readonly templateChild: MarkdownNode;
}

/** The outcome of matching one template node. */
export interface CompareNodeResult {
  /** What each placeholder value stood for — see `DocumentValidationResult`. */
  readonly captures?: Readonly<Record<string, string>>;
  readonly differences: MarkdownComparisonError[];
  readonly lastMatchedNode: MarkdownNode | undefined;
  /** Template nodes this match or miss accounted for. */
  readonly totalWeight: number;
}

/** A required markdown node the instance does not contain. */
export interface MarkdownComparisonError {
  /** 1-based line in the instance where the node was expected. */
  readonly instanceLine: number | undefined;
  readonly nodeType: string;
  readonly text: string;
  /** Template nodes this one finding stands in for — the missing subtree. */
  readonly weight: number;
}

/**
 * The subset of an mdast node this validator reads.
 *
 * Declared structurally rather than importing mdast's own types because only
 * these fields participate in matching, and a narrow shape keeps the
 * comparison honest about what it actually inspects.
 */
export interface MarkdownNode {
  readonly alt?: string;
  readonly children?: MarkdownNode[];
  readonly depth?: number;
  readonly lang?: string;
  readonly ordered?: boolean;
  readonly position?: {
    readonly end?: { readonly line?: number };
  };
  readonly type: string;
  readonly url?: string;
  readonly value?: string;
}
