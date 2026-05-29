/**
 * Keyboard and clipboard security interception helpers.
 * Extracted from TestInterface.tsx for testability and reuse.
 */

export interface InterceptedKey {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

/** Returns true when the keypress matches a browser DevTools shortcut. */
export const isDevToolsKey = (e: InterceptedKey): boolean => {
  if (e.key === "F12") return true;
  if (e.ctrlKey && e.shiftKey && ["I", "i", "J", "j", "C", "c"].includes(e.key)) return true;
  if (e.metaKey && e.altKey && ["I", "i"].includes(e.key)) return true;
  return false;
};

/** Returns true when the keypress is a copy / paste / cut clipboard shortcut. */
export const isClipboardShortcut = (e: InterceptedKey): boolean =>
  !!(e.ctrlKey || e.metaKey) && ["c", "C", "v", "V", "x", "X"].includes(e.key);

/** Returns true when the key is the PrintScreen key. */
export const isPrintScreen = (e: InterceptedKey): boolean => e.key === "PrintScreen";
