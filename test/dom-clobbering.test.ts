import { describe, it, expect } from "vitest";
import insane from "../src/index.js";

/**
 * DOM Clobbering Security Tests
 *
 * DOM clobbering is an attack where HTML elements with specific id or name
 * attributes can override built-in DOM properties and methods, potentially
 * breaking JavaScript functionality or enabling security bypasses.
 *
 * Common targets: document.cookie, document.domain, window.location,
 * document.body, document.forms, document.images, etc.
 */
describe("DOM Clobbering Prevention", () => {
  describe("Dangerous id attributes", () => {
    it("strips id attributes by default (not in allowlist)", () => {
      // By default, id is NOT in the allowedAttributes list
      // This is a secure default that prevents DOM clobbering
      const dangerousIds = ["cookie", "domain", "location", "body", "document"];

      for (const id of dangerousIds) {
        const input = `<div id="${id}">content</div>`;
        const result = insane(input);
        // Default behavior strips id attribute, which is safe
        expect(result).toBe("<div>content</div>");
      }
    });

    it("allows id when explicitly permitted (user responsibility)", () => {
      // When user explicitly allows id, it passes through
      // DOM clobbering protection becomes application responsibility
      const input = '<div id="cookie">content</div>';
      const result = insane(input, { allowedAttributes: { div: ["id"] } });
      // User explicitly allowed id, so it passes through
      expect(result).toBe('<div id="cookie">content</div>');
    });

    it("strips name attribute on form elements since form is not allowed", () => {
      const dangerousNames = ["location", "document", "alert"];

      for (const name of dangerousNames) {
        const input = `<form name="${name}"></form>`;
        // form tags are removed by default
        expect(insane(input)).toBe("");
      }
    });

    it("allows name attribute on anchors by default (per allowlist)", () => {
      // Note: name is in default allowedAttributes for 'a' tags
      // This is intentional for named anchors functionality
      const input = '<a name="section1" href="#">link</a>';
      const result = insane(input);
      expect(result).toBe('<a name="section1" href="#">link</a>');
    });

    it("prevents clobbering via form elements", () => {
      // Form elements can clobber document.forms and form.elements
      const input = '<form id="x"><input name="y"></form>';
      expect(insane(input)).toBe("");
    });

    it("strips name on img by default (not in img allowlist)", () => {
      // name is NOT in the default allowed attributes for img
      const input = '<img name="documentElement" src="x.jpg">';
      const result = insane(input);
      expect(result).toBe('<img src="x.jpg"/>');
    });

    it("allows name on img when explicitly permitted", () => {
      // User explicitly allowed name, so it passes through
      const input = '<img name="documentElement" src="x.jpg">';
      const result = insane(input, { allowedAttributes: { img: ["src", "name"] } });
      expect(result).toBe('<img name="documentElement" src="x.jpg"/>');
    });

    it("allows name on anchor (per default allowlist)", () => {
      // Anchors have name in the default allowlist for named anchor functionality
      const input = '<a name="location" href="#">link</a>';
      const result = insane(input);
      // name is allowed on 'a' tags by default
      expect(result).toBe('<a name="location" href="#">link</a>');
    });
  });

  describe("Nested clobbering attacks", () => {
    it("handles form with dangerous input names", () => {
      // This could create document.forms.x.action etc.
      const input = `
        <form id="login">
          <input name="action" value="javascript:alert(1)">
          <input name="method" value="javascript:">
          <input name="submit" value="click">
        </form>
      `;
      expect(insane(input).trim()).toBe("");
    });

    it("handles nested elements with same id (user explicitly allowed)", () => {
      const input = '<div id="x"><span id="x">nested</span></div>';
      const result = insane(input, { allowedAttributes: { div: ["id"], span: ["id"] } });
      // When user explicitly allows id, it passes through
      expect(result).toBe('<div id="x"><span id="x">nested</span></div>');
    });

    it("strips id by default even with nested elements", () => {
      const input = '<div id="x"><span id="x">nested</span></div>';
      const result = insane(input);
      // id is not in default allowlist
      expect(result).toBe("<div><span>nested</span></div>");
    });

    it("handles iframe name clobbering", () => {
      // iframes with name can clobber window properties
      const input = '<iframe name="top" src="evil.html"></iframe>';
      expect(insane(input)).toBe("");
    });
  });

  describe("Object/Embed clobbering", () => {
    it("removes object tags that could clobber", () => {
      const input = '<object id="location" data="x"></object>';
      expect(insane(input)).toBe("");
    });

    it("removes embed tags that could clobber", () => {
      const input = '<embed id="document" src="x">';
      expect(insane(input)).toBe("");
    });

    it("removes applet tags that could clobber", () => {
      const input = '<applet id="cookie" code="x"></applet>';
      expect(insane(input)).toBe("");
    });
  });

  describe("Collection-based clobbering", () => {
    it("allows name on anchors (per default allowlist)", () => {
      // name is allowed on anchor tags by default
      const input = '<a name="x">1</a><a name="x">2</a>';
      const result = insane(input);
      expect(result).toBe('<a name="x">1</a><a name="x">2</a>');
    });

    it("strips name on div by default", () => {
      // name is NOT in default allowlist for div
      const input = '<div name="x">1</div><div name="x">2</div>';
      const result = insane(input);
      expect(result).toBe("<div>1</div><div>2</div>");
    });

    it("handles area elements in map", () => {
      // Areas in image maps can be used for clobbering
      const input = '<map name="document"><area id="cookie" href="#"></map>';
      expect(insane(input)).toBe("");
    });
  });

  describe("Prototype chain clobbering", () => {
    it("strips id by default (including __proto__)", () => {
      const input = '<div id="__proto__">x</div>';
      const result = insane(input);
      expect(result).toBe("<div>x</div>");
    });

    it("allows __proto__ as id when explicitly permitted (user responsibility)", () => {
      const input = '<div id="__proto__">x</div>';
      const result = insane(input, { allowedAttributes: { div: ["id"] } });
      // User explicitly allowed id
      expect(result).toBe('<div id="__proto__">x</div>');
    });

    it("handles constructor as id", () => {
      const input = '<div id="constructor">x</div>';
      const result = insane(input);
      expect(result).toBe("<div>x</div>");
    });

    it("handles prototype as id", () => {
      const input = '<div id="prototype">x</div>';
      const result = insane(input);
      expect(result).toBe("<div>x</div>");
    });
  });

  describe("Event target clobbering", () => {
    it("strips id by default for event-related property names", () => {
      const dangerousIds = ["addEventListener", "removeEventListener", "dispatchEvent"];

      for (const id of dangerousIds) {
        const input = `<div id="${id}">x</div>`;
        const result = insane(input);
        // id stripped by default (not in default allowlist)
        expect(result).toBe("<div>x</div>");
      }
    });
  });

  describe("Built-in method clobbering", () => {
    it("strips id by default for Array method names", () => {
      const methods = ["push", "pop", "slice"];

      for (const method of methods) {
        const input = `<div id="${method}">x</div>`;
        const result = insane(input);
        expect(result).toBe("<div>x</div>");
      }
    });

    it("strips id by default for Object method names", () => {
      const methods = ["toString", "valueOf", "hasOwnProperty"];

      for (const method of methods) {
        const input = `<div id="${method}">x</div>`;
        const result = insane(input);
        expect(result).toBe("<div>x</div>");
      }
    });
  });

  describe("Shadow DOM clobbering", () => {
    it("removes template elements that could enable shadow DOM attacks", () => {
      const input = '<template id="shadowRoot"><script>alert(1)</script></template>';
      expect(insane(input)).toBe("");
    });

    it("removes slot elements", () => {
      const input = '<slot name="document">fallback</slot>';
      expect(insane(input)).toBe("");
    });
  });

  describe("Custom element clobbering", () => {
    it("removes custom elements by default", () => {
      const input = '<custom-element id="location"></custom-element>';
      expect(insane(input)).toBe("");
    });

    it("handles hyphenated element names", () => {
      const input = '<my-component id="document"></my-component>';
      expect(insane(input)).toBe("");
    });

    it("handles is attribute for customized built-in elements", () => {
      // The "is" attribute can extend built-in elements
      const input = '<div is="x-foo" id="location">x</div>';
      const result = insane(input);
      expect(result).toBe("<div>x</div>");
    });
  });
});
