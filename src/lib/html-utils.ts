/**
 * HTML & Markdown utility functions for sanitizing, decoding, and rendering rich text content.
 */
import DOMPurify from "dompurify";

export const sanitizeHtml = (dirtyHtml: string): string => {
  if (!dirtyHtml) return "";
  if (typeof window === "undefined") {
    return dirtyHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  }
  return DOMPurify.sanitize(dirtyHtml, {
    USE_PROFILES: { html: true, svg: true },
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "p", "a", "ul", "ol",
      "nl", "li", "b", "i", "strong", "em", "strike", "code", "hr", "br", "div",
      "table", "thead", "caption", "tbody", "tr", "th", "td", "pre", "span",
      "img", "svg", "path", "sup", "sub", "small", "details", "summary", "mark",
    ],
    ALLOWED_ATTR: [
      "href", "name", "target", "src", "alt", "class", "style", "title",
      "width", "height", "viewBox", "fill", "stroke", "stroke-width", "d",
      "colspan", "rowspan", "border", "align",
    ],
    ALLOW_DATA_ATTR: false,
  });
};

export const decodeHtmlIfNeeded = (html: string): string => {
  if (!html) return "";
  
  // If the string contains escaped HTML tags like &lt;p&gt; or &lt;div&gt; or &lt;h3&gt;
  if (/&lt;\s*\/?\s*(?:p|h[1-6]|ul|ol|li|code|pre|div|span|strong|em|table|tr|td|th|b|i)\b/i.test(html)) {
    if (typeof document !== "undefined") {
      const txt = document.createElement("textarea");
      txt.innerHTML = html;
      let decoded = txt.value;
      // Handle double-escaped if present
      if (/&lt;\s*\/?\s*(?:p|h[1-6]|ul|ol|li|code|pre|div|span|strong|em|table|tr|td|th|b|i)\b/i.test(decoded)) {
        txt.innerHTML = decoded;
        decoded = txt.value;
      }
      return decoded;
    } else {
      return html
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&");
    }
  }
  
  return html;
};

export const isHtmlContent = (text: string): boolean => {
  if (!text) return false;
  const decoded = decodeHtmlIfNeeded(text);
  return /<[a-z][\s\S]*>/i.test(decoded);
};

export const formatMarkdownToHtml = (markdown: string): string => {
  if (!markdown) return "";
  let text = decodeHtmlIfNeeded(markdown).trim();

  // Strip redundant leading "### Problem Statement" or "# Problem Statement"
  text = text.replace(/^\s*#{1,4}\s*Problem Statement\s*[:.]?\s*/i, "");

  // Code blocks: ```lang ... ```
  text = text.replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/gi, (_match, _lang, code) => {
    const escapedCode = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `\n\n<pre class="bg-slate-900 text-slate-100 p-3 rounded font-mono text-xs overflow-x-auto my-2.5"><code>${escapedCode}</code></pre>\n\n`;
  });

  // Inline section headers: "### Input Format", "### Output Format", "### Constraints", etc.
  text = text.replace(
    /(?:^|\s+)#{1,4}\s*(Input Format|Output Format|Constraints?|Examples?|Sample (?:Input|Output)|Explanation|Notes?|Task|Follow[ -]?up)\s*[:.]?\s*/gi,
    '\n\n<h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider mt-4 mb-1.5">$1</h3>\n\n'
  );

  // Markdown headings:
  // ### Heading -> <h3>
  text = text.replace(/^###\s+(.+)$/gm, '\n\n<h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider mt-4 mb-1.5">$1</h3>\n\n');
  // ## Heading -> <h2>
  text = text.replace(/^##\s+(.+)$/gm, '\n\n<h2 class="text-sm font-bold text-slate-900 mt-4 mb-1.5">$1</h2>\n\n');
  // # Heading -> <h1>
  text = text.replace(/^#\s+(.+)$/gm, '\n\n<h2 class="text-sm font-bold text-slate-900 mt-4 mb-1.5">$1</h2>\n\n');

  // Bullet list items (support multiline lists with - or *)
  text = text.replace(/((?:^[ \t]*[-*]\s+.+(?:\r?\n|$))+)/gm, (match) => {
    const items = match
      .trim()
      .split(/\r?\n/)
      .map((line) => line.replace(/^[ \t]*[-*]\s+/, "").trim())
      .filter(Boolean)
      .map((item) => `<li class="my-0.5">${item}</li>`)
      .join("\n");
    return `\n\n<ul class="list-disc pl-5 my-2 text-slate-800">\n${items}\n</ul>\n\n`;
  });

  // Numbered list items
  text = text.replace(/((?:^[ \t]*\d+\.\s+.+(?:\r?\n|$))+)/gm, (match) => {
    const items = match
      .trim()
      .split(/\r?\n/)
      .map((line) => line.replace(/^[ \t]*\d+\.\s+/, "").trim())
      .filter(Boolean)
      .map((item) => `<li class="my-0.5">${item}</li>`)
      .join("\n");
    return `\n\n<ol class="list-decimal pl-5 my-2 text-slate-800">\n${items}\n</ol>\n\n`;
  });

  // Bold: **text** or __text__
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>');
  text = text.replace(/__(.+?)__/g, '<strong class="font-semibold text-slate-900">$1</strong>');

  // Inline code: `code`
  text = text.replace(/`([^`\n]+)`/g, '<code class="px-1.5 py-0.5 bg-slate-100 text-slate-900 border border-slate-200 font-mono text-xs rounded">$1</code>');

  // Italic: *text* (avoiding within words)
  text = text.replace(/(^|[^\*])\*([^\*\n]+)\*([^\*]|$)/g, '$1<em>$2</em>$3');

  // Paragraph processing (split by double newlines)
  const blocks = text.split(/\n{2,}/);
  return blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("<ol") ||
        trimmed.startsWith("<pre") ||
        trimmed.startsWith("<div")
      ) {
        return trimmed;
      }
      return `<p class="my-1.5 leading-relaxed text-slate-800 text-[13px] md:text-sm font-normal">${trimmed.replace(/\n/g, "<br/>")}</p>`;
    })
    .filter(Boolean)
    .join("\n");
};

/**
 * Universal content renderer for prompts, explanations, and rich text.
 * Preserves genuine HTML intact and formats raw Markdown cleanly.
 */
export const renderFormattedContent = (content?: string): string => {
  if (!content) return "";
  const decoded = decodeHtmlIfNeeded(content);
  const rawHtml = isHtmlContent(decoded) ? decoded : formatMarkdownToHtml(decoded);
  return sanitizeHtml(rawHtml);
};

/**
 * Strips HTML tags and Markdown artifacts to generate a clean plain-text excerpt for cards and previews.
 */
export const formatPlainTextExcerpt = (content?: string, maxLength = 220): string => {
  if (!content) return "Not available";
  let text = decodeHtmlIfNeeded(content);

  // Strip HTML tags
  text = text.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");

  // Strip leading problem statement marker
  text = text.replace(/^\s*#{1,4}\s*Problem Statement\s*[:.]?\s*/i, "");

  // Strip inline markdown headers like ### Input Format, ### Output Format, etc.
  text = text.replace(/#{1,4}\s*(?:Input Format|Output Format|Constraints?|Examples?|Sample (?:Input|Output)|Explanation|Notes?|Task|Follow[ -]?up)\s*[:.]?\s*/gi, " ");

  // Strip general markdown headers (#, ##, ###)
  text = text.replace(/^#{1,6}\s+/gm, "");

  // Strip markdown formatting symbols: `code`, **bold**, *italic*, __bold__
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");

  // Collapse whitespaces
  text = text.replace(/\s+/g, " ").trim();

  if (!text) return "Not available";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
};
