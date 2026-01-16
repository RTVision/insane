import { describe, it, expect } from "vitest";
import insane from "../src/index.js";

/**
 * Malformed HTML Tests
 * These tests verify that the parser handles malformed HTML safely
 */
describe("Malformed HTML Handling", () => {
  describe("unclosed tags", () => {
    it("handles unclosed tags", () => {
      expect(insane("<div>text")).toBe("<div>text</div>");
      expect(insane("<div><span>text")).toBe("<div><span>text</span></div>");
    });

    it("handles multiple unclosed tags", () => {
      expect(insane("<div><p><span>text")).toBe("<div><p><span>text</span></p></div>");
    });

    it("handles unclosed void elements", () => {
      expect(insane("<br")).toBe("");
      expect(insane('<img src="x"')).toBe("");
    });
  });

  describe("mismatched tags", () => {
    it("handles mismatched closing tags", () => {
      expect(insane("<div></span>")).toBe("<div></div>");
      expect(insane("<div></p>")).toBe("<div></div>");
    });

    it("handles reversed nesting", () => {
      expect(insane("<div><span></div></span>")).toBe("<div><span></span></div>");
    });
  });

  describe("invalid tag names", () => {
    it("handles numbers in tag names", () => {
      // Tags starting with numbers are not valid HTML and are discarded
      const result = insane("<1div>text</1div>");
      // The parser discards invalid tags
      expect(result).toBe("");
    });

    it("handles special characters in tag names", () => {
      // Tags with @ are parsed but not allowed by default
      const result = insane("<div@>text</div@>");
      // div@ is parsed but not in allowedTags, so it's stripped
      // The parser sees 'div' as the tag name due to regex matching
      expect(result).toBe("<div>text</div>");
    });

    it("handles double angle brackets", () => {
      // Double angle brackets create invalid HTML
      // The first < starts a tag, the second < terminates it as invalid
      const result = insane("<<div>>text<</div>>");
      // Either the parser strips everything or handles gracefully
      expect(typeof result).toBe("string");
    });
  });

  describe("broken attributes", () => {
    it("handles attributes without values", () => {
      expect(
        insane(
          "<div disabled readonly>text</div>",
          {
            allowedTags: ["div"],
            allowedAttributes: { div: ["disabled", "readonly"] },
          },
          true,
        ),
      ).toBe("<div disabled readonly>text</div>");
    });

    it("handles attributes with empty values", () => {
      expect(
        insane(
          '<div class="">text</div>',
          {
            allowedTags: ["div"],
            allowedAttributes: { div: ["class"] },
          },
          true,
        ),
      ).toBe('<div class="">text</div>');
    });

    it("handles attributes without quotes", () => {
      expect(
        insane(
          "<div class=foo>text</div>",
          {
            allowedTags: ["div"],
            allowedAttributes: { div: ["class"] },
          },
          true,
        ),
      ).toBe('<div class="foo">text</div>');
    });

    it("handles attributes with single quotes", () => {
      expect(
        insane(
          "<div class='foo bar'>text</div>",
          {
            allowedTags: ["div"],
            allowedAttributes: { div: ["class"] },
          },
          true,
        ),
      ).toBe('<div class="foo bar">text</div>');
    });

    it("handles malformed attribute syntax", () => {
      // These should not crash
      expect(insane('<div ="value">text</div>')).toBe("<div>text</div>");
      expect(insane("<div =value>text</div>")).toBe("<div>text</div>");
      expect(insane("<div class=>text</div>")).toBe("<div>text</div>");
    });
  });

  describe("comments", () => {
    it("removes HTML comments", () => {
      expect(insane("<!-- comment --><div>text</div>")).toBe("<div>text</div>");
      expect(insane("<div><!-- comment -->text</div>")).toBe("<div>text</div>");
      expect(insane("<div>text<!-- comment --></div>")).toBe("<div>text</div>");
    });

    it("handles unclosed comments", () => {
      expect(insane("<!-- unclosed comment")).toBe("");
      expect(insane("<div>text<!-- unclosed")).toBe("<div>text</div>");
    });

    it("handles nested comment-like content", () => {
      expect(insane("<!-- outer <!-- inner --> -->")).toBe(" -->");
    });

    it("handles comments with dashes", () => {
      expect(insane("<!-- -- -->")).toBe("");
      expect(insane("<!---->")).toBe("");
    });
  });

  describe("CDATA sections", () => {
    it("treats CDATA as text", () => {
      const result = insane("<![CDATA[content]]>");
      expect(result).not.toContain("CDATA");
    });
  });

  describe("DOCTYPE", () => {
    it("handles DOCTYPE declarations without crashing", () => {
      // DOCTYPE looks like a tag to the parser
      // It should be handled gracefully without crashing
      const result = insane("<!DOCTYPE html><div>text</div>");
      // Result may vary - the important thing is no crash and it's a string
      expect(typeof result).toBe("string");
    });
  });

  describe("null bytes and control characters", () => {
    it("handles null bytes in content", () => {
      const result = insane("<div>te\x00xt</div>");
      expect(result).toContain("div");
    });

    it("handles null bytes in attributes", () => {
      const result = insane('<div class="fo\x00o">text</div>', {
        allowedAttributes: { div: ["class"] },
      });
      expect(result).toContain("div");
    });

    it("handles control characters", () => {
      const result = insane("<div>te\x01\x02\x03xt</div>");
      expect(result).toContain("div");
    });
  });

  describe("deeply nested tags", () => {
    it("handles reasonable nesting depth", () => {
      let html = "";
      for (let i = 0; i < 100; i++) {
        html += "<div>";
      }
      html += "content";
      for (let i = 0; i < 100; i++) {
        html += "</div>";
      }

      const start = performance.now();
      const result = insane(html);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
      expect(result).toContain("content");
    });
  });

  describe("empty and whitespace", () => {
    it("handles empty string", () => {
      expect(insane("")).toBe("");
    });

    it("handles whitespace only", () => {
      expect(insane("   \n\t  ")).toBe("   \n\t  ");
    });

    it("handles empty tags", () => {
      expect(insane("<div></div>")).toBe("<div></div>");
      expect(insane("<span></span>")).toBe("<span></span>");
    });
  });

  describe("script-like content in text", () => {
    it("preserves script-like text content", () => {
      expect(insane("<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>")).toBe(
        "<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>",
      );
    });
  });
});
