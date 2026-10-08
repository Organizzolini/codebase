import * as React from "react";

import { cn } from "@codebase/components-web";

/**
 * Properties for the Logo component that displays the Lexico logo.
 */
export interface LogoProperties {
  /** Additional class names */
  className?: string | undefined;
  /** Width of the logo in pixels */
  width?: number | undefined;
}

/**
 * Render the Lexico brand logo at a configurable width.
 */
function Logo(properties: LogoProperties): React.ReactElement {
  const { className, width = 320 } = properties;
  // Logo has 4:3 aspect ratio
  const height = width * (4 / 3);

  return (
    <div
      className={cn("flex items-center justify-center", className)}
      style={{ height: `${height}px`, width: `${width}px` }}
    >
      <img
        alt="Lexico"
        className="object-contain"
        height={height}
        loading="eager"
        src="/lexico_logo.svg"
        width={width}
      />
    </div>
  );
}

export { Logo };
