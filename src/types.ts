/**
 * Token information passed to the filter function
 */
export interface TokenInfo {
  tag: string;
  attrs: Record<string, string | undefined>;
}

/**
 * Options for the insane sanitizer
 */
export interface InsaneOptions {
  /**
   * List of allowed HTML tag names (lowercase)
   */
  allowedTags?: string[];

  /**
   * Map of tag names to allowed attribute names.
   * Use '*' as key for attributes allowed on all tags.
   */
  allowedAttributes?: Record<string, string[]>;

  /**
   * Map of tag names to allowed class names.
   * Only applies when 'class' is NOT in allowedAttributes for that tag.
   */
  allowedClasses?: Record<string, string[]>;

  /**
   * List of allowed URL schemes (e.g., 'http', 'https', 'mailto')
   */
  allowedSchemes?: string[];

  /**
   * Custom filter function to accept/reject tags.
   * Return true to keep the tag, false to remove it.
   */
  filter?: ((token: TokenInfo) => boolean) | null;

  /**
   * Transform text content before output
   */
  transformText?: ((text: string) => string) | null;
}

/**
 * Internal resolved options (all fields required)
 */
export interface ResolvedOptions {
  allowedTags: string[];
  allowedAttributes: Record<string, string[]>;
  allowedClasses: Record<string, string[]>;
  allowedSchemes: string[];
  filter: ((token: TokenInfo) => boolean) | null;
  transformText: ((text: string) => string) | null;
}

/**
 * Parser handler interface
 */
export interface ParserHandler {
  start?: (tag: string, attrs: Record<string, string | undefined>, unary: boolean) => void;
  end?: (tag: string) => void;
  chars?: (text: string) => void;
  comment?: (text: string) => void;
}

/**
 * Sanitizer context for tracking ignored tags
 */
export interface SanitizerContext {
  ignoring: string | false;
  depth: number;
}
