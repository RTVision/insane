import { describe, it, expect } from "vitest";
import insane from "../src/index.js";

/**
 * ReDoS (Regular Expression Denial of Service) Tests
 * CVE-2020-26303: The original insane package was vulnerable to ReDoS
 * These tests ensure our implementation is safe from catastrophic backtracking
 */
describe("ReDoS Prevention (CVE-2020-26303)", () => {
  it("handles the original CVE PoC without hanging", () => {
    // Original PoC from CVE-2020-26303
    const malicious = `<b>foo</b><foo bar= ${new Array(50).join(' -=""')}`;

    const start = performance.now();
    const result = insane(malicious);
    const elapsed = performance.now() - start;

    // Should complete in under 100ms, not hang for seconds
    expect(elapsed).toBeLessThan(100);
    expect(result).toBe("<b>foo</b>");
  });

  it("handles extreme attribute variations without hanging", () => {
    // More aggressive version
    const malicious = `<div ${new Array(100).join('a="" ')}>`;

    const start = performance.now();
    insane(malicious);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
  });

  it("handles deeply nested quotes without hanging", () => {
    const malicious = `<div attr="${new Array(1000).join("x")}">`;

    const start = performance.now();
    insane(malicious);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
  });

  it("handles many attributes without hanging", () => {
    let attrs = "";
    for (let i = 0; i < 500; i++) {
      attrs += ` attr${i}="value${i}"`;
    }
    const malicious = `<div${attrs}>content</div>`;

    const start = performance.now();
    insane(malicious, { allowedTags: ["div"], allowedAttributes: { div: ["attr0"] } });
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(500); // Allow more time for legitimate parsing
  });

  it("handles malformed attribute patterns without hanging", () => {
    const patterns = [
      `<div ${new Array(50).join(" x=")}>`,
      `<div ${new Array(50).join(" =x")}>`,
      `<div ${new Array(50).join(" x= ")}>`,
      `<div ${new Array(50).join(' ="x"')}>`,
      `<div ${new Array(50).join(" ='x'")}>`,
    ];

    for (const malicious of patterns) {
      const start = performance.now();
      insane(malicious);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
    }
  });

  it("handles repeated whitespace without hanging", () => {
    const malicious = `<div ${new Array(1000).join(" ")}class="foo">`;

    const start = performance.now();
    insane(malicious);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
  });

  it("handles very long tag names without hanging", () => {
    const longTag = "a".repeat(10000);
    const malicious = `<${longTag}>content</${longTag}>`;

    const start = performance.now();
    insane(malicious);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
  });

  it("handles very long attribute names without hanging", () => {
    const longAttr = "x".repeat(10000);
    const malicious = `<div ${longAttr}="value">content</div>`;

    const start = performance.now();
    insane(malicious);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
  });

  it("handles very long attribute values without hanging", () => {
    const longValue = "x".repeat(10000);
    const malicious = `<div class="${longValue}">content</div>`;

    const start = performance.now();
    insane(malicious);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
  });

  it("handles complex nested patterns without hanging", () => {
    // Patterns that could cause exponential backtracking
    const patterns = [
      `<div${' x=""'.repeat(50)}>`,
      `<div${" x=y".repeat(50)}>`,
      `<div${" x='y'".repeat(50)}>`,
    ];

    for (const malicious of patterns) {
      const start = performance.now();
      insane(malicious);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
    }
  });
});
