/** Quote every cell and neutralize spreadsheet formulas, including whitespace prefixes. */
export function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  if (typeof value !== "number" && /^(?:[\t\r]|\s*[=+\-@])/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
