import { describe, it, expect } from "vitest";
import insane from "../src/index.js";

/**
 * URL Scheme Injection Tests
 * These tests verify that URL scheme validation is properly enforced
 */
describe("URL Scheme Validation", () => {
  describe("allowed schemes", () => {
    it("allows http URLs", () => {
      expect(insane('<a href="http://example.com">x</a>')).toBe(
        '<a href="http://example.com">x</a>',
      );
    });

    it("allows https URLs", () => {
      expect(insane('<a href="https://example.com">x</a>')).toBe(
        '<a href="https://example.com">x</a>',
      );
    });

    it("allows mailto URLs", () => {
      expect(insane('<a href="mailto:test@example.com">x</a>')).toBe(
        '<a href="mailto:test@example.com">x</a>',
      );
    });

    it("allows relative URLs", () => {
      expect(insane('<a href="/path/to/page">x</a>')).toBe('<a href="/path/to/page">x</a>');
      expect(insane('<a href="path/to/page">x</a>')).toBe('<a href="path/to/page">x</a>');
      expect(insane('<a href="./relative">x</a>')).toBe('<a href="./relative">x</a>');
      expect(insane('<a href="../parent">x</a>')).toBe('<a href="../parent">x</a>');
    });

    it("allows fragment URLs", () => {
      expect(insane('<a href="#section">x</a>')).toBe('<a href="#section">x</a>');
      expect(insane('<a href="#top">x</a>')).toBe('<a href="#top">x</a>');
    });

    it("allows query string URLs", () => {
      expect(insane('<a href="?foo=bar">x</a>')).toBe('<a href="?foo=bar">x</a>');
    });
  });

  describe("blocked schemes", () => {
    it("blocks javascript URLs", () => {
      expect(insane('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
    });

    it("blocks javascript URLs with case variations", () => {
      expect(insane('<a href="JAVASCRIPT:alert(1)">x</a>')).toBe("<a>x</a>");
      expect(insane('<a href="JavaScript:alert(1)">x</a>')).toBe("<a>x</a>");
      expect(insane('<a href="jAvAsCrIpT:alert(1)">x</a>')).toBe("<a>x</a>");
    });

    it("blocks vbscript URLs", () => {
      expect(insane('<a href="vbscript:msgbox(1)">x</a>')).toBe("<a>x</a>");
      expect(insane('<a href="VBSCRIPT:msgbox(1)">x</a>')).toBe("<a>x</a>");
    });

    it("blocks data URLs", () => {
      expect(insane('<a href="data:text/html,evil">x</a>')).toBe("<a>x</a>");
      expect(insane('<a href="DATA:text/html,evil">x</a>')).toBe("<a>x</a>");
    });

    it("blocks file URLs", () => {
      expect(insane('<a href="file:///etc/passwd">x</a>')).toBe("<a>x</a>");
    });

    it("blocks ftp URLs by default", () => {
      expect(insane('<a href="ftp://example.com/file">x</a>')).toBe("<a>x</a>");
    });

    it("blocks magnet URLs", () => {
      expect(insane('<a href="magnet:?xt=urn:btih:abc123">x</a>')).toBe("<a>x</a>");
    });

    it("blocks tel URLs by default", () => {
      expect(insane('<a href="tel:+1234567890">x</a>')).toBe("<a>x</a>");
    });

    it("blocks custom protocol URLs", () => {
      expect(insane('<a href="myapp://open">x</a>')).toBe("<a>x</a>");
      expect(insane('<a href="slack://channel">x</a>')).toBe("<a>x</a>");
    });
  });

  describe("custom allowed schemes", () => {
    it("allows custom schemes when specified", () => {
      expect(
        insane('<a href="tel:+1234567890">x</a>', {
          allowedSchemes: ["http", "https", "tel"],
        }),
      ).toBe('<a href="tel:+1234567890">x</a>');
    });

    it("allows ftp when specified", () => {
      expect(
        insane('<a href="ftp://example.com">x</a>', {
          allowedSchemes: ["http", "https", "ftp"],
        }),
      ).toBe('<a href="ftp://example.com">x</a>');
    });

    it("blocks http when not in custom list", () => {
      // In strict mode with custom allowedSchemes, http is blocked
      // Need to also specify allowedTags for the tag to appear
      expect(
        insane(
          '<a href="http://example.com">x</a>',
          {
            allowedTags: ["a"],
            allowedAttributes: { a: ["href"] },
            allowedSchemes: ["https"],
          },
          true,
        ),
      ).toBe("<a>x</a>");
    });
  });

  describe("scheme edge cases", () => {
    it("handles URLs with ports", () => {
      expect(insane('<a href="http://example.com:8080">x</a>')).toBe(
        '<a href="http://example.com:8080">x</a>',
      );
    });

    it("handles URLs with auth", () => {
      expect(insane('<a href="http://user:pass@example.com">x</a>')).toBe(
        '<a href="http://user:pass@example.com">x</a>',
      );
    });

    it("handles URLs with colon in query string", () => {
      expect(insane('<a href="http://example.com?time=12:30">x</a>')).toBe(
        '<a href="http://example.com?time=12:30">x</a>',
      );
    });

    it("handles URLs with colon in fragment", () => {
      expect(insane('<a href="http://example.com#section:1">x</a>')).toBe(
        '<a href="http://example.com#section:1">x</a>',
      );
    });

    it("handles empty href", () => {
      expect(insane('<a href="">x</a>')).toBe('<a href="">x</a>');
    });

    it("handles whitespace in URLs", () => {
      // Leading whitespace before scheme is suspicious
      expect(insane('<a href="  javascript:alert(1)">x</a>')).toBe("<a>x</a>");
    });
  });

  describe("URI attributes", () => {
    it("validates src attributes", () => {
      expect(insane('<img src="javascript:alert(1)">')).toBe("<img/>");
      expect(insane('<img src="http://example.com/img.png">')).toBe(
        '<img src="http://example.com/img.png"/>',
      );
    });

    it("validates background attributes", () => {
      // background is not in default allowed attributes
      expect(
        insane('<div background="javascript:alert(1)">x</div>', {
          allowedAttributes: { div: ["background"] },
        }),
      ).toBe("<div>x</div>");
    });

    it("validates cite attributes", () => {
      expect(
        insane('<blockquote cite="javascript:alert(1)">x</blockquote>', {
          allowedAttributes: { blockquote: ["cite"] },
        }),
      ).toBe("<blockquote>x</blockquote>");

      expect(
        insane('<blockquote cite="http://example.com">x</blockquote>', {
          allowedAttributes: { blockquote: ["cite"] },
        }),
      ).toBe('<blockquote cite="http://example.com">x</blockquote>');
    });

    it("validates longdesc attributes", () => {
      expect(
        insane(
          '<img longdesc="javascript:alert(1)">',
          {
            allowedTags: ["img"],
            allowedAttributes: { img: ["longdesc"] },
          },
          true,
        ),
      ).toBe("<img/>");
    });

    it("validates usemap attributes", () => {
      expect(
        insane(
          '<img usemap="javascript:alert(1)">',
          {
            allowedTags: ["img"],
            allowedAttributes: { img: ["usemap"] },
          },
          true,
        ),
      ).toBe("<img/>");
    });
  });
});
