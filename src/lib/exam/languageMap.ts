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

export const DEFAULT_STARTER_CODES: Record<LanguageKey, string> = {
  python3: `def solve():\n    import sys\n    data = sys.stdin.read()\n    # Your code here\n    print(data)\n\nif __name__ == "__main__":\n    solve()\n`,
  javascript: `function solve() {\n    const readline = require('readline');\n    const rl = readline.createInterface({\n        input: process.stdin,\n        output: process.stdout\n    });\n    \n    let input = '';\n    rl.on('line', (line) => {\n        input += line + '\\n';\n    });\n    rl.on('close', () => {\n        // Your code here\n        console.log(input.trim());\n    });\n}\n\nsolve();\n`,
  java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        StringBuilder input = new StringBuilder();\n        while (sc.hasNextLine()) {\n            input.append(sc.nextLine()).append("\\n");\n        }\n        // Your code here\n        System.out.print(input.toString());\n    }\n}\n`,
  cpp: `#include <iostream>\n#include <string>\n\nusing namespace std;\n\nint main() {\n    string line, input;\n    while (getline(cin, line)) {\n        input += line + "\\n";\n    }\n    // Your code here\n    cout << input;\n    return 0;\n}\n`,
};

/**
 * Resolves starter code for the given language from a question's code template or languageTemplates.
 * Falls back to the first available language or language template if the requested one is absent.
 * Returns null when no template is defined or the template is empty.
 */
export const resolveStarterCode = (
  codeTemplate: Record<string, CodeTemplateEntry> | any | undefined,
  language: LanguageKey
): string | null => {
  if (!codeTemplate) return null;

  const langKey = language === "python3" ? "python" : language;

  // 1. Direct starterCode dictionary check
  const starterMap = codeTemplate?.starterCode;
  if (starterMap && typeof starterMap === "object") {
    if (typeof starterMap[language] === "string" && starterMap[language].trim()) return starterMap[language];
    if (typeof starterMap[langKey] === "string" && starterMap[langKey].trim()) return starterMap[langKey];
  }

  // 2. languageTemplates check (e.g. { python: { template: "..." }, cpp: { template: "..." } })
  const templates = codeTemplate?.languageTemplates || codeTemplate?.coding?.languageTemplates;
  if (templates && typeof templates === "object") {
    const entry = templates[language] || templates[langKey];
    if (typeof entry === "string" && entry.trim()) return entry;
    if (entry && typeof entry.template === "string" && entry.template.trim()) return entry.template;
    if (entry && typeof entry.code === "string" && entry.code.trim()) return entry.code;
  }

  // 3. Legacy codeTemplate check
  const legacyMap = codeTemplate?.codeTemplate || (typeof codeTemplate === "object" && !codeTemplate.id && !codeTemplate.prompt ? codeTemplate : undefined);
  if (legacyMap && typeof legacyMap === "object") {
    if (typeof legacyMap[language] === "string" && legacyMap[language].trim()) return legacyMap[language];
    if (typeof legacyMap[langKey] === "string" && legacyMap[langKey].trim()) return legacyMap[langKey];
    if (legacyMap[language]?.code) return legacyMap[language].code;
    if (legacyMap[langKey]?.code) return legacyMap[langKey].code;
    if (legacyMap[language]?.template) return legacyMap[language].template;
    if (legacyMap[langKey]?.template) return legacyMap[langKey].template;

    // Fallback to first available language in template
    const entries = Object.values(legacyMap) as any[];
    for (const entry of entries) {
      if (typeof entry === "string" && entry.trim()) return entry;
      if (entry && typeof entry.code === "string" && entry.code.trim()) return entry.code;
      if (entry && typeof entry.template === "string" && entry.template.trim()) return entry.template;
    }
  }

  return null;
};

/**
 * Returns the list of languages available in a question's code template,
 * or the full default set if no template is defined.
 */
export const getAvailableLanguages = (
  codeTemplate: Record<string, CodeTemplateEntry> | any | undefined
): LanguageKey[] => {
  const templates = codeTemplate?.languageTemplates || codeTemplate?.starterCode || codeTemplate;
  if (templates && typeof templates === "object" && Object.keys(templates).length > 0) {
    const keys = Object.keys(templates).map(k => k === "python" ? "python3" : k);
    const validKeys = keys.filter((k): k is LanguageKey => k in LANGUAGE_MAP);
    if (validKeys.length > 0) return validKeys;
  }
  return ["python3", "javascript", "java", "cpp"];
};
