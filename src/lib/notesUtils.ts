/** Extract chapter number from a title string */
export function detectChapterNumber(title: string): number | null {
  const match = title.match(/(chapter|ch\.?|ch-)\s*(\d+)/i);
  return match ? parseInt(match[2], 10) : null;
}

/** Detect if title indicates a solution/answer file */
export function detectIsSolution(title: string): boolean {
  return /(solution|sol\b|numerical|answer)/i.test(title);
}
