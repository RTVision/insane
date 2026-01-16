import { describe, it, expect } from "vitest";
import insane from "../src/index.js";

/**
 * HTML Entity and Encoding Tests
 * These tests verify that encoding-based bypasses are prevented
 */
describe("Encoding and Entity Handling", () => {
  describe("HTML entities in text", () => {
    it("preserves HTML entities in text content", () => {
      expect(insane("<div>&lt;script&gt;</div>")).toBe("<div>&lt;script&gt;</div>");
      expect(insane("<div>&amp;lt;</div>")).toBe("<div>&amp;lt;</div>");
    });

    it("preserves named entities", () => {
      expect(insane("<div>&nbsp;&copy;&reg;</div>")).toBe("<div>&nbsp;&copy;&reg;</div>");
    });

    it("preserves numeric entities", () => {
      expect(insane("<div>&#60;&#62;</div>")).toBe("<div>&#60;&#62;</div>");
    });

    it("preserves hex entities", () => {
      expect(insane("<div>&#x3C;&#x3E;</div>")).toBe("<div>&#x3C;&#x3E;</div>");
    });
  });

  describe("HTML entities in attributes", () => {
    it("decodes entities in attribute values", () => {
      // Entities in attributes should be decoded for processing
      const result = insane('<a href="http://example.com?a=1&amp;b=2">x</a>');
      expect(result).toContain("href=");
    });

    it("encodes special chars in output attributes", () => {
      // When outputting, special chars should be encoded
      const result = insane('<div title="a &amp; b">x</div>');
      expect(result).toContain("&amp;");
    });

    it("handles encoded quotes in attributes", () => {
      const result = insane('<div title="say &quot;hello&quot;">x</div>');
      expect(result).toContain("title=");
    });
  });

  describe("entity-based XSS bypasses", () => {
    it("blocks javascript with entity-encoded colon", () => {
      // javascript&#58;alert(1) -> javascript:alert(1)
      expect(insane('<a href="javascript&#58;alert(1)">x</a>')).toBe("<a>x</a>");
      expect(insane('<a href="javascript&#x3a;alert(1)">x</a>')).toBe("<a>x</a>");
    });

    it("blocks javascript with entity-encoded j", () => {
      // &#106;avascript -> javascript
      expect(insane('<a href="&#106;avascript:alert(1)">x</a>')).toBe("<a>x</a>");
      expect(insane('<a href="&#x6a;avascript:alert(1)">x</a>')).toBe("<a>x</a>");
    });

    it("blocks fully entity-encoded javascript", () => {
      // &#x6a;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;&#x3a; -> javascript:
      expect(
        insane(
          '<a href="&#x6a;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;&#x3a;alert(1)">x</a>',
        ),
      ).toBe("<a>x</a>");
    });

    it("blocks data URI with entity encoding", () => {
      expect(insane('<a href="&#100;&#97;&#116;&#97;:text/html,evil">x</a>')).toBe("<a>x</a>");
    });
  });

  describe("Unicode handling", () => {
    it("preserves unicode text", () => {
      expect(insane("<div>日本語 中文 한국어</div>")).toBe("<div>日本語 中文 한국어</div>");
    });

    it("preserves unicode in attributes", () => {
      expect(insane('<div title="日本語">x</div>')).toContain("日本語");
    });

    it("handles emoji", () => {
      expect(insane("<div>Hello 👋 World 🌍</div>")).toContain("👋");
    });
  });

  describe("mixed content", () => {
    it("handles mixed entities and text", () => {
      expect(insane("<div>Hello &amp; World</div>")).toBe("<div>Hello &amp; World</div>");
    });

    it("handles entities at boundaries", () => {
      expect(insane("&lt;div&gt;")).toBe("&lt;div&gt;");
      expect(insane("<div>&lt;</div>")).toBe("<div>&lt;</div>");
    });
  });

  describe("double encoding prevention", () => {
    it("does not double-encode already encoded content", () => {
      const result = insane("<div>&amp;lt;</div>");
      // Should preserve as-is, not become &amp;amp;lt;
      expect(result).toBe("<div>&amp;lt;</div>");
    });
  });
});
