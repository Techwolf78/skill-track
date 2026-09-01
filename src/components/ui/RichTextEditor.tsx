import React, { useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Code,
  Link as LinkIcon,
  Quote,
  Minus,
  Undo2,
  Redo2,
  Trash2,
  Globe,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = "Write instructions for candidates...",
  className = "",
  minHeight = "160px",
}) => {
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [isSelectionCollapsed, setIsSelectionCollapsed] = useState(true);
  const [hasExistingLink, setHasExistingLink] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Underline,
      Superscript,
      Subscript,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-[#4353a4] underline font-medium cursor-pointer",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: content || "",
    editorProps: {
      attributes: {
        class: `prose prose-slate prose-sm max-w-none focus:outline-none px-3.5 py-3 text-slate-800 text-xs leading-relaxed bg-white font-sans [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1 [&_p]:my-1 [&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:p-3 [&_pre]:rounded-xs [&_pre]:font-mono [&_pre]:text-[11px] [&_pre]:leading-normal [&_pre]:my-2 [&_code]:font-mono [&_code]:text-[11px] [&_code]:bg-slate-100 [&_code]:text-pink-600 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded-xs [&_pre_code]:bg-transparent [&_pre_code]:text-inherit [&_pre_code]:p-0 [&_a]:text-[#4353a4] [&_a]:underline [&_a]:font-medium [&_blockquote]:border-none [&_blockquote]:italic [&_blockquote]:text-slate-700 [&_blockquote]:my-1.5 [&_blockquote]:px-1 [&_blockquote]:before:content-['“'] [&_blockquote]:after:content-['”'] [&_blockquote]:before:font-serif [&_blockquote]:after:font-serif [&_blockquote]:before:text-[#4353a4] [&_blockquote]:after:text-[#4353a4] [&_blockquote]:before:font-bold [&_blockquote]:after:font-bold`,
        style: `min-height: ${minHeight};`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  React.useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "", false as any);
    }
  }, [content, editor]);

  const toggleSuperscript = useCallback(() => {
    if (!editor) return;
    if (editor.isActive("superscript")) {
      const { from, to } = editor.state.selection;
      if (from === to) {
        editor.chain().focus().unsetSuperscript().insertContent("\u200B").run();
      } else {
        editor.chain().focus().unsetSuperscript().run();
      }
    } else {
      editor.chain().focus().unsetSubscript().setSuperscript().run();
    }
  }, [editor]);

  const toggleSubscript = useCallback(() => {
    if (!editor) return;
    if (editor.isActive("subscript")) {
      const { from, to } = editor.state.selection;
      if (from === to) {
        editor.chain().focus().unsetSubscript().insertContent("\u200B").run();
      } else {
        editor.chain().focus().unsetSubscript().run();
      }
    } else {
      editor.chain().focus().unsetSuperscript().setSubscript().run();
    }
  }, [editor]);

  const openLinkModal = useCallback(() => {
    if (!editor) return;
    const currentHref = (editor.getAttributes("link").href as string) || "";
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");

    const cleanInitialUrl = currentHref.replace(/^https?:\/\//i, "");

    setLinkUrl(cleanInitialUrl);
    setLinkText(selectedText || "");
    setIsSelectionCollapsed(from === to);
    setHasExistingLink(Boolean(currentHref));
    setIsLinkModalOpen(true);
  }, [editor]);

  const handleUrlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    // Strip accidental prefix duplications if user typed or pasted https:// or http://
    val = val.replace(/^(https?:\/\/)+/i, "");
    setLinkUrl(val);
  };

  const handleApplyLink = () => {
    if (!editor) return;
    const trimmed = linkUrl.trim();

    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setIsLinkModalOpen(false);
      return;
    }

    // Build normalized clean URL
    const normalizedUrl = `https://${trimmed.replace(/^(https?:\/\/)+/i, "")}`;

    if (isSelectionCollapsed) {
      const displayText = linkText.trim() || normalizedUrl;
      editor
        .chain()
        .focus()
        .insertContent(`<a href="${normalizedUrl}">${displayText}</a> `)
        .run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: normalizedUrl })
        .run();
    }

    setIsLinkModalOpen(false);
  };

  const handleRemoveLink = () => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setIsLinkModalOpen(false);
  };

  if (!editor) {
    return (
      <div className="border border-slate-200 rounded-xs bg-white p-6 flex flex-col items-center justify-center gap-2 min-h-[160px]">
        <div className="w-5 h-5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-[11px] text-slate-400">Loading editor...</span>
      </div>
    );
  }

  const charCount = editor.getText().length;

  return (
    <>
      <div className={`border border-slate-200 rounded-xs overflow-hidden bg-white flex flex-col shadow-xs focus-within:border-[#4353a4] transition-colors ${className}`}>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50/80 shrink-0 select-none">
          {/* Text Formatting Group */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive("underline")}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </ToolbarButton>

          <div className="w-px h-4 bg-slate-200 mx-1" />

          {/* Script / Powers Group */}
          <ToolbarButton
            onClick={toggleSuperscript}
            isActive={editor.isActive("superscript")}
            title="Superscript (X²)"
          >
            <span className="font-mono text-[11px] font-bold leading-none select-none">
              X<sup className="text-[8px]">2</sup>
            </span>
          </ToolbarButton>
          <ToolbarButton
            onClick={toggleSubscript}
            isActive={editor.isActive("subscript")}
            title="Subscript (X₂)"
          >
            <span className="font-mono text-[11px] font-bold leading-none select-none">
              X<sub className="text-[8px]">2</sub>
            </span>
          </ToolbarButton>

          <div className="w-px h-4 bg-slate-200 mx-1" />

          {/* Blockquote, Code & Link */}
          <ToolbarButton
            onClick={openLinkModal}
            isActive={editor.isActive("link")}
            title="Insert / Edit Link"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive("blockquote")}
            title="Blockquote (”)"
          >
            <Quote className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive("codeBlock")}
            title="Code Block (<>)"
          >
            <Code className="w-3.5 h-3.5" />
          </ToolbarButton>

          <div className="w-px h-4 bg-slate-200 mx-1" />

          {/* List Group */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            title="Bullet List"
          >
            <List className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            title="Numbered List"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </ToolbarButton>

          <div className="w-px h-4 bg-slate-200 mx-1" />

          {/* Alignment Group */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            isActive={editor.isActive({ textAlign: "left" })}
            title="Align Left"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            isActive={editor.isActive({ textAlign: "center" })}
            title="Align Center"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            isActive={editor.isActive({ textAlign: "right" })}
            title="Align Right"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </ToolbarButton>

          <div className="w-px h-4 bg-slate-200 mx-1" />

          {/* Extras */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal Line"
          >
            <Minus className="w-3.5 h-3.5" />
          </ToolbarButton>

          <div className="w-px h-4 bg-slate-200 mx-1" />

          {/* Undo / Redo */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </ToolbarButton>
        </div>

        {/* Editor Content Area */}
        <div className="relative flex-1 flex flex-col justify-between">
          <EditorContent editor={editor} className="cursor-text" />
          <div className="flex items-center justify-end px-3 py-1.5 text-[11px] text-slate-400 select-none border-t border-slate-100 bg-slate-50/50">
            <span>{charCount} characters</span>
          </div>
        </div>
      </div>

      {/* DoSelect-Themed Link Modal */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="max-w-md bg-white border border-slate-200 rounded-xs shadow-lg p-0 overflow-hidden font-sans">
          <DialogHeader className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
            <DialogTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#4353a4]" />
              <span>{hasExistingLink ? "Edit Link" : "Insert Link"}</span>
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleApplyLink();
            }}
            className="p-5 space-y-4"
          >
            {/* URL Input with Prefix Badge */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Target URL
              </label>
              <div className="flex items-stretch border border-slate-200 focus-within:border-[#4353a4] transition-colors rounded-xs overflow-hidden">
                <span className="bg-slate-100 border-r border-slate-200 px-3 flex items-center text-xs font-mono text-slate-500 select-none">
                  https://
                </span>
                <input
                  type="text"
                  autoFocus
                  value={linkUrl}
                  onChange={handleUrlInputChange}
                  placeholder="example.com/documentation"
                  className="flex-1 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none bg-white font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Paste the destination web link. Leading "https://" is handled automatically.
              </p>
            </div>

            {/* Display Text (if selection was empty) */}
            {isSelectionCollapsed && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Link Text <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="e.g. Read Test Guidelines"
                  className="w-full border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4353a4] rounded-xs"
                />
              </div>
            )}

            <DialogFooter className="pt-2 border-t border-slate-100 flex items-center justify-between sm:justify-between">
              {hasExistingLink ? (
                <button
                  type="button"
                  onClick={handleRemoveLink}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Link</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold uppercase tracking-wider rounded-xs shadow-xs transition-colors cursor-pointer"
                >
                  {hasExistingLink ? "Update Link" : "Insert Link"}
                </button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Toolbar button component
const ToolbarButton: React.FC<{
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}> = ({ onClick, isActive = false, disabled = false, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-1.5 rounded-xs transition-colors ${
      isActive
        ? "bg-slate-200 text-slate-900 font-semibold shadow-xs"
        : disabled
        ? "text-slate-300 cursor-not-allowed"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
    }`}
  >
    {children}
  </button>
);
