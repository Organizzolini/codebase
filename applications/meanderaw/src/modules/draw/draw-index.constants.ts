// `nav` is the HTML sectioning element the jump list is wrapped in, not an
// abbreviation of "navigation" this file chose to write.
// cspell:ignore nav

// ♟️ Constants

/**
 * How many times each row's tile is laid out along its band on the page.
 *
 * A stored `svg` is one repeat, and one repeat read alone shows the shape of
 * a tile rather than the shape of the meander it tiles into — which of two
 * adjacent tiles a stroke belongs to only becomes readable once the repeat
 * has happened a few times. Six is wide enough for the eye to pick the
 * period out and short enough that a whole family's grid of them still fits
 * a column.
 */
export const BAND_REPEAT_COUNT = 6;

/**
 * Prefixed onto a row's own primary key to name the `<defs>` entry its band
 * references once per repeat.
 *
 * Every band on the page shares one document, so the identifier has to be
 * unique across the whole corpus rather than within one figure — a row's
 * primary key already is, and the prefix keeps it from colliding with any
 * other kind of identifier the page might grow.
 */

/**
 * The label a null-`family` row's section is headed and jump-linked with.
 *
 * Roughly a ninth of the enumerated corpus matches no family's defining
 * combination — spec #813 asks for that to be a real, expected outcome shown
 * on the page rather than a row the sweep excludes, so it earns a section of
 * its own rather than being folded into whichever family sorts last.
 */
export const UNCLASSIFIED_FAMILY_LABEL = "unclassified";

/** Sort order for each family on the index page. */
export const FAMILY_SORT_KEYS: Record<string, number> = {
  arcade: 1,
  bars: 2,
  boxes: 3,
  chain: 4,
  clasps: 5,
  comb: 6,
  cross: 7,
  dots: 8,
  "double-chain": 9,
  fork: 10,
  lines: 11,
  mesh: 12,
  parallel: 13,
  snake: 14,
  stipple: 15,
  swirl: 16,
  tree: 17,
  waterfalls: 18,
  whirl: 19,
};

/**
 * The page's own stylesheet, held here rather than inline in
 * `DrawIndexService` so the service's own methods stay about assembling rows
 * into markup rather than about styling it.
 *
 * Carried over from the retired `DrawIndexService`'s own page, with `.art`
 * restyled for an inlined `<svg>` in place of the `<img>` it used to frame:
 * there is no `loading="lazy"` left to give an inline element, since that
 * attribute only ever deferred a linked file's own network request.
 *
 * `.art > svg` is the band, and only the band — the child combinator matters,
 * because the repeats nested inside it are `<svg>` elements too and must keep
 * the size the band placed them at. The band alone scales down to its column,
 * so six repeats of a wide tile shrink to fit rather than scrolling.
 */
export const PAGE_STYLES = `
:root { color-scheme: light dark; }
body { font: 13px/1.4 system-ui, sans-serif; margin: 24px; }
h1 { font-size: 18px; margin: 0 0 4px; }
h2 { font-family: ui-monospace, monospace; font-size: 14px; margin: 0 0 2px; }
p.count { color: color-mix(in srgb, currentColor 60%, transparent); margin: 0 0 16px; }
nav ul { columns: 4 280px; list-style: none; margin: 0 0 32px; padding: 0; }
nav li { break-inside: avoid; font-family: ui-monospace, monospace; }
nav span { color: color-mix(in srgb, currentColor 55%, transparent); }
section { margin: 0 0 40px; }
.grid { display: grid; gap: 20px 16px; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
figure { margin: 0; }
.art { background: #fff; border: 1px solid color-mix(in srgb, currentColor 20%, transparent); display: block; overflow: hidden; padding: 8px; }
.art > svg { display: block; height: auto; max-width: 100%; }
figcaption { font-family: ui-monospace, monospace; font-size: 11px; margin-top: 6px; word-break: break-all; }
`;

// 🚨 Errors

/**
 * Thrown instead of interpolating a row's `svg` field into the page when it
 * does not look like a complete inline SVG document.
 *
 * `DrawIndexService` embeds that field verbatim rather than escaping it — it
 * has to render as markup, not as literal text — so an unescaped field is
 * exactly where a malformed or crafted string could break the surrounding
 * page structure. Every real row's `svg` comes from
 * `DrawingService`, which always emits a well-formed
 * `<svg>...</svg>` document, so this is a fail-loud guard against a corrupt
 * row rather than a sanitizer: refusing the whole build is safer than
 * emitting a page whose markup a bad row could have torn open.
 */
