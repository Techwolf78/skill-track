export interface SignatureParameter {
  name: string;
  type: string; // e.g., 'int', 'list[int]', 'map[string,int]'
}

export interface SignatureMetadata {
  method_name: string;
  params: SignatureParameter[];
  return_type: string;
}

export interface LanguageTemplateEntry {
  template: string;
  driver: string;
}

// Replaces the old Record<string, string> codeTemplate
export type LanguageTemplates = Record<string, LanguageTemplateEntry>;

/**
 * Crucial Language Key Translation Map:
 * The frontend uses `python3` to reference Python, but the backend maps it to `python`.
 * Ensure you translate `python3` to `python` before posting to the backend,
 * and translate `python` to `python3` when parsing response templates.
 */
export const mapFrontendToBackendLang = (lang: string): string => {
  if (lang === 'python3') return 'python';
  return lang;
};

export const mapBackendToFrontendLang = (lang: string): string => {
  if (lang === 'python') return 'python3';
  return lang;
};
