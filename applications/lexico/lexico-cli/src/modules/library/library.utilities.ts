/**
 * Clean up common Latin Library boilerplate patterns.
 */
export function cleanBoilerplate(text: string): string {
  let cleaned = text;

  // Remove various forms of The Latin Library / The Classics Page boilerplate
  cleaned = cleaned.replaceAll(/The Latin Library/gi, "");
  cleaned = cleaned.replaceAll(/The Classics Page/gi, "");
  cleaned = cleaned.replaceAll(/Neo-Latin/gi, "");

  return cleaned.trim();
}

/**
 * Format line numbers consistently.
 */
export function formatLineNumber(line: string): string {
  let formattedLine = line.trim();

  // If the line has an end-of-line poetry number padded with whitespace
  // Move it to the beginning and bold it.
  const endLineMatch = /^(.*?)\s{3,}(\d+)\s*$/.exec(formattedLine);
  if (endLineMatch) {
    formattedLine = `**${endLineMatch[2]}** ${endLineMatch[1]}`.trim();
  } else {
    // Check if the line already starts with bold text, if so skip prefixes formatting
    if (!formattedLine.startsWith("**")) {
      const bracketMatch = /^\[([a-zA-Z0-9]+)\]\s*(.*)$/.exec(formattedLine);
      const decimalMatch = /^((?:\d+\.)+[a-zA-Z0-9]*\.?)\s+(.*)$/.exec(
        formattedLine,
      );
      const simpleMatch = /^(\d+[a-zA-Z]*|[MDCLXVI]+)\.?\s+(.*)$/.exec(
        formattedLine,
      );

      if (bracketMatch) {
        formattedLine = `**[${bracketMatch[1]}]** ${bracketMatch[2]}`;
      } else if (decimalMatch) {
        formattedLine = `**${decimalMatch[1]}** ${decimalMatch[2]}`;
      } else if (simpleMatch) {
        formattedLine = `**${simpleMatch[1]}** ${simpleMatch[2]}`;
      }
    }
  }

  // Double check if there's any case where end of line number was already bolded but at the end
  const boldEndLineMatch = /^(.*?)\s{2,}\*\*(\d+)\*\*\s*$/.exec(formattedLine);
  if (boldEndLineMatch) {
    formattedLine = `**${boldEndLineMatch[2]}** ${boldEndLineMatch[1]}`.trim();
  }

  return formattedLine;
}

/**
 * Check if the text content is valid Latin (not English metadata/intro).
 */
export function hasValidTextContent(paragraphs: string[]): boolean {
  if (paragraphs.length === 0) return false;

  const allText = paragraphs.join(" ");
  // Check if there is at least one alphabetical character in the combined text
  return /[a-zA-Z]/.test(allText);
}

/**
 * Identify English boilerplate text.
 */
export function isEnglishBoilerplate(line: string): boolean {
  const stopWords = new Set([
    "and",
    "by",
    "from",
    "of",
    "that",
    "the",
    "this",
    "to",
    "which",
    "with",
  ]);
  const words = line.toLowerCase().match(/\b[a-z]+\b/g) || [];
  if (words.length === 0) return false;

  let stopWordCount = 0;
  for (const word of words) {
    if (stopWords.has(word)) stopWordCount++;
  }

  // If a significant portion of words are english stop words, it's english text.
  return (
    stopWordCount >= 3 ||
    (words.length > 5 && stopWordCount / words.length > 0.2)
  );
}
