import type { ResolvedOptions } from "./types.js";

/**
 * Check if native Sanitizer API is available
 */
export function isNativeAvailable(): boolean {
  return (
    typeof globalThis !== "undefined" &&
    "Sanitizer" in globalThis &&
    typeof (globalThis as { Sanitizer?: unknown }).Sanitizer === "function"
  );
}

/**
 * Check if options can be handled by native Sanitizer API
 * Returns false if options use features not supported by native API:
 * - allowedClasses (not supported)
 * - allowedSchemes (not supported, native has fixed scheme list)
 * - filter (not supported)
 * - transformText (not supported)
 */
export function canUseNative(options: ResolvedOptions): boolean {
  // Check for unsupported options
  if (options.filter !== null) {
    return false;
  }

  if (options.transformText !== null) {
    return false;
  }

  // allowedClasses with any entries = not supported
  if (Object.keys(options.allowedClasses).length > 0) {
    for (const classes of Object.values(options.allowedClasses)) {
      if (classes.length > 0) {
        return false;
      }
    }
  }

  // allowedSchemes different from default = not supported
  // Native API only allows http, https, mailto, tel by default
  const nativeSchemes = new Set(["http", "https", "mailto", "tel"]);
  for (const scheme of options.allowedSchemes) {
    if (!nativeSchemes.has(scheme)) {
      return false;
    }
  }

  return true;
}

/**
 * Convert insane options to native Sanitizer configuration
 */
export function toNativeConfig(options: ResolvedOptions): SanitizerConfig {
  const elements: (string | ElementSetAttribute)[] = [];

  for (const tag of options.allowedTags) {
    const tagAttrs = options.allowedAttributes[tag] ?? [];
    const globalAttrs = options.allowedAttributes["*"] ?? [];
    const allAttrs = [...new Set([...tagAttrs, ...globalAttrs])];

    if (allAttrs.length > 0) {
      elements.push({
        name: tag,
        attributes: allAttrs,
      });
    } else {
      elements.push(tag);
    }
  }

  return {
    elements,
    removeElements: [],
    replaceWithChildrenElements: [],
    attributes: options.allowedAttributes["*"] ?? [],
    comments: false,
    dataAttributes: false,
  };
}

// Type declarations for native Sanitizer API (experimental)
interface ElementSetAttribute {
  name: string;
  attributes?: string[];
  removeAttributes?: string[];
}

interface SanitizerConfig {
  elements?: (string | ElementSetAttribute)[];
  removeElements?: string[];
  replaceWithChildrenElements?: string[];
  attributes?: string[];
  removeAttributes?: string[];
  comments?: boolean;
  dataAttributes?: boolean;
}

type SanitizerConstructor = new (config?: SanitizerConfig) => Sanitizer;

interface Sanitizer {
  sanitize(input: string | Document | DocumentFragment): DocumentFragment;
}

interface SetHTMLOptions {
  sanitizer?: Sanitizer | SanitizerConfig;
}

declare global {
  interface Element {
    setHTML?(html: string, options?: SetHTMLOptions): void;
  }

  // eslint-disable-next-line no-var
  var Sanitizer: SanitizerConstructor | undefined;
}

/**
 * Sanitize HTML using native Sanitizer API
 * Requires browser environment with Sanitizer API support
 */
export function sanitizeNative(html: string, options: ResolvedOptions): string {
  if (!isNativeAvailable()) {
    throw new Error("Native Sanitizer API is not available");
  }

  const SanitizerClass = globalThis.Sanitizer;
  if (!SanitizerClass) {
    throw new Error("Native Sanitizer API is not available");
  }

  const config = toNativeConfig(options);
  const sanitizer = new SanitizerClass(config);

  // Create a temporary div element
  const div = document.createElement("div");

  // Use setHTML if available (preferred method)
  if (div.setHTML) {
    div.setHTML(html, { sanitizer });
    return div.innerHTML;
  }

  // Fallback: use sanitizer.sanitize directly
  const fragment = sanitizer.sanitize(html);
  div.appendChild(fragment);
  return div.innerHTML;
}
