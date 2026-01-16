import { toSet } from "./utils.js";

/**
 * Attributes that contain URIs and need scheme validation
 */
const uriAttributes = ["background", "base", "cite", "href", "longdesc", "src", "usemap"] as const;

export const uriAttributesSet: Set<string> = toSet(uriAttributes);

export function isUriAttribute(attr: string): boolean {
  return uriAttributesSet.has(attr);
}
