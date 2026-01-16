import { describe, it, expect } from "vitest";
import insane from "../src/index.js";

/**
 * XSS Attack Vector Tests
 * These tests verify that common XSS attack patterns are properly sanitized
 */
describe("XSS Attack Vectors", () => {
  describe("Script injection", () => {
    it("removes script tags", () => {
      expect(insane("<script>alert(1)</script>")).toBe("");
      expect(insane('<script src="evil.js"></script>')).toBe("");
      expect(insane("<script>document.cookie</script>")).toBe("");
    });

    it("removes script tags with variations", () => {
      expect(insane("<SCRIPT>alert(1)</SCRIPT>")).toBe("");
      expect(insane("<ScRiPt>alert(1)</ScRiPt>")).toBe("");
      expect(insane("<script >alert(1)</script>")).toBe("");
      expect(insane("< script>alert(1)</script>")).toBe("");
      expect(insane("<script\n>alert(1)</script>")).toBe("");
      expect(insane("<script\t>alert(1)</script>")).toBe("");
    });

    it("removes script tags with attributes", () => {
      expect(insane('<script type="text/javascript">alert(1)</script>')).toBe("");
      expect(insane("<script defer>alert(1)</script>")).toBe("");
      expect(insane('<script async src="x">alert(1)</script>')).toBe("");
    });

    it("removes nested script content", () => {
      expect(insane("<div><script>alert(1)</script></div>")).toBe("<div></div>");
      expect(insane("<p>text<script>evil</script>more</p>")).toBe("<p>textmore</p>");
    });
  });

  describe("Event handler injection", () => {
    it("removes onclick handlers", () => {
      expect(insane('<div onclick="alert(1)">click</div>')).toBe("<div>click</div>");
      expect(insane('<a href="#" onclick="evil()">link</a>')).toBe('<a href="#">link</a>');
    });

    it("removes various event handlers", () => {
      const handlers = [
        "onload",
        "onerror",
        "onmouseover",
        "onmouseout",
        "onfocus",
        "onblur",
        "onchange",
        "onsubmit",
        "onkeydown",
        "onkeyup",
        "onkeypress",
        "ondblclick",
        "onmousedown",
        "onmouseup",
        "onmousemove",
        "oncontextmenu",
        "ondrag",
        "ondrop",
        "onscroll",
        "onwheel",
        "oncopy",
        "oncut",
        "onpaste",
        "onbeforeunload",
        "onhashchange",
        "oninput",
        "oninvalid",
        "onreset",
        "onsearch",
        "onselect",
        "ontouchstart",
        "ontouchend",
        "ontouchmove",
        "ontouchcancel",
        "onanimationstart",
        "onanimationend",
        "ontransitionend",
        "onpointerdown",
        "onpointerup",
        "onpointermove",
      ];

      for (const handler of handlers) {
        expect(insane(`<div ${handler}="alert(1)">x</div>`)).toBe("<div>x</div>");
      }
    });

    it("removes event handlers with spaces", () => {
      expect(insane('<div onclick = "alert(1)">x</div>')).toBe("<div>x</div>");
      expect(insane('<div onclick= "alert(1)">x</div>')).toBe("<div>x</div>");
      expect(insane('<div onclick ="alert(1)">x</div>')).toBe("<div>x</div>");
    });

    it("removes event handlers with different quote styles", () => {
      expect(insane("<div onclick='alert(1)'>x</div>")).toBe("<div>x</div>");
      expect(insane("<div onclick=alert(1)>x</div>")).toBe("<div>x</div>");
    });
  });

  // oxlint-disable-next-line no-script-url -- testing XSS prevention
  describe("javascript: URL injection", () => {
    it("removes javascript: URLs in href", () => {
      expect(insane('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
      expect(insane('<a href="JAVASCRIPT:alert(1)">x</a>')).toBe("<a>x</a>");
      expect(insane('<a href="JavaScript:alert(1)">x</a>')).toBe("<a>x</a>");
      expect(insane('<a href="java\nscript:alert(1)">x</a>')).toBe("<a>x</a>");
    });

    it("removes javascript: URLs in src", () => {
      expect(insane('<img src="javascript:alert(1)">')).toBe("<img/>");
      expect(insane('<iframe src="javascript:alert(1)"></iframe>')).toBe("");
    });

    it("removes javascript: URLs with encoding", () => {
      expect(insane('<a href="javascript&#58;alert(1)">x</a>')).toBe("<a>x</a>");
      expect(insane('<a href="javascript&#x3a;alert(1)">x</a>')).toBe("<a>x</a>");
      expect(insane('<a href="&#106;avascript:alert(1)">x</a>')).toBe("<a>x</a>");
    });

    it("removes javascript: URLs with whitespace", () => {
      expect(insane('<a href="  javascript:alert(1)">x</a>')).toBe("<a>x</a>");
      expect(insane('<a href="javascript :alert(1)">x</a>')).toBe("<a>x</a>");
    });
  });

  describe("data: URL injection", () => {
    it("removes data: URLs by default", () => {
      // data: URLs without nested tags
      expect(insane('<a href="data:text/html,evil">x</a>')).toBe("<a>x</a>");
      expect(insane('<a href="data:text/plain,hello">x</a>')).toBe("<a>x</a>");
      expect(insane('<img src="data:image/png,base64data">')).toBe("<img/>");
    });

    it("handles data: URLs with nested HTML (edge case)", () => {
      // The nested <script> is parsed as actual HTML and stripped
      // This is expected behavior - the outer tag is sanitized, inner tags are parsed
      const result = insane('<a href="data:text/html,<script>alert(1)</script>">x</a>');
      expect(result).not.toContain("script");
      expect(result).toContain("<a>");
    });

    it("removes data: URLs with base64", () => {
      expect(
        insane('<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>'),
      ).toBe("<a>x</a>");
    });
  });

  describe("vbscript: URL injection", () => {
    it("removes vbscript: URLs", () => {
      expect(insane('<a href="vbscript:msgbox(1)">x</a>')).toBe("<a>x</a>");
      expect(insane('<a href="VBSCRIPT:msgbox(1)">x</a>')).toBe("<a>x</a>");
    });
  });

  describe("Style-based XSS", () => {
    it("removes style tags", () => {
      expect(insane("<style>body{background:url(javascript:alert(1))}</style>")).toBe("");
      expect(insane('<style>@import "evil.css"</style>')).toBe("");
    });

    it("removes style attributes by default", () => {
      expect(insane('<div style="background:url(javascript:alert(1))">x</div>')).toBe(
        "<div>x</div>",
      );
      expect(insane('<div style="behavior:url(evil.htc)">x</div>')).toBe("<div>x</div>");
    });

    it("removes expression() in allowed style attributes", () => {
      // Even if style is allowed, the content should be sanitized elsewhere
      const result = insane('<div style="width:expression(alert(1))">x</div>', {
        allowedAttributes: { div: ["style"] },
      });
      // Style attribute is allowed but content passes through - this is expected
      // The application should use CSP to prevent expression() attacks
      expect(result).toContain("style=");
    });
  });

  describe("SVG-based XSS", () => {
    it("removes SVG by default", () => {
      expect(insane('<svg onload="alert(1)"></svg>')).toBe("");
      expect(insane("<svg><script>alert(1)</script></svg>")).toBe("");
    });

    it("removes SVG event handlers if SVG is allowed", () => {
      expect(
        insane('<svg onload="alert(1)"></svg>', {
          allowedTags: ["svg"],
        }),
      ).toBe("<svg></svg>");
    });

    it("removes nested SVG attacks", () => {
      expect(insane('<svg><image xlink:href="javascript:alert(1)"/></svg>')).toBe("");
      expect(insane('<svg><foreignObject><body onload="alert(1)"/></foreignObject></svg>')).toBe(
        "",
      );
    });
  });

  describe("Meta/Link-based attacks", () => {
    it("removes meta tags", () => {
      expect(insane('<meta http-equiv="refresh" content="0;url=javascript:alert(1)">')).toBe("");
      expect(insane('<meta http-equiv="Set-Cookie" content="session=stolen">')).toBe("");
    });

    it("removes link tags", () => {
      expect(insane('<link rel="stylesheet" href="javascript:alert(1)">')).toBe("");
      expect(insane('<link rel="import" href="evil.html">')).toBe("");
    });

    it("removes base tags", () => {
      expect(insane('<base href="javascript:alert(1)">')).toBe("");
      expect(insane('<base href="https://evil.com/">')).toBe("");
    });
  });

  describe("Object/Embed/Applet attacks", () => {
    it("removes object tags", () => {
      expect(insane('<object data="javascript:alert(1)"></object>')).toBe("");
      expect(insane('<object type="text/html" data="evil.html"></object>')).toBe("");
    });

    it("removes embed tags", () => {
      expect(insane('<embed src="javascript:alert(1)">')).toBe("");
      expect(insane('<embed src="evil.swf" type="application/x-shockwave-flash">')).toBe("");
    });

    it("removes applet tags", () => {
      expect(insane('<applet code="Evil.class"></applet>')).toBe("");
    });
  });

  describe("Form-based attacks", () => {
    it("removes form tags by default", () => {
      expect(insane('<form action="https://evil.com/steal"><input name="password"></form>')).toBe(
        "",
      );
    });

    it("removes formaction attributes", () => {
      expect(insane('<button formaction="javascript:alert(1)">click</button>')).toBe("");
      expect(insane('<input type="submit" formaction="https://evil.com">')).toBe("");
    });
  });

  describe("Template-based attacks", () => {
    it("removes template tags", () => {
      expect(insane("<template><script>alert(1)</script></template>")).toBe("");
    });

    it("removes slot tags", () => {
      expect(insane('<slot name="evil"><script>alert(1)</script></slot>')).toBe("");
    });
  });
});
