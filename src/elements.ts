import { toSet } from "./utils.js";

/**
 * HTML void elements (self-closing tags)
 */
const voidElements = [
  "area",
  "br",
  "col",
  "hr",
  "img",
  "wbr",
  "input",
  "base",
  "basefont",
  "link",
  "meta",
] as const;

export const voidElementsSet: Set<string> = toSet(voidElements);

export function isVoidElement(tag: string): boolean {
  return voidElementsSet.has(tag);
}
