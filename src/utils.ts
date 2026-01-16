/**
 * Convert an array to a Set for O(1) lookups
 */
export function toSet<T>(list: readonly T[]): Set<T> {
  return new Set(list);
}

/**
 * Lowercase a string, returning the original value if not a string
 */
export function lowercase(value: string): string;
export function lowercase<T>(value: T): T;
export function lowercase<T>(value: T | string): T | string {
  return typeof value === "string" ? value.toLowerCase() : value;
}

/**
 * Deep merge objects (similar to assignment package)
 * Later objects override earlier ones
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  ...sources: (Partial<T> | undefined)[]
): T {
  const result: Record<string, unknown> = { ...target };

  for (const source of sources) {
    if (source === undefined || source === null) {
      continue;
    }

    for (const key of Object.keys(source)) {
      const sourceVal = source[key as keyof T];
      const targetVal = result[key];

      if (sourceVal === undefined) {
        continue;
      }

      if (isPlainObject(sourceVal) && isPlainObject(targetVal)) {
        result[key] = deepMerge(targetVal, sourceVal);
      } else {
        result[key] = sourceVal;
      }
    }
  }

  // oxlint-disable-next-line no-unsafe-type-assertion -- generic deep merge requires type assertion
  return result as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}
