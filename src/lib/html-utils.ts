/**
 * HTML utility functions for sanitizing and decoding escaped rich text content.
 */

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
