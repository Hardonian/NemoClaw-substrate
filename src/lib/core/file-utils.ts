import * as fs from "node:fs";

/**
 * Reads a file and parses it as JSON.
 * Returns `unknown` to force callers to validate or narrow the type.
 *
 * @param filePath The path to the file to read.
 * @returns The parsed JSON object.
 */
export function readJsonFileSync(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}
