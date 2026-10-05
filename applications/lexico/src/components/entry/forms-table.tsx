import * as React from "react";

import { cn } from "@codebase/components-web";

import { FormCell } from "./form-cell";

import type {
  FormCellPosition,
  FormCellProperties as FormCellProperties,
} from "./form-cell";

/**
 * Properties for the FormsTable component that displays a grid of form cells.
 */
export interface FormsTableProperties {
  /** Additional class names */
  className?: string | undefined;
  /** Array of form cell data */
  forms: Omit<FormCellProperties, "position" | "search">[];
  /** Search term for highlighting */
  search?: string | undefined;
}

/**
 * Render two-column form cells with border-position metadata.
 */
function FormsTable(properties: FormsTableProperties): React.ReactElement {
  const { className, forms, search } = properties;
  return (
    <div className={cn("grid grid-cols-2 bg-card", className)}>
      {forms.map((form, index) => {
        // Calculate position for border styling
        const isTop = index < 2;
        const isBottom = index >= forms.length - 2;
        const isLeft = index % 2 === 0;

        let horizontal: "bottom" | "mid" | "top";
        if (isTop) horizontal = "top";
        else if (isBottom) horizontal = "bottom";
        else horizontal = "mid";

        const vertical = isLeft ? "Left" : "Right";
        const position = `${horizontal}${vertical}` as FormCellPosition;

        return (
          <FormCell
            key={`${form.topLeftText ?? "cell"}-${form.topRightText ?? "pos"}-${form.centerText}`}
            position={position}
            search={search}
            {...form}
          />
        );
      })}
    </div>
  );
}

export { FormsTable };
