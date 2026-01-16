import { describe, it, expect } from "vitest";
import insane from "../src/index.js";

/**
 * Nested and Recursive Attack Tests
 * These tests verify that nested/recursive attack patterns are handled safely
 */
describe("Nested and Recursive Attacks", () => {
  describe("nested disallowed tags", () => {
    it("strips nested script tags", () => {
      expect(insane("<div><script><script>alert(1)</script></script></div>")).toBe("<div></div>");
    });

    it("strips script inside allowed tags", () => {
      expect(insane("<p><script>alert(1)</script>text</p>")).toBe("<p>text</p>");
    });

    it("strips deeply nested disallowed tags", () => {
      expect(insane("<div><p><span><script>alert(1)</script></span></p></div>")).toBe(
        "<div><p><span></span></p></div>",
      );
    });
  });

  describe("disallowed tags wrapping allowed tags", () => {
    it("strips outer disallowed tag but keeps inner allowed content", () => {
      // script wrapping div - script content is ignored
      expect(insane("<script><div>visible</div></script>")).toBe("");
    });

    it("strips style wrapping allowed content", () => {
      expect(insane("<style><div>visible</div></style>")).toBe("");
    });
  });

  describe("mixed nesting", () => {
    it("handles allowed and disallowed tags interleaved", () => {
      expect(insane("<div><script>bad</script><p>good</p><style>bad</style></div>")).toBe(
        "<div><p>good</p></div>",
      );
    });

    it("handles multiple levels of mixed nesting", () => {
      const html = "<div><p><script>x</script>text<span>more</span></p></div>";
      const result = insane(html);
      expect(result).toBe("<div><p>text<span>more</span></p></div>");
    });
  });

  describe("self-referential nesting", () => {
    it("handles same tag nested", () => {
      expect(insane("<div><div><div>deep</div></div></div>")).toBe(
        "<div><div><div>deep</div></div></div>",
      );
    });

    it("handles same disallowed tag nested", () => {
      expect(insane("<script><script><script>x</script></script></script>")).toBe("");
    });
  });

  describe("attribute-based nesting attacks", () => {
    it("handles attributes containing tag-like content", () => {
      const result = insane('<div title="<script>">x</div>');
      expect(result).not.toMatch(/<script>/i);
    });

    it("handles attributes with nested quotes", () => {
      const result = insane('<div title="a \\"quoted\\" value">x</div>');
      expect(result).toContain("div");
    });
  });

  describe("filter function with nesting", () => {
    it("filter applies to each tag individually", () => {
      let count = 0;
      const filter = () => {
        count++;
        return true;
      };

      insane(
        "<div><span><p>text</p></span></div>",
        {
          allowedTags: ["div", "span", "p"],
          filter,
        },
        true,
      );

      expect(count).toBe(3);
    });

    it("filter blocking outer tag blocks inner content", () => {
      const result = insane(
        "<div><span>inner</span></div>",
        {
          allowedTags: ["div", "span"],
          filter: (token) => token.tag !== "div",
        },
        true,
      );

      expect(result).toBe("");
    });
  });

  describe("void elements in nesting", () => {
    it("handles void elements correctly", () => {
      expect(insane("<div><br><p>text</p><hr></div>")).toBe("<div><br/><p>text</p><hr/></div>");
    });

    it("void elements cannot contain content", () => {
      expect(insane("<br>content</br>")).toBe("<br/>content");
    });

    it("img tags are self-closing", () => {
      expect(insane('<div><img src="x">text</div>')).toBe('<div><img src="x"/>text</div>');
    });
  });

  describe("recursion depth", () => {
    it("handles extreme nesting without stack overflow", () => {
      let html = "";
      const depth = 500;
      for (let i = 0; i < depth; i++) {
        html += "<div>";
      }
      html += "content";
      for (let i = 0; i < depth; i++) {
        html += "</div>";
      }

      const start = performance.now();
      const result = insane(html);
      const elapsed = performance.now() - start;

      expect(result).toContain("content");
      expect(elapsed).toBeLessThan(500);
    });

    it("handles extreme sibling count", () => {
      let html = "<div>";
      for (let i = 0; i < 1000; i++) {
        html += "<span>x</span>";
      }
      html += "</div>";

      const start = performance.now();
      const result = insane(html);
      const elapsed = performance.now() - start;

      expect(result).toContain("span");
      expect(elapsed).toBeLessThan(500);
    });
  });
});
