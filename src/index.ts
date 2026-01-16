import { parser } from "./parser.js";
import { createSanitizer } from "./sanitizer.js";
import { defaults } from "./defaults.js";
import { isNativeAvailable, canUseNative, sanitizeNative } from "./native.js";
import type { InsaneOptions, ResolvedOptions } from "./types.js";

export type { InsaneOptions, TokenInfo } from "./types.js";
export { defaults } from "./defaults.js";

/**
 * Resolve user options with defaults
 */
function resolveOptions(options?: InsaneOptions, strict?: boolean): ResolvedOptions {
  if (strict === true && options) {
    return {
      allowedTags: options.allowedTags ?? [],
      allowedAttributes: options.allowedAttributes ?? {},
      allowedClasses: options.allowedClasses ?? {},
      allowedSchemes: options.allowedSchemes ?? [],
      filter: options.filter ?? null,
      transformText: options.transformText ?? null,
    };
  }

  const base: ResolvedOptions = {
    allowedTags: defaults.allowedTags,
    allowedAttributes: defaults.allowedAttributes,
    allowedClasses: defaults.allowedClasses,
    allowedSchemes: defaults.allowedSchemes,
    filter: defaults.filter,
    transformText: defaults.transformText,
  };

  if (!options) {
    return base;
  }

  return {
    allowedTags: options.allowedTags ?? base.allowedTags,
    allowedAttributes: options.allowedAttributes ?? base.allowedAttributes,
    allowedClasses: options.allowedClasses ?? base.allowedClasses,
    allowedSchemes: options.allowedSchemes ?? base.allowedSchemes,
    filter: options.filter !== undefined ? options.filter : base.filter,
    transformText: options.transformText !== undefined ? options.transformText : base.transformText,
  };
}

/**
 * Sanitize HTML using the JavaScript fallback implementation
 */
function sanitizeFallback(html: string, options: ResolvedOptions): string {
  const buffer: string[] = [];
  const handler = createSanitizer(buffer, options);
  parser(html, handler);
  return buffer.join("");
}

/**
 * Sanitize HTML string with whitelist-based sanitization.
 *
 * In supported browsers (Chrome 145+, Firefox 148+), this will use the native
 * Sanitizer API when the options are compatible. Otherwise, it falls back to
 * the JavaScript implementation.
 *
 * @param html - The HTML string to sanitize
 * @param options - Sanitization options
 * @param strict - If true, options are used as-is without merging with defaults
 * @returns The sanitized HTML string
 *
 * @example
 * ```ts
 * import insane from 'insane'
 *
 * // Use default options
 * insane('<script>alert(1)</script><p>Hello</p>')
 * // => '<p>Hello</p>'
 *
 * // Custom options
 * insane('<div class="foo bar">text</div>', {
 *   allowedTags: ['div'],
 *   allowedClasses: { div: ['foo'] }
 * })
 * // => '<div class="foo">text</div>'
 * ```
 */
export function insane(html: string, options?: InsaneOptions, strict?: boolean): string {
  const resolved = resolveOptions(options, strict);

  // Try to use native Sanitizer API if available and compatible
  if (isNativeAvailable() && canUseNative(resolved)) {
    try {
      return sanitizeNative(html, resolved);
    } catch {
      // Fall back to JS implementation on any error
    }
  }

  return sanitizeFallback(html, resolved);
}

export default insane;
