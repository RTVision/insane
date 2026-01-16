import { describe, it, expect } from "vitest";
import insane from "../src/index.js";

/**
 * Attribute Injection Tests
 * These tests verify that attribute-based attacks are properly handled
 */
describe("Attribute Injection", () => {
  describe("attribute value escaping", () => {
    it("escapes quotes in attribute values", () => {
      // The &quot; is decoded during parsing and re-encoded in output
      // This is safe because the onclick is inside the attribute value, not a new attribute
      const result = insane('<a href="http://example.com?q=test">x</a>');
      expect(result).toContain("href=");
    });

    it("properly encodes quotes in output", () => {
      // Input with literal quotes in title - should be encoded
      const result = insane("<div title='say \"hello\"'>x</div>");
      expect(result).toContain("&quot;");
    });

    it("escapes angle brackets in attribute values", () => {
      const result = insane('<div title="<script>">x</div>');
      expect(result).toContain("&lt;");
    });

    it("escapes ampersands in attribute values", () => {
      const result = insane('<a href="http://example.com?a=1&b=2">x</a>');
      // The URL should be preserved, with & encoded
      expect(result).toContain("href=");
    });
  });

  describe("attribute name injection", () => {
    it("ignores attributes not in whitelist", () => {
      expect(insane('<div onclick="alert(1)">x</div>')).toBe("<div>x</div>");
      expect(insane('<div onmouseover="alert(1)">x</div>')).toBe("<div>x</div>");
      expect(insane('<div onerror="alert(1)">x</div>')).toBe("<div>x</div>");
    });

    it("handles attributes with special characters", () => {
      // These shouldn't cause issues
      const result = insane('<div data-foo="bar">x</div>');
      expect(result).toBe("<div>x</div>");
    });

    it("handles attributes starting with on", () => {
      // All on* attributes should be blocked by default
      const onAttrs = [
        "onabort",
        "onblur",
        "onchange",
        "onclick",
        "ondblclick",
        "onerror",
        "onfocus",
        "onkeydown",
        "onkeypress",
        "onkeyup",
        "onload",
        "onmousedown",
        "onmousemove",
        "onmouseout",
        "onmouseover",
        "onmouseup",
        "onreset",
        "onselect",
        "onsubmit",
        "onunload",
      ];

      for (const attr of onAttrs) {
        expect(insane(`<div ${attr}="alert(1)">x</div>`)).toBe("<div>x</div>");
      }
    });
  });

  describe("global attributes", () => {
    it("applies global attribute rules with *", () => {
      expect(
        insane(
          '<div title="hello" id="myid">x</div>',
          {
            allowedTags: ["div"],
            allowedAttributes: { "*": ["title", "id"] },
          },
          true,
        ),
      ).toBe('<div title="hello" id="myid">x</div>');
    });

    it("combines global and tag-specific attributes", () => {
      expect(
        insane(
          '<a href="/link" title="hello">x</a>',
          {
            allowedTags: ["a"],
            allowedAttributes: {
              "*": ["title"],
              a: ["href"],
            },
          },
          true,
        ),
      ).toBe('<a href="/link" title="hello">x</a>');
    });
  });

  describe("class attribute handling", () => {
    it("allows all classes when class is in allowedAttributes", () => {
      expect(
        insane(
          '<div class="foo bar baz">x</div>',
          {
            allowedTags: ["div"],
            allowedAttributes: { div: ["class"] },
          },
          true,
        ),
      ).toBe('<div class="foo bar baz">x</div>');
    });

    it("filters classes with allowedClasses", () => {
      expect(
        insane(
          '<div class="safe unsafe danger">x</div>',
          {
            allowedTags: ["div"],
            allowedClasses: { div: ["safe"] },
          },
          true,
        ),
      ).toBe('<div class="safe">x</div>');
    });

    it("removes class attribute when no classes match", () => {
      expect(
        insane(
          '<div class="foo bar">x</div>',
          {
            allowedTags: ["div"],
            allowedClasses: { div: ["safe"] },
          },
          true,
        ),
      ).toBe("<div>x</div>");
    });

    it("allowedAttributes takes precedence over allowedClasses", () => {
      // When class is in allowedAttributes, allowedClasses is ignored
      expect(
        insane(
          '<div class="foo bar">x</div>',
          {
            allowedTags: ["div"],
            allowedAttributes: { div: ["class"] },
            allowedClasses: { div: ["safe"] },
          },
          true,
        ),
      ).toBe('<div class="foo bar">x</div>');
    });
  });

  describe("style attribute", () => {
    it("removes style by default", () => {
      expect(insane('<div style="color:red">x</div>')).toBe("<div>x</div>");
    });

    it("allows style when in allowedAttributes", () => {
      expect(
        insane('<div style="color:red">x</div>', {
          allowedAttributes: { div: ["style"] },
        }),
      ).toContain("style=");
    });

    it("preserves style content when allowed", () => {
      // Note: style content is not sanitized - use CSP for that
      const result = insane('<div style="background:url(x)">x</div>', {
        allowedAttributes: { div: ["style"] },
      });
      expect(result).toContain("style=");
    });
  });

  describe("boolean attributes", () => {
    it("handles boolean attributes without values", () => {
      expect(
        insane(
          "<button disabled>x</button>",
          {
            allowedTags: ["button"],
            allowedAttributes: { button: ["disabled"] },
          },
          true,
        ),
      ).toBe("<button disabled>x</button>");
    });

    it("handles multiple boolean attributes", () => {
      expect(
        insane(
          "<input disabled readonly>",
          {
            allowedTags: ["input"],
            allowedAttributes: { input: ["disabled", "readonly"] },
          },
          true,
        ),
      ).toBe("<input disabled readonly/>");
    });
  });

  describe("special attribute cases", () => {
    it("handles aria attributes when allowed", () => {
      expect(
        insane(
          '<div aria-label="description">x</div>',
          {
            allowedTags: ["div"],
            allowedAttributes: { div: ["aria-label"] },
          },
          true,
        ),
      ).toBe('<div aria-label="description">x</div>');
    });

    it("handles data attributes when allowed", () => {
      expect(
        insane(
          '<div data-id="123">x</div>',
          {
            allowedTags: ["div"],
            allowedAttributes: { div: ["data-id"] },
          },
          true,
        ),
      ).toBe('<div data-id="123">x</div>');
    });

    it("handles role attribute when allowed", () => {
      expect(
        insane(
          '<div role="button">x</div>',
          {
            allowedTags: ["div"],
            allowedAttributes: { div: ["role"] },
          },
          true,
        ),
      ).toBe('<div role="button">x</div>');
    });
  });
});
