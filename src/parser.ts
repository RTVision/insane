import { decode } from "html-entities";
import { lowercase } from "./utils.js";
import { isVoidElement } from "./elements.js";
import type { ParserHandler } from "./types.js";

// Simplified regex patterns - avoiding catastrophic backtracking
// These patterns are intentionally simple and don't use nested quantifiers
const rtag = /^</;
const rtagend = /^<\s*\//;
const rendSimple = /^<\s*\/\s*([\w:-]+)\s*>/;
const rcomment = /^<!--/;

class ParseStack {
  private items: string[] = [];

  push(item: string): void {
    this.items.push(item);
  }

  get length(): number {
    return this.items.length;
  }

  set length(value: number) {
    this.items.length = value;
  }

  at(index: number): string | undefined {
    return this.items[index];
  }

  lastItem(): string | undefined {
    return this.items[this.items.length - 1];
  }
}

/**
 * Parse attributes from a string using a state machine approach
 * This avoids regex-based catastrophic backtracking
 */
function parseAttributes(attrString: string): Record<string, string | undefined> {
  const attrs: Record<string, string | undefined> = {};
  let i = 0;
  const len = attrString.length;

  while (i < len) {
    // Skip whitespace
    while (i < len && /\s/.test(attrString.charAt(i))) {
      i++;
    }

    if (i >= len) {
      break;
    }

    // Parse attribute name
    const nameStart = i;
    while (i < len && /[\w:-]/.test(attrString.charAt(i))) {
      i++;
    }

    if (i === nameStart) {
      // No valid attribute name found, skip this character
      i++;
      continue;
    }

    const name = attrString.slice(nameStart, i);

    // Skip whitespace
    while (i < len && /\s/.test(attrString.charAt(i))) {
      i++;
    }

    // Check for equals sign
    if (i < len && attrString[i] === "=") {
      i++; // skip '='

      // Skip whitespace
      while (i < len && /\s/.test(attrString.charAt(i))) {
        i++;
      }

      if (i >= len) {
        // Attribute with = but no value
        attrs[name] = "";
        break;
      }

      const quote = attrString[i];
      if (quote === '"' || quote === "'") {
        // Quoted value
        i++; // skip opening quote
        const valueStart = i;
        while (i < len && attrString[i] !== quote) {
          i++;
        }
        const value = attrString.slice(valueStart, i);
        attrs[name] = decode(value);
        if (i < len) {
          i++; // skip closing quote
        }
      } else {
        // Unquoted value
        const valueStart = i;
        while (i < len && !/[\s>]/.test(attrString.charAt(i))) {
          i++;
        }
        const value = attrString.slice(valueStart, i);
        attrs[name] = decode(value);
      }
    } else {
      // Boolean attribute (no value)
      attrs[name] = undefined;
    }
  }

  return attrs;
}

/**
 * Parse a start tag and extract tag name, attributes, and self-closing status
 */
function parseStartTagContent(tagContent: string): {
  tagName: string;
  attrs: Record<string, string | undefined>;
  selfClosing: boolean;
} | null {
  // tagContent is everything between < and > (exclusive)
  let content = tagContent.trim();

  // Check for self-closing
  const selfClosing = content.endsWith("/");
  if (selfClosing) {
    content = content.slice(0, -1).trim();
  }

  // Extract tag name (first word)
  const match = content.match(/^([\w:-]+)/);
  const tagName = match?.[1];
  if (tagName === undefined || tagName === "") {
    return null;
  }

  const attrString = content.slice(tagName.length);

  return {
    tagName,
    attrs: parseAttributes(attrString),
    selfClosing,
  };
}

/**
 * Parse HTML string and call handler methods for each token
 */
export function parser(html: string, handler: ParserHandler): void {
  const stack = new ParseStack();
  let remaining = html;
  let last = remaining;
  let chars: boolean;

  while (remaining) {
    chars = true;
    parseTagSection();

    const same = remaining === last;
    last = remaining;

    if (same) {
      // discard, because it's invalid
      remaining = "";
    }
  }

  // clean up any remaining tags
  parseEndTag("");

  function parseTagSection(): void {
    if (rcomment.test(remaining)) {
      parseComment();
    } else if (rtagend.test(remaining)) {
      parseEndTagMatch();
    } else if (rtag.test(remaining)) {
      parseStartTagMatch();
    }
    parseTagDecode();
  }

  function parseComment(): void {
    const index = remaining.indexOf("-->");
    if (index >= 0) {
      if (handler.comment) {
        handler.comment(remaining.substring(4, index));
      }
      remaining = remaining.substring(index + 3);
      chars = false;
    }
  }

  function parseStartTagMatch(): void {
    // Find the closing >
    const closeIndex = remaining.indexOf(">");
    if (closeIndex === -1) {
      return;
    }

    const tagContent = remaining.substring(1, closeIndex);
    const parsed = parseStartTagContent(tagContent);

    if (!parsed) {
      return;
    }

    remaining = remaining.substring(closeIndex + 1);
    chars = false;

    const low = lowercase(parsed.tagName);
    const isUnary = isVoidElement(low) || parsed.selfClosing;

    if (!isUnary) {
      stack.push(low);
    }

    if (handler.start) {
      handler.start(low, parsed.attrs, isUnary);
    }
  }

  function parseEndTagMatch(): void {
    const match = remaining.match(rendSimple);
    const tagName = match?.[1];
    if (match !== null && tagName !== undefined && tagName !== "") {
      remaining = remaining.substring(match[0].length);
      parseEndTag(tagName);
      chars = false;
    }
  }

  function parseTagDecode(): void {
    if (!chars) {
      return;
    }
    let text: string;
    const index = remaining.indexOf("<");
    if (index >= 0) {
      text = remaining.substring(0, index);
      remaining = remaining.substring(index);
    } else {
      text = remaining;
      remaining = "";
    }
    if (handler.chars) {
      handler.chars(text);
    }
  }

  function parseEndTag(tagName: string): void {
    let pos = 0;
    const low = lowercase(tagName);

    if (low !== "") {
      // find the closest opened tag of the same type
      for (pos = stack.length - 1; pos >= 0; pos--) {
        if (stack.at(pos) === low) {
          break;
        }
      }
    }

    if (pos >= 0) {
      // close all the open elements, up the stack
      for (let i = stack.length - 1; i >= pos; i--) {
        const tag = stack.at(i);
        if (handler.end && tag !== undefined) {
          handler.end(tag);
        }
      }
      stack.length = pos;
    }
  }
}
