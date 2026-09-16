import { describe, it, expect } from "vitest";
import { unwrapResponse, unwrapArrayResponse, isSuccessResponse } from "../../lib/api/baseResponseUtils";

describe("API Response Envelope Parsing", () => {
  describe("unwrapResponse", () => {
    it("should unwrap the data field from a BaseResponse envelope", () => {
      const mockResponse = {
        data: { success: true, message: "OK", data: { id: "abc", name: "Test" } },
      };
      const result = unwrapResponse<{ id: string; name: string }>(mockResponse);
      expect(result.id).toBe("abc");
      expect(result.name).toBe("Test");
    });

    it("should return raw data when not wrapped in BaseResponse", () => {
      const mockResponse = { data: { id: "xyz" } };
      const result = unwrapResponse<{ id: string }>(mockResponse);
      expect(result.id).toBe("xyz");
    });
  });

  describe("unwrapArrayResponse", () => {
    it("should return data array from BaseResponse", () => {
      const mockResponse = {
        data: { success: true, message: "OK", data: [{ id: "1" }, { id: "2" }] },
      };
      const result = unwrapArrayResponse<{ id: string }>(mockResponse);
      expect(result.length).toBe(2);
    });

    it("should return empty array when data is null", () => {
      const mockResponse = { data: { success: true, message: "OK", data: null } };
      const result = unwrapArrayResponse<{ id: string }>(mockResponse);
      expect(result).toEqual([]);
    });
  });

  describe("isSuccessResponse", () => {
    it("should return true for success=true response", () => {
      const response = { data: { success: true, message: "OK", data: null } };
      expect(isSuccessResponse(response)).toBe(true);
    });

    it("should return false for success=false response", () => {
      const response = { data: { success: false, message: "Failed", data: null } };
      expect(isSuccessResponse(response)).toBe(false);
    });
  });
});

describe("html-utils: Markdown and HTML Prompt Formatting", () => {
  it("should preserve existing rich HTML content intact", async () => {
    const { renderFormattedContent } = await import("../../lib/html-utils");
    const html = "<p>This is a <strong>valid HTML</strong> question.</p><h3>Section</h3>";
    const rendered = renderFormattedContent(html);
    expect(rendered).toContain("<p>This is a <strong>valid HTML</strong> question.</p>");
    expect(rendered).toContain("<h3>Section</h3>");
  });

  it("should convert markdown headings and inline code into styled HTML", async () => {
    const { renderFormattedContent } = await import("../../lib/html-utils");
    const md = `### Problem Statement
Given an integer array \`arr\` and a non-negative integer \`k\`, rotate the array.

### Input Format
First line contains integer n.

### Output Format
Space-separated integers.`;

    const rendered = renderFormattedContent(md);
    
    // Should strip the redundant first "Problem Statement" heading
    expect(rendered).not.toContain("### Problem Statement");
    expect(rendered).not.toContain("<h3 class=\"text-xs font-bold text-slate-900 uppercase tracking-wider mt-4 mb-1.5\">Problem Statement</h3>");
    
    // Should convert inline code
    expect(rendered).toContain("<code class=\"px-1.5 py-0.5 bg-slate-100 text-slate-900 border border-slate-200 font-mono text-xs rounded\">arr</code>");
    expect(rendered).toContain("<code class=\"px-1.5 py-0.5 bg-slate-100 text-slate-900 border border-slate-200 font-mono text-xs rounded\">k</code>");

    // Should convert subheaders
    expect(rendered).toContain("<h3 class=\"text-xs font-bold text-slate-900 uppercase tracking-wider mt-4 mb-1.5\">Input Format</h3>");
    expect(rendered).toContain("<h3 class=\"text-xs font-bold text-slate-900 uppercase tracking-wider mt-4 mb-1.5\">Output Format</h3>");
  });

  it("should convert bold markdown text and bullet lists", async () => {
    const { renderFormattedContent } = await import("../../lib/html-utils");
    const md = `**Important Note:**
- Item 1
- Item 2`;

    const rendered = renderFormattedContent(md);
    expect(rendered).toContain("<strong class=\"font-semibold text-slate-900\">Important Note:</strong>");
    expect(rendered).toContain("<ul class=\"list-disc pl-5 my-2 text-slate-800\">");
    expect(rendered).toContain("<li class=\"my-0.5\">Item 1</li>");
    expect(rendered).toContain("<li class=\"my-0.5\">Item 2</li>");
  });

  it("should convert code blocks", async () => {
    const { renderFormattedContent } = await import("../../lib/html-utils");
    const md = "```python\ndef solution(n):\n    return n * 2\n```";
    const rendered = renderFormattedContent(md);
    expect(rendered).toContain("<pre class=\"bg-slate-900 text-slate-100 p-3 rounded font-mono text-xs overflow-x-auto my-2.5\"><code>def solution(n):\n    return n * 2\n</code></pre>");
  });

  it("should handle empty or null content gracefully", async () => {
    const { renderFormattedContent } = await import("../../lib/html-utils");
    expect(renderFormattedContent("")).toBe("");
    expect(renderFormattedContent(undefined)).toBe("");
  });
});

