import * as fs from "node:fs";

/**
 * Reads a file synchronously and parses it as JSON.
 * Returns the parsed generic type T.
 *
 * @param path - The path to the file to read.
 * @returns The parsed JSON content.
 * @throws If the file cannot be read or the content is not valid JSON.
 */
export function readJsonSync<T = unknown>(path: string): T {
  return JSON.parse(fs.readFileSync(path, "utf-8")) as T;
}

/**
 * Reads a file synchronously and parses it as JSON, or returns a fallback value if the file does not exist or parsing fails.
 *
 * @param path - The path to the file to read.
 * @param fallback - The value to return if reading or parsing fails.
 * @returns The parsed JSON content, or the fallback value.
 */
export function readJsonSyncSafe<T>(path: string, fallback: T): T {
  try {
    if (!fs.existsSync(path)) return fallback;
    return readJsonSync<T>(path);
  } catch {
    return fallback;
  }
}
