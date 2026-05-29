import { describe, it, expect } from "vitest";
import {
  isDevToolsKey,
  isClipboardShortcut,
  isPrintScreen,
} from "../../lib/proctoring/keyboardSecurity";

describe("Keyboard Security Interceptors", () => {
  describe("DevTools Detection", () => {
    it("should detect F12 as a devtools key", () => {
      expect(isDevToolsKey({ key: "F12" })).toBe(true);
    });

    it("should detect Ctrl+Shift+I as devtools", () => {
      expect(isDevToolsKey({ key: "I", ctrlKey: true, shiftKey: true })).toBe(true);
    });

    it("should detect Ctrl+Shift+J as devtools", () => {
      expect(isDevToolsKey({ key: "J", ctrlKey: true, shiftKey: true })).toBe(true);
    });

    it("should detect Ctrl+Shift+C as devtools", () => {
      expect(isDevToolsKey({ key: "C", ctrlKey: true, shiftKey: true })).toBe(true);
    });

    it("should detect Cmd+Alt+I as devtools", () => {
      expect(isDevToolsKey({ key: "I", metaKey: true, altKey: true })).toBe(true);
    });

    it("should NOT flag regular key 'a' as devtools", () => {
      expect(isDevToolsKey({ key: "a" })).toBe(false);
    });

    it("should NOT flag Ctrl+Z as devtools", () => {
      expect(isDevToolsKey({ key: "z", ctrlKey: true })).toBe(false);
    });
  });

  describe("Clipboard Shortcut Detection", () => {
    it("should detect Ctrl+C as clipboard shortcut", () => {
      expect(isClipboardShortcut({ key: "c", ctrlKey: true })).toBe(true);
    });

    it("should detect Ctrl+V as clipboard shortcut", () => {
      expect(isClipboardShortcut({ key: "v", ctrlKey: true })).toBe(true);
    });

    it("should detect Ctrl+X as clipboard shortcut", () => {
      expect(isClipboardShortcut({ key: "x", ctrlKey: true })).toBe(true);
    });

    it("should detect Meta+C (Mac copy) as clipboard shortcut", () => {
      expect(isClipboardShortcut({ key: "c", metaKey: true })).toBe(true);
    });

    it("should NOT flag 'c' without modifier as clipboard shortcut", () => {
      expect(isClipboardShortcut({ key: "c" })).toBe(false);
    });
  });

  describe("PrintScreen Detection", () => {
    it("should detect PrintScreen key", () => {
      expect(isPrintScreen({ key: "PrintScreen" })).toBe(true);
    });

    it("should NOT detect other keys as PrintScreen", () => {
      expect(isPrintScreen({ key: "F12" })).toBe(false);
    });
  });
});
