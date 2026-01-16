import { describe, it, expect, vi } from "vitest";
import insane, { defaults } from "../src/index.js";

describe("insane", () => {
  describe("default behavior", () => {
    it("succeeds because of sensible defaults", () => {
      expect(insane("<div>bar<span>foo</span></div>")).toBe("<div>bar<span>foo</span></div>");
    });

    it("succeeds because of whitelist approach", () => {
      expect(insane("<script>bar<span>foo</span></script>", { allowedTags: [] })).toBe("");
    });

    it("deals with iframes and scripts by default", () => {
      expect(insane('<script>"foo"</script>')).toBe("");
      expect(insane('<script src="http://google.com">"foo"</script>')).toBe("");
      expect(insane('<iframe>"foo"</iframe>')).toBe("");
      expect(insane('<iframe src="http://google.com">asd</iframe>')).toBe("");
    });

    it("doesn't fail at basic parsing", () => {
      expect(insane("<div>\n  <span>\n    <span>/foo</span>\n  </span>\n</div>")).toBe(
        "<div>\n  <span>\n    <span>/foo</span>\n  </span>\n</div>",
      );
    });
  });

  describe("tag whitelist", () => {
    it("only returns tags in the whitelist", () => {
      expect(insane("<p><span>foo</span>bar</p>", { allowedTags: ["p"] }, true)).toBe("<p>bar</p>");
      expect(insane("<p>bar<span>foo</span></p>", { allowedTags: ["p"] }, true)).toBe("<p>bar</p>");
    });

    it("only returns tags in the whitelist even if deeper content is allowed", () => {
      expect(
        insane(
          "<div><p><span>foo</span></p>bar</div>",
          {
            allowedTags: ["span", "div"],
          },
          true,
        ),
      ).toBe("<div>bar</div>");
    });

    it("only returns tags in the whitelist even if deeper content is allowed (nested)", () => {
      expect(
        insane(
          "<p><span><div>foo</div></span>bar</p>",
          {
            allowedTags: ["p", "div"],
          },
          true,
        ),
      ).toBe("<p>bar</p>");
    });

    it("only returns tags in the whitelist even if deeper content is mixed", () => {
      expect(
        insane(
          "<p><span><span><p>foo</p></span></span>bar</p>",
          {
            allowedTags: ["p"],
          },
          true,
        ),
      ).toBe("<p>bar</p>");
      expect(
        insane(
          "<p><div><span><div>foo</div></span></div>bar</p>",
          {
            allowedTags: ["p"],
          },
          true,
        ),
      ).toBe("<p>bar</p>");
    });

    it("only returns tags in the whitelist even if repeated", () => {
      expect(insane("<p><p>foo</p>bar</p>", { allowedTags: ["p"] }, true)).toBe(
        "<p><p>foo</p>bar</p>",
      );
      expect(insane("<p><p><span>foo</span></p>bar</p>", { allowedTags: ["p"] }, true)).toBe(
        "<p><p></p>bar</p>",
      );
      expect(insane("<p><span><p>foo</p></span>bar</p>", { allowedTags: ["p"] }, true)).toBe(
        "<p>bar</p>",
      );
    });

    it("only returns tags in the whitelist even if disallowed tag is nested", () => {
      expect(
        insane(
          "<p><span><p><span>foo</span></p></span>bar</p>",
          {
            allowedTags: ["p"],
          },
          true,
        ),
      ).toBe("<p>bar</p>");
    });
  });

  describe("attribute whitelist", () => {
    it("drops every attribute", () => {
      expect(
        insane(
          '<div a="a" b="b" class="foo">foo</div>',
          {
            allowedTags: ["div"],
          },
          true,
        ),
      ).toBe("<div>foo</div>");
    });

    it("drops every attribute except the allowed ones", () => {
      expect(
        insane(
          '<div a="a" b="b" class="foo">foo</div>',
          {
            allowedTags: ["div"],
            allowedAttributes: { div: ["b"] },
          },
          true,
        ),
      ).toBe('<div b="b">foo</div>');
    });

    it("drops every attribute except the allowed ones, even in case of class names", () => {
      expect(
        insane(
          '<div a="a" b="b" class="foo">foo</div>',
          {
            allowedTags: ["div"],
            allowedAttributes: { div: ["class"] },
          },
          true,
        ),
      ).toBe('<div class="foo">foo</div>');
    });

    it("succeeds because of catch-all allowedAttributes rules", () => {
      expect(
        insane(
          '<div a="nope" id="foo" class="bar baz" style="position:absolute">foo</div>',
          {
            allowedTags: ["div"],
            allowedAttributes: { "*": ["class", "id", "style"] },
          },
          true,
        ),
      ).toBe('<div id="foo" class="bar baz" style="position:absolute">foo</div>');
    });
  });

  describe("class whitelist", () => {
    it("drops every class name if not whitelisted", () => {
      expect(
        insane(
          '<div a="a" b="b" class="foo bar">foo</div>',
          {
            allowedTags: ["div"],
            allowedClasses: { div: ["bar"] },
          },
          true,
        ),
      ).toBe('<div class="bar">foo</div>');
    });

    it('ignores whitelist and just allows everything if "class" is an allowed attribute', () => {
      expect(
        insane(
          '<div a="a" b="b" class="foo bar">foo</div>',
          {
            allowedTags: ["div"],
            allowedAttributes: { div: ["class"] },
            allowedClasses: { div: ["bar"] },
          },
          true,
        ),
      ).toBe('<div class="foo bar">foo</div>');
    });
  });

  describe("filter function", () => {
    it("filter turns everything into ignores", () => {
      const filter = vi.fn(() => false);
      expect(
        insane(
          '<div a="a" b="b" class="foo bar">foo</div>',
          {
            filter,
            allowedTags: ["div"],
          },
          true,
        ),
      ).toBe("");
    });

    it("filter works as expected for self-closing tags", () => {
      const filter = vi.fn(() => false);
      expect(
        insane(
          'foo <img a="a"/> bar',
          {
            filter,
            allowedTags: ["div"],
          },
          true,
        ),
      ).toBe("foo  bar");
    });

    it("calls filter with correct arguments", () => {
      const filter = vi.fn(() => true);
      expect(
        insane(
          '<div a="a" b="b" class="foo bar">foo</div>',
          {
            filter,
            allowedTags: ["div"],
          },
          true,
        ),
      ).toBe("<div>foo</div>");
      expect(filter).toHaveBeenCalledTimes(1);
      expect(filter).toHaveBeenCalledWith({
        attrs: { a: "a", b: "b", class: "foo bar" },
        tag: "div",
      });
    });

    it("uses filter wisely", () => {
      function filter(token: { attrs: Record<string, string | undefined> }) {
        return token.attrs["aria-label"] !== undefined;
      }
      expect(
        insane(
          '<span aria-label="a foo">foo</span><span>bar</span>',
          {
            allowedTags: ["span"],
            allowedAttributes: { span: ["aria-label"] },
            filter,
          },
          true,
        ),
      ).toBe('<span aria-label="a foo">foo</span>');
    });
  });

  describe("URL sanitization", () => {
    it("succeeds to read urls that make sense", () => {
      expect(insane('<a href="#foo">bar</a>')).toBe('<a href="#foo">bar</a>');
      expect(insane('<a href="/foo">bar</a>')).toBe('<a href="/foo">bar</a>');
      expect(insane('<a href="http://google.com/foo">bar</a>')).toBe(
        '<a href="http://google.com/foo">bar</a>',
      );
      expect(insane('<a href="https://google.com/foo">bar</a>')).toBe(
        '<a href="https://google.com/foo">bar</a>',
      );
      expect(insane('<a href="mailto:nico@stompflow.com">bar</a>')).toBe(
        '<a href="mailto:nico@stompflow.com">bar</a>',
      );
    });

    it("fails to read urls that don't make sense", () => {
      expect(insane('<a href="javascript:alert(1)">bar</a>')).toBe("<a>bar</a>");
      expect(insane('<a href="magnet:?xt=urn:btih:E6462F43A9B7329961FADA1">bar</a>')).toBe(
        "<a>bar</a>",
      );
    });
  });

  describe("quotes handling", () => {
    it("doesn't care about quotes", () => {
      expect(insane('<span>"bar"</span>')).toBe('<span>"bar"</span>');
      expect(insane('<span>"bar?"</span>')).toBe('<span>"bar?"</span>');
      expect(insane('"bar"')).toBe('"bar"');
      expect(insane('"bar?"')).toBe('"bar?"');
    });
  });

  describe("defaults export", () => {
    it("exports defaults", () => {
      expect(defaults).toBeDefined();
      expect(defaults.allowedTags).toContain("div");
      expect(defaults.allowedTags).toContain("span");
      expect(defaults.allowedSchemes).toContain("http");
      expect(defaults.allowedSchemes).toContain("https");
    });
  });

  describe("transformText option", () => {
    it("transforms text content", () => {
      expect(
        insane("<div>hello world</div>", {
          transformText: (text) => text.toUpperCase(),
        }),
      ).toBe("<div>HELLO WORLD</div>");
    });

    it("does not transform text in ignored tags", () => {
      expect(
        insane("<script>hello</script><div>world</div>", {
          transformText: (text) => text.toUpperCase(),
        }),
      ).toBe("<div>WORLD</div>");
    });
  });
});
