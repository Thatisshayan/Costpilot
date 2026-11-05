// A plain signed decimal such as "-4.50" is data, not a formula, so exact money strings
// keep their sign; anything else starting with a formula character is neutralized.
function isPlainDecimal(text: string): boolean {
  const parts = (text.startsWith("-") ? text.slice(1) : text).split(".");
  return parts.length <= 2 && parts.every(part => /^\d+$/.test(part));
}

/** Quote every cell and neutralize spreadsheet formulas, including whitespace prefixes. */
export function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  if (typeof value !== "number" && !isPlainDecimal(text) && /^(?:[\t\r]|\s*[=+\-@])/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
