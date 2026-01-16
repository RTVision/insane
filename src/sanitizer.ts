import { encode } from "html-entities";
import { lowercase } from "./utils.js";
import { isUriAttribute } from "./attributes.js";
import { isVoidElement } from "./elements.js";
import type { ParserHandler, ResolvedOptions, SanitizerContext } from "./types.js";

/**
 * Create a sanitizer handler for the parser
 */
export function createSanitizer(buffer: string[], options: ResolvedOptions): ParserHandler {
  let context: SanitizerContext = { ignoring: false, depth: 0 };

  function reset(): void {
    context = { ignoring: false, depth: 0 };
  }

  function out(value: string): void {
    buffer.push(value);
  }

  function ignore(tag: string): void {
    if (isVoidElement(tag)) {
      return;
    }
    if (context.ignoring === false) {
      context = { ignoring: tag, depth: 1 };
    } else if (context.ignoring === tag) {
      context.depth++;
    }
  }

  function unignore(tag: string): void {
    if (context.ignoring === tag) {
      if (--context.depth <= 0) {
        reset();
      }
    }
  }

  function testUrl(text: string): boolean {
    const [start] = text;
    if (start === "#" || start === "/") {
      return true;
    }

    const colon = text.indexOf(":");
    if (colon === -1) {
      return true;
    }

    const questionmark = text.indexOf("?");
    if (questionmark !== -1 && colon > questionmark) {
      return true;
    }

    const hash = text.indexOf("#");
    if (hash !== -1 && colon > hash) {
      return true;
    }

    return options.allowedSchemes.some((scheme) => text.indexOf(`${scheme}:`) === 0);
  }

  function start(tag: string, attrs: Record<string, string | undefined>, unary: boolean): void {
    const low = lowercase(tag);

    if (context.ignoring !== false) {
      ignore(low);
      return;
    }

    if (!options.allowedTags.includes(low)) {
      ignore(low);
      return;
    }

    if (options.filter && !options.filter({ tag: low, attrs })) {
      ignore(low);
      return;
    }

    out("<");
    out(low);

    for (const key of Object.keys(attrs)) {
      parseAttribute(key, attrs[key], low);
    }

    out(unary ? "/>" : ">");
  }

  function parseAttribute(key: string, value: string | undefined, tag: string): void {
    const classesOk = options.allowedClasses[tag] ?? [];
    let attrsOk = options.allowedAttributes[tag] ?? [];
    const globalAttrs = options.allowedAttributes["*"] ?? [];
    attrsOk = attrsOk.concat(globalAttrs);

    const lkey = lowercase(key);
    let valid: boolean;
    let outputValue = value;

    if (lkey === "class" && !attrsOk.includes(lkey)) {
      // Filter classes if 'class' is not explicitly allowed
      if (value !== undefined) {
        outputValue = value
          .split(" ")
          .filter((className) => classesOk.includes(className))
          .join(" ")
          .trim();
        valid = outputValue.length > 0;
      } else {
        valid = false;
      }
    } else {
      valid =
        attrsOk.includes(lkey) && (!isUriAttribute(lkey) || value === undefined || testUrl(value));
    }

    if (valid) {
      out(" ");
      out(key);
      if (typeof outputValue === "string") {
        out('="');
        out(encode(outputValue));
        out('"');
      }
    }
  }

  function end(tag: string): void {
    const low = lowercase(tag);
    const allowed = options.allowedTags.includes(low);

    if (allowed) {
      if (context.ignoring === false) {
        out("</");
        out(low);
        out(">");
      } else {
        unignore(low);
      }
    } else {
      unignore(low);
    }
  }

  function chars(text: string): void {
    if (context.ignoring === false) {
      out(options.transformText ? options.transformText(text) : text);
    }
  }

  return {
    start,
    end,
    chars,
  };
}
