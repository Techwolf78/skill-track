/**
 * Code editor language map and starter code resolution utilities.
 * Extracted from TestInterface.tsx for testability and reuse.
 */

import type { CodeTemplateEntry } from "@/lib/test-service";

export const LANGUAGE_MAP = {
  python3: { name: "Python 3", slug: "python3", monaco: "python" },
  javascript: { name: "JavaScript", slug: "javascript", monaco: "javascript" },
  java: { name: "Java", slug: "java", monaco: "java" },
  cpp: { name: "C++", slug: "cpp", monaco: "cpp" },
} as const;

export type LanguageKey = keyof typeof LANGUAGE_MAP;

/**
 * Resolves starter code for the given language from a question's code template.
 * Falls back to the first available language if the requested one is absent.
 * Returns null when no template is defined or the template is empty.
 */
export const resolveStarterCode = (
  codeTemplate: Record<string, CodeTemplateEntry> | undefined,
  language: LanguageKey
): string | null => {
  if (!codeTemplate || Object.keys(codeTemplate).length === 0) return null;
  if (codeTemplate[language]?.code) return codeTemplate[language].code;
  const firstKey = Object.keys(codeTemplate)[0] as LanguageKey;
  if (firstKey && codeTemplate[firstKey]?.code) return codeTemplate[firstKey].code;
  return null;
};

/**
 * Returns the list of languages available in a question's code template,
 * or the full default set if no template is defined.
 */
export const getAvailableLanguages = (
  codeTemplate: Record<string, CodeTemplateEntry> | undefined
): LanguageKey[] => {
  if (codeTemplate && Object.keys(codeTemplate).length > 0) {
    return Object.keys(codeTemplate) as LanguageKey[];
  }
  return ["python3", "javascript", "java", "cpp"];
};
