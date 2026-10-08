import * as React from "react";

import { cn } from "@codebase/components-web";

import { Identifier } from "./identifier";

/**
 * Position in the forms grid for border styling.
 */
export type FormCellPosition =
  | "bottomLeft"
  | "bottomRight"
  | "midLeft"
  | "midRight"
  | "topLeft"
  | "topRight";

/**
 * Properties for the FormCell component that displays a single form with labels.
 */
export interface FormCellProperties {
  /** Bottom-left label (e.g., for extra context) */
  bottomLeftText?: string | undefined;
  /** Bottom-right label (e.g., for extra context) */
  bottomRightText?: string | undefined;
  /** The main form text (e.g., "amō") */
  centerText: string;
  /** Additional class names */
  className?: string | undefined;
  /** Position in the grid for border styling */
  position?: FormCellPosition | undefined;
  /** Search term for highlighting */
  search?: string | undefined;
  /** Top-left label (e.g., "first", "nominative") */
  topLeftText?: string | undefined;
  /** Top-right label (e.g., "singular", "plural") */
  topRightText?: string | undefined;
}

/**
 * Compute border classes for a form cell based on its grid position.
 */
function computeBorderClasses(position: FormCellPosition | undefined): string {
  return cn(
    "border-border/30",
    position?.includes("top") && "border-t",
    position?.includes("bottom") && "border-b",
    position?.includes("Left") && "border-l",
    position?.includes("Right") && "border-r",
    "border-r border-b",
  );
}

/**
 * Render a single grid cell with optional corner identifiers.
 */
function FormCell(properties: FormCellProperties): React.ReactElement {
  const {
    bottomLeftText,
    bottomRightText,
    centerText,
    className,
    position,
    search,
    topLeftText,
    topRightText,
  } = properties;
  const isSearched =
    search && centerText.toLowerCase().includes(search.toLowerCase());
  const showTooltip = centerText.length > 30 || centerText.includes("\n");
  const borderClasses = computeBorderClasses(position);

  return (
    <div
      className={cn(
        "relative flex h-12 items-stretch",
        borderClasses,
        isSearched ? "bg-muted" : "bg-card",
        className,
      )}
      title={showTooltip ? centerText : undefined}
    >
      {/* Left sidebar */}
      <div className="flex w-8 shrink-0 flex-col items-center justify-between py-0.5">
        {topLeftText && (
          <Identifier
            className="text-sm"
            identifier={topLeftText}
          />
        )}
        {bottomLeftText && (
          <Identifier
            className="text-sm"
            identifier={bottomLeftText}
          />
        )}
      </div>

      {/* Center text */}
      <div className="flex flex-1 items-center justify-center overflow-hidden px-1">
        <span
          className={cn(
            "truncate text-center text-sm",
            centerText === "-" ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {centerText}
        </span>
      </div>

      {/* Right sidebar */}
      <div className="flex w-8 shrink-0 flex-col items-center justify-between py-0.5">
        {topRightText && (
          <Identifier
            className="text-sm"
            identifier={topRightText}
          />
        )}
        {bottomRightText && (
          <Identifier
            className="text-sm"
            identifier={bottomRightText}
          />
        )}
      </div>
    </div>
  );
}

export { FormCell };
