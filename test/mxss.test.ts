import { describe, it, expect } from "vitest";
import insane from "../src/index.js";

/**
 * Mutation XSS (mXSS) Security Tests
 *
 * Mutation XSS occurs when the browser's HTML parser "mutates" or transforms
 * seemingly safe HTML into dangerous HTML during the parsing/serialization process.
 * This can happen due to:
 *
 * 1. Backtick parsing differences
 * 2. Entity handling differences
 * 3. Tag balancing/nesting normalization
 * 4. Namespace confusion (SVG/MathML in HTML)
 * 5. innerHTML/textContent differences
 *
 * These tests verify that potential mXSS vectors are properly handled.
 */
describe("Mutation XSS Prevention", () => {
  describe("Backtick-based mXSS", () => {
    it("handles backticks in attribute values by normalizing to quoted", () => {
      // Backticks without quotes are parsed, value extracted, and re-quoted properly
      const input = "<div title=`xss`>content</div>";
      const result = insane(input, { allowedAttributes: { div: ["title"] } });
      // The parser extracts the value and re-serializes with proper quotes
      expect(result).toContain("title=");
      expect(result).toContain("content");
    });

    it("handles backticks in href", () => {
      const input = "<a href=`javascript:alert(1)`>x</a>";
      const result = insane(input);
      expect(result).not.toContain("javascript");
    });

    it("handles backticks with event handlers", () => {
      const input = "<div onclick=`alert(1)`>x</div>";
      const result = insane(input);
      expect(result).not.toContain("onclick");
      expect(result).not.toContain("alert");
    });
  });

  describe("Entity-based mXSS", () => {
    it("handles double-encoded entities", () => {
      // &amp;lt; should not become <script>
      const input = "<div>&amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt;</div>";
      const result = insane(input);
      expect(result).not.toContain("<script>");
    });

    it("handles mixed entity encoding", () => {
      const input =
        '<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;alert(1)">x</a>';
      const result = insane(input);
      expect(result).not.toContain("javascript");
    });

    it("handles hex-encoded entities in attributes", () => {
      const input =
        '<a href="&#x6a;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;&#x3a;alert(1)">x</a>';
      const result = insane(input);
      expect(result).not.toContain("javascript");
    });

    it("handles null bytes in entities", () => {
      const input = '<a href="java&#0;script:alert(1)">x</a>';
      const result = insane(input);
      expect(result).not.toContain("script");
    });

    it("handles oversized numeric entities", () => {
      // Very large numeric entities can cause issues
      const input = "<div>&#999999999999;</div>";
      const result = insane(input);
      // Should handle gracefully without crashing
      expect(typeof result).toBe("string");
    });
  });

  describe("Tag balancing mXSS", () => {
    it("handles unclosed tags that could form dangerous combinations", () => {
      // <form><form> can cause weird behavior in browsers
      const input = '<form><form action="evil">';
      const result = insane(input);
      expect(result).not.toContain("form");
    });

    it("handles misnested formatting elements safely", () => {
      // The adoption agency algorithm can cause mutations in browsers
      // But sanitizer just passes through allowed tags
      const input = "<p><b><p>text</b></p>";
      const result = insane(input);
      // Sanitizer allows these tags, content is preserved
      expect(result).toContain("text");
      // No script injection possible
      expect(result).not.toContain("script");
    });

    it("handles unclosed script-like tags", () => {
      const input = "<style><div></style><script>alert(1)</script>";
      const result = insane(input);
      expect(result).not.toContain("script");
      expect(result).not.toContain("alert");
    });

    it("allows table elements (in default allowlist)", () => {
      // Tables are allowed by default
      const input = "<table>text<tr><td>cell</td></tr></table>";
      const result = insane(input);
      expect(result).toContain("<table>");
      expect(result).toContain("<td>cell</td>");
    });

    it("strips table elements when not allowed", () => {
      const input = "<table>text<tr><td>cell</td></tr></table>";
      const result = insane(input, { allowedTags: ["div"] });
      expect(result).not.toContain("<table>");
    });

    it("handles select element text content", () => {
      // Content in select outside of option/optgroup behaves oddly
      const input = "<select><script>alert(1)</script></select>";
      const result = insane(input);
      expect(result).not.toContain("script");
    });
  });

  describe("Namespace confusion mXSS", () => {
    it("handles SVG in HTML context", () => {
      // SVG can have different parsing rules
      const input = "<svg><desc><script>alert(1)</script></desc></svg>";
      const result = insane(input);
      expect(result).not.toContain("script");
    });

    it("handles MathML in HTML context", () => {
      const input = "<math><annotation-xml><script>alert(1)</script></annotation-xml></math>";
      const result = insane(input);
      expect(result).not.toContain("script");
    });

    it("handles SVG foreignObject escaping", () => {
      // foreignObject allows HTML content inside SVG
      const input = '<svg><foreignObject><body onload="alert(1)"></body></foreignObject></svg>';
      const result = insane(input);
      expect(result).not.toContain("onload");
      expect(result).not.toContain("alert");
    });

    it("handles MathML mtext escaping", () => {
      const input = "<math><mtext><script>alert(1)</script></mtext></math>";
      const result = insane(input);
      expect(result).not.toContain("script");
    });

    it("handles namespace inheritance attacks", () => {
      // Elements inside SVG inherit the SVG namespace
      const input = "<svg><title><style><img src=x onerror=alert(1)></style></title></svg>";
      const result = insane(input);
      expect(result).not.toContain("onerror");
    });
  });

  describe("CDATA and comment mXSS", () => {
    it("handles CDATA sections", () => {
      // CDATA is only valid in XML/XHTML
      const input = "<![CDATA[<script>alert(1)</script>]]>";
      const result = insane(input);
      expect(result).not.toContain("script");
    });

    it("handles comment-like content in attributes", () => {
      const input = '<div title="--><script>alert(1)</script><!--">x</div>';
      const result = insane(input, { allowedAttributes: { div: ["title"] } });
      expect(result).not.toContain("</script>");
    });

    it("handles nested comments", () => {
      // Nested comments can cause parsing issues
      const input = "<!-- outer <!-- inner --> --><script>alert(1)</script><!-- end -->";
      const result = insane(input);
      expect(result).not.toContain("script");
    });

    it("handles conditional comments (IE)", () => {
      const input = "<!--[if IE]><script>alert(1)</script><![endif]-->";
      const result = insane(input);
      expect(result).not.toContain("script");
    });
  });

  describe("Attribute mutation mXSS", () => {
    it("handles attributes with unbalanced quotes", () => {
      const input = "<div title=\"value'>x</div>";
      const result = insane(input, { allowedAttributes: { div: ["title"] } });
      // Should handle without creating dangerous output
      expect(typeof result).toBe("string");
    });

    it("handles attributes with HTML inside by escaping", () => {
      const input = '<div title="<script>alert(1)</script>">x</div>';
      const result = insane(input, { allowedAttributes: { div: ["title"] } });
      // The < inside the attribute value is escaped
      expect(result).toContain("&lt;script");
      // No actual script tag in output
      expect(result).not.toContain("><script>");
    });

    it("handles newlines in attribute values", () => {
      const input = '<a href="java\nscript:alert(1)">x</a>';
      const result = insane(input);
      expect(result).not.toContain("javascript");
    });

    it("handles tabs in attribute values", () => {
      const input = '<a href="java\tscript:alert(1)">x</a>';
      const result = insane(input);
      expect(result).not.toContain("javascript");
    });

    it("handles carriage returns in attribute values", () => {
      const input = '<a href="java\rscript:alert(1)">x</a>';
      const result = insane(input);
      expect(result).not.toContain("javascript");
    });
  });

  describe("Parser differential mXSS", () => {
    it("handles noscript content", () => {
      // noscript content is parsed differently in scripting vs non-scripting contexts
      const input = "<noscript><script>alert(1)</script></noscript>";
      const result = insane(input);
      expect(result).not.toContain("script");
    });

    it("handles textarea content", () => {
      // Textarea content is RCDATA
      const input = "<textarea><script>alert(1)</script></textarea>";
      const result = insane(input);
      expect(result).not.toContain("<script>");
    });

    it("handles title content", () => {
      // Title content is RCDATA
      const input = "<title><script>alert(1)</script></title>";
      const result = insane(input);
      expect(result).not.toContain("<script>");
    });

    it("handles XMP content (deprecated)", () => {
      const input = "<xmp><script>alert(1)</script></xmp>";
      const result = insane(input);
      expect(result).not.toContain("<script>");
    });

    it("handles plaintext element", () => {
      const input = "<plaintext><script>alert(1)</script>";
      const result = insane(input);
      expect(result).not.toContain("<script>");
    });
  });

  describe("innerHTML vs textContent mXSS", () => {
    it("handles content that looks like HTML in text nodes", () => {
      const input = "<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>";
      const result = insane(input);
      // The entities should remain escaped
      expect(result).toContain("&lt;script&gt;");
      expect(result).not.toContain("<script>");
    });

    it("handles mixed text and element content", () => {
      const input = "<div>before &lt;script&gt; <span>middle</span> after</div>";
      const result = insane(input);
      expect(result).toContain("&lt;script&gt;");
      expect(result).not.toContain("<script>");
    });
  });

  describe("Unicode normalization mXSS", () => {
    it("handles Unicode variation selectors", () => {
      // U+FE00-FE0F are variation selectors
      const input = '<a href="javascript\uFE00:alert(1)">x</a>';
      const result = insane(input);
      expect(result).not.toContain("alert");
    });

    it("handles right-to-left override characters", () => {
      // RTL override can visually hide malicious content
      const input = "<div>\u202Escript\u202C</div>";
      const result = insane(input);
      // Should handle RTL control characters
      expect(typeof result).toBe("string");
    });

    it("handles zero-width characters", () => {
      // Zero-width characters can break keyword matching
      const input = '<a href="java\u200Bscript:alert(1)">x</a>';
      const result = insane(input);
      // The URL should be stripped as it contains javascript:
      expect(result).not.toContain("javascript");
    });

    it("handles confusable characters", () => {
      // Some Unicode chars look like ASCII but are different
      // U+FF1A is fullwidth colon, looks like :
      const input = '<a href="javascript\uFF1Aalert(1)">x</a>';
      const result = insane(input);
      // Should be treated as safe href (not javascript: scheme)
      expect(result).toContain("href");
    });
  });

  describe("Encoding edge cases", () => {
    it("handles invalid UTF-8 sequences", () => {
      // Invalid UTF-8 can cause parsing issues
      const input = "<div>\xFF\xFE</div>";
      const result = insane(input);
      expect(typeof result).toBe("string");
    });

    it("handles BOM characters", () => {
      // Byte Order Mark can interfere with parsing
      const input = "\uFEFF<script>alert(1)</script>";
      const result = insane(input);
      expect(result).not.toContain("script");
    });

    it("handles replacement characters", () => {
      const input = "<div>\uFFFD</div>";
      const result = insane(input);
      expect(result).toBe("<div>\uFFFD</div>");
    });
  });

  describe("Triple-rendering mXSS", () => {
    it("handles content safe at each rendering stage", () => {
      // Content that becomes dangerous after multiple parse/serialize cycles
      const input =
        "<div>&amp;amp;lt;script&amp;amp;gt;alert(1)&amp;amp;lt;/script&amp;amp;gt;</div>";
      const result = insane(input);
      // Should remain safe
      expect(result).not.toContain("<script>");
    });
  });
});
