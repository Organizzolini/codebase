// 🏷️ Types

/**
 * Twilight period classification by solar depression angle.
 * - `civil`: Sun between 0° and −6° (daily activities still possible without artificial light)
 * - `nautical`: Sun between −6° and −12° (sea horizon barely visible)
 * - `astronomical`: Sun between −12° and −18° (faintest stars become visible).
 */
export type Twilight = "astronomical" | "civil" | "nautical";
