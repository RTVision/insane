/* oxlint-disable no-unsafe-type-assertion, no-unsafe-member-access, no-unsafe-assignment, no-unsafe-argument -- intentionally testing unsafe operations */
import { describe, it, expect, afterEach } from "vitest";
import insane from "../src/index.js";
import type { InsaneOptions, TokenInfo } from "../src/types.js";

/**
 * Prototype Pollution Security Tests
 *
 * Prototype pollution is an attack where an attacker can modify Object.prototype
 * or other built-in prototypes, affecting all objects in the application.
 *
 * In the context of an HTML sanitizer, prototype pollution could occur through:
 * 1. Options object processing (e.g., __proto__ in allowedTags)
 * 2. Tag/attribute name handling (using __proto__, constructor, prototype as keys)
 * 3. Deep merge operations on configuration
 *
 * These tests verify that the sanitizer is not vulnerable to prototype pollution.
 */
describe("Prototype Pollution Prevention", () => {
  // Store original prototypes to verify they weren't modified
  const originalObjectProto = Object.getOwnPropertyNames(Object.prototype).sort().join(",");
  const originalArrayProto = Object.getOwnPropertyNames(Array.prototype).sort().join(",");

  afterEach(() => {
    // Verify prototypes weren't modified after each test
    const currentObjectProto = Object.getOwnPropertyNames(Object.prototype).sort().join(",");
    const currentArrayProto = Object.getOwnPropertyNames(Array.prototype).sort().join(",");

    if (currentObjectProto !== originalObjectProto) {
      // Clean up any pollution for subsequent tests
      const current = Object.getOwnPropertyNames(Object.prototype);
      const original = originalObjectProto.split(",");
      for (const prop of current) {
        if (!original.includes(prop)) {
          delete (Object.prototype as Record<string, unknown>)[prop];
        }
      }
      throw new Error("Object.prototype was polluted!");
    }

    if (currentArrayProto !== originalArrayProto) {
      throw new Error("Array.prototype was polluted!");
    }
  });

  describe("Options object pollution", () => {
    it("does not pollute prototype via allowedTags", () => {
      const maliciousOptions = {
        allowedTags: ["div", "__proto__", "constructor", "prototype"],
      };

      const result = insane("<div>test</div>", maliciousOptions);
      expect(result).toBe("<div>test</div>");

      // Verify Object.prototype was not modified
      expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
    });

    it("does not pollute prototype via allowedAttributes", () => {
      const maliciousOptions = {
        allowedAttributes: {
          __proto__: ["polluted"],
          constructor: ["polluted"],
          div: ["title"],
        },
      };

      const result = insane('<div title="test">test</div>', maliciousOptions);
      expect(result).toContain('title="test"');

      // Verify Object.prototype was not modified
      expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
    });

    it("does not pollute prototype via allowedClasses", () => {
      const maliciousOptions = {
        allowedClasses: {
          __proto__: ["polluted"],
          constructor: ["polluted"],
          div: ["safe"],
        },
      };

      const result = insane('<div class="safe">test</div>', maliciousOptions);
      expect(result).toContain('class="safe"');

      // Verify Object.prototype was not modified
      expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
    });

    it("does not pollute prototype via allowedSchemes", () => {
      const maliciousOptions = {
        allowedSchemes: ["http", "https", "__proto__" as const],
      };

      const result = insane('<a href="https://example.com">link</a>', maliciousOptions);
      expect(result).toContain('href="https://example.com"');

      // Verify Object.prototype was not modified
      expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
    });
  });

  describe("Tag name pollution", () => {
    it("handles __proto__ as tag name", () => {
      const input = "<__proto__>content</__proto__>";
      const result = insane(input);
      expect(result).toBe("");

      // Verify Object.prototype was not modified
      expect((Object.prototype as Record<string, unknown>).content).toBeUndefined();
    });

    it("handles constructor as tag name", () => {
      const input = "<constructor>content</constructor>";
      const result = insane(input);
      expect(result).toBe("");
    });

    it("handles prototype as tag name", () => {
      const input = "<prototype>content</prototype>";
      const result = insane(input);
      expect(result).toBe("");
    });

    it("handles hasOwnProperty as tag name", () => {
      const input = "<hasOwnProperty>content</hasOwnProperty>";
      const result = insane(input);
      expect(result).toBe("");
    });

    it("handles toString as tag name", () => {
      const input = "<toString>content</toString>";
      const result = insane(input);
      expect(result).toBe("");
    });

    it("handles valueOf as tag name", () => {
      const input = "<valueOf>content</valueOf>";
      const result = insane(input);
      expect(result).toBe("");
    });
  });

  describe("Attribute name pollution", () => {
    it("handles __proto__ as attribute name without pollution", () => {
      const input = '<div __proto__="polluted">content</div>';
      const result = insane(input, { allowedAttributes: { div: ["__proto__"] } });
      // The attribute may or may not pass through (implementation detail)
      // What matters is no prototype pollution
      expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
      expect(result).toContain("content");
    });

    it("handles constructor as attribute without pollution", () => {
      const input = '<div constructor="polluted">content</div>';
      const result = insane(input, { allowedAttributes: { div: ["constructor"] } });
      // When explicitly allowed, it passes through (user's choice)
      // But no prototype pollution occurs
      expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
      expect(result).toContain("content");
    });

    it("handles prototype as attribute without pollution", () => {
      const input = '<div prototype="polluted">content</div>';
      const result = insane(input, { allowedAttributes: { div: ["prototype"] } });
      // When explicitly allowed, it passes through (user's choice)
      // But no prototype pollution occurs
      expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
      expect(result).toContain("content");
    });

    it("strips dangerous attributes by default", () => {
      const input = '<div __proto__="polluted" constructor="bad" prototype="evil">content</div>';
      const result = insane(input);
      // None of these are in the default allowlist
      expect(result).toBe("<div>content</div>");
    });
  });

  describe("Deep merge protection", () => {
    it("does not pollute via nested __proto__ in options", () => {
      // This tests the deep merge of options
      const maliciousOptions: InsaneOptions = JSON.parse(
        '{"allowedAttributes": {"__proto__": {"polluted": true}}}',
      );

      const result = insane("<div>test</div>", maliciousOptions);
      expect(result).toBe("<div>test</div>");

      // Verify Object.prototype was not modified
      expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
    });

    it("does not pollute via constructor.prototype in options", () => {
      const maliciousOptions: InsaneOptions = {
        constructor: {
          prototype: {
            polluted: true,
          },
        },
      } as unknown as InsaneOptions;

      const result = insane("<div>test</div>", maliciousOptions);
      expect(result).toBe("<div>test</div>");

      // Verify Object.prototype was not modified
      expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
    });
  });

  describe("Class name pollution", () => {
    it("handles __proto__ as class name", () => {
      const input = '<div class="__proto__">content</div>';
      const result = insane(input, {
        allowedClasses: { div: ["__proto__"] },
      });
      // Even if explicitly allowed, should be safe
      expect(typeof result).toBe("string");

      // Verify Object.prototype was not modified
      expect((Object.prototype as Record<string, unknown>).content).toBeUndefined();
    });

    it("handles constructor as class name", () => {
      const input = '<div class="constructor">content</div>';
      const result = insane(input, {
        allowedClasses: { div: ["constructor"] },
      });
      expect(typeof result).toBe("string");
    });
  });

  describe("Filter function pollution", () => {
    it("filter function cannot pollute via token object", () => {
      let filterCalled = false;

      const options = {
        filter: (token: TokenInfo) => {
          filterCalled = true;

          // Attempt to pollute via the token object
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (token as any)["__proto__"] = { polluted: true };
          } catch {
            // This should fail or be ignored
          }

          return true;
        },
      };

      insane("<div>test</div>", options);
      expect(filterCalled).toBe(true);

      // Verify Object.prototype was not modified
      expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
    });
  });

  describe("TransformText pollution", () => {
    it("transformText function cannot cause pollution", () => {
      let transformCalled = false;

      const options = {
        transformText: (_text: string) => {
          transformCalled = true;
          // Return potentially dangerous content - should still be safe
          return "__proto__";
        },
      };

      const result = insane("<div>test</div>", options);
      expect(transformCalled).toBe(true);
      expect(result).toContain("__proto__");

      // Verify Object.prototype was not modified
      expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
    });
  });

  describe("Array prototype pollution", () => {
    it("does not pollute Array.prototype via allowedTags array", () => {
      const maliciousArray: string[] = ["div", "span"];
      Object.defineProperty(maliciousArray, "push", {
        value: function maliciousPush(this: string[], val: string) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (Array.prototype as any).polluted = true;
          return Array.prototype.push.call(this, val);
        },
      });

      const result = insane("<div><span>test</span></div>", {
        allowedTags: maliciousArray,
      });
      expect(result).toBe("<div><span>test</span></div>");
    });
  });

  describe("Symbol-based pollution attempts", () => {
    it("handles Symbol.iterator attempts", () => {
      // Some pollution attempts use Symbol properties
      const input = "<div>test</div>";
      const result = insane(input);
      expect(result).toBe("<div>test</div>");

      // Basic check that iterators still work
      expect(result.split("")).toEqual(input.split(""));
    });
  });

  describe("Frozen/Sealed prototype protection", () => {
    it("works correctly with frozen Object.prototype", () => {
      // Note: We don't actually freeze in this test as it would affect other tests
      // But we verify the sanitizer doesn't rely on modifying prototypes
      const input = '<div onclick="alert(1)">test</div>';
      const result = insane(input);
      expect(result).toBe("<div>test</div>");
    });
  });

  describe("Edge cases with prototype-like strings", () => {
    it("handles __proto__ in text content safely", () => {
      const input = "<div>__proto__</div>";
      const result = insane(input);
      expect(result).toBe("<div>__proto__</div>");
    });

    it("handles constructor in text content safely", () => {
      const input = "<div>constructor</div>";
      const result = insane(input);
      expect(result).toBe("<div>constructor</div>");
    });

    it("handles prototype chain keywords in attribute values", () => {
      const input = '<div title="__proto__.polluted = true">test</div>';
      const result = insane(input, { allowedAttributes: { div: ["title"] } });
      expect(result).toContain("__proto__.polluted = true");

      // But it shouldn't actually pollute
      expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
    });
  });
});
