import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  BookOpen,
  Code2,
  Terminal,
  ExternalLink,
  Copy,
  Check,
  Download,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Printer,
  ShieldAlert,
  Server,
  Layers,
  FileCode2,
  Globe,
  HelpCircle,
  ArrowLeft,
  ChevronRight,
  Hash,
  Share2,
  Bookmark,
  Github,
  Play,
  Monitor,
  Cpu,
  GraduationCap,
  Sparkle,
  Sliders,
  TableProperties,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { DOCS_DATA, DocArticle } from "@/data/docsData";
import { cn } from "@/lib/utils";

export default function Documentation() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState<string>("overview-arch");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, "yes" | "no">>({});

  // Flatten all articles
  const allArticles = useMemo(() => {
    return DOCS_DATA.flatMap((sec) =>
      sec.articles.map((art) => ({
        ...art,
        sectionId: sec.id,
        sectionTitle: sec.title,
        sectionBadge: sec.badge,
      }))
    );
  }, []);

  // Filtered list for search
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return allArticles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q)) ||
        a.category.toLowerCase().includes(q)
    );
  }, [searchQuery, allArticles]);

  const currentArticle = useMemo(() => {
    return (
      allArticles.find((a) => a.id === selectedArticleId) || allArticles[0]
    );
  }, [selectedArticleId, allArticles]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast({
      title: "Copied to clipboard",
      description: "Code snippet ready to paste.",
    });
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleFeedback = (val: "yes" | "no") => {
    setFeedbackGiven((prev) => ({ ...prev, [currentArticle.id]: val }));
    toast({
      title: val === "yes" ? "Thanks for your feedback!" : "Feedback recorded",
      description:
        val === "yes"
          ? "Glad this guide was helpful."
          : "We'll work on refining this document.",
    });
  };

  const handleExportMarkdown = () => {
    const mdContent =
      `# ${currentArticle.title}\n\n> ${currentArticle.description}\n\nCategory: ${currentArticle.category} | Read time: ${currentArticle.readTime}\n\n${currentArticle.content.summary}\n\n` +
      currentArticle.content.sections
        .map((s) => `## ${s.heading}\n\n${s.body ? s.body.join("\n\n") : ""}\n\n`)
        .join("");

    const blob = new Blob([mdContent], {
      type: "text/markdown;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${currentArticle.slug}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Exported Markdown",
      description: `Downloaded ${currentArticle.slug}.md`,
    });
  };

  return (
    <div className="h-screen flex flex-col bg-white text-slate-900 font-sans selection:bg-orange-500/15 selection:text-orange-900 overflow-hidden">
      {/* 1. Clean White / Sunset Orange Fixed Top Navigation Bar */}
      <header className="shrink-0 z-50 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between gap-4 shadow-2xs">
        {/* Left: Branding & Version dropdown pill */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-orange-600 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-orange-50/50 hover:border-orange-200 transition-all shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Console</span>
          </button>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-1.5">
              <span className="text-orange-600">RxOne</span> docs
            </span>
            <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-mono font-medium text-slate-600">
              v2.4
            </span>
          </div>
        </div>

        {/* Center & Right: Search Ctrl+K, Links, Live Engine Badge */}
        <div className="flex items-center gap-4">
          <div className="relative w-48 sm:w-64 lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documentation... (Ctrl+K)"
              className="h-8 pl-8 pr-12 text-xs bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-orange-500/30 rounded-full"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-4 select-none items-center rounded border border-slate-200 bg-white px-1 text-[9px] font-mono text-slate-400">
              ⌘K
            </kbd>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 font-medium">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportMarkdown}
              className="h-8 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-1"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.print()}
              className="h-8 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-1"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print</span>
            </Button>
            <div className="relative px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-600 text-[11px] font-mono font-semibold">
              Live Engine
            </div>
          </div>
        </div>
      </header>

      {/* 2. Three-column Layout with Independent Scrolling */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_190px] gap-6 xl:gap-8 h-full">
          
          {/* LEFT SIDEBAR (Clean White Theme + Sunset Orange Active Indicators) */}
          <aside className="hidden lg:block h-full overflow-y-auto py-6 pr-4 text-xs scrollbar-thin scrollbar-thumb-slate-200 border-r border-slate-100">
            {/* Top Primary Navigation Group with Icons */}
            <div className="mb-6 pb-6 border-b border-slate-200 space-y-1">
              <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-orange-600 font-semibold bg-orange-50/80 border border-orange-200/60">
                <BookOpen className="w-4 h-4 text-orange-600" />
                <span>Documentation</span>
              </div>
              <a
                href="https://judge0.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Code2 className="w-4 h-4 text-slate-500" />
                  <span>Sandbox Engine</span>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-600">
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-emerald-600" />
                  <span>Proctoring AI</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  Edge
                </span>
              </div>
            </div>

            {searchQuery.trim() ? (
              // Search Results
              <div className="space-y-2">
                <div className="font-mono text-[11px] font-semibold text-orange-600 uppercase tracking-wider flex items-center justify-between">
                  <span>Results ({filteredArticles?.length || 0})</span>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-[10px] text-slate-400 hover:underline"
                  >
                    Clear
                  </button>
                </div>
                <ul className="space-y-1">
                  {filteredArticles?.map((art) => (
                    <li key={art.id}>
                      <button
                        onClick={() => {
                          setSelectedArticleId(art.id);
                          setSearchQuery("");
                        }}
                        className={cn(
                          "w-full text-left py-1.5 px-2.5 rounded-md transition-colors block text-xs",
                          selectedArticleId === art.id
                            ? "font-semibold text-orange-600 bg-orange-50 border border-orange-200"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        )}
                      >
                        {art.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              // Standard Multi-section Tree
              <nav className="space-y-7">
                {DOCS_DATA.map((sec) => (
                  <div key={sec.id} className="space-y-2.5">
                    <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-900">
                      {sec.title}
                    </h3>
                    <ul className="space-y-1 border-l border-slate-200 ml-1">
                      {sec.articles.map((art) => {
                        const isCurrent = selectedArticleId === art.id;
                        return (
                          <li key={art.id} className="-ml-px">
                            <button
                              onClick={() => setSelectedArticleId(art.id)}
                              className={cn(
                                "w-full text-left pl-3.5 py-1 text-xs transition-colors block border-l",
                                isCurrent
                                  ? "border-orange-500 font-bold text-orange-600"
                                  : "border-transparent text-slate-600 hover:border-slate-400 hover:text-slate-900"
                              )}
                            >
                              {art.title}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </nav>
            )}
          </aside>

          {/* CENTER ARTICLE (Clean White / Light Slate Theme) */}
          <main className="h-full overflow-y-auto py-6 pr-2 min-w-0 scrollbar-thin scrollbar-thumb-slate-200 scroll-smooth">
            {/* Category / Title / Subhead */}
            <div className="space-y-2 mb-6">
              <div className="font-mono text-xs font-semibold uppercase tracking-widest text-orange-600">
                {currentArticle.category}
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                {currentArticle.title}
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed pt-1">
                {currentArticle.description}
              </p>
            </div>

            {/* Quick Reference Table */}
            {currentArticle.content.quickReference && (
              <div className="my-8 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-slate-700">
                  <TableProperties className="w-3.5 h-3.5 text-orange-600" />
                  <span>Quick Reference Matrix</span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-800 font-semibold font-mono">
                        {currentArticle.content.quickReference.headers.map((h, hIdx) => (
                          <th key={hIdx} className="py-2.5 px-4 text-[11px] uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {currentArticle.content.quickReference.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-orange-50/30 transition-colors">
                          {row.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              className={cn(
                                "py-2.5 px-4 text-slate-700",
                                cIdx === 0 && "font-bold text-orange-600"
                              )}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Content Sections */}
            <div className="space-y-12">
              {currentArticle.content.sections.map((section, idx) => (
                <section key={idx} id={`section-${idx}`} className="space-y-4 scroll-mt-6">
                  <div className="space-y-1 border-b border-slate-200 pb-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2 group">
                      {section.heading}
                    </h2>
                    {section.subheading && (
                      <p className="text-xs text-slate-500 font-mono">{section.subheading}</p>
                    )}
                  </div>

                  <div className="space-y-3 text-slate-700 leading-7 text-[15px]">
                    {section.body && section.body.map((p, pIdx) => (
                      <p key={pIdx}>{p}</p>
                    ))}
                  </div>

                  {/* Parameter / Field Reference Table */}
                  {section.paramsTable && (
                    <div className="my-5 space-y-2">
                      <div className="text-xs font-mono text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-orange-600" />
                        <span>Parameters & Configuration</span>
                      </div>
                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-slate-800 font-semibold font-mono text-[11px]">
                              <th className="py-2.5 px-4">Field</th>
                              <th className="py-2.5 px-4">Type</th>
                              <th className="py-2.5 px-4">Default</th>
                              <th className="py-2.5 px-4">Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-sans text-xs">
                            {section.paramsTable.map((p, pIdx) => (
                              <tr key={pIdx} className="hover:bg-slate-50 transition-colors">
                                <td className="py-2.5 px-4 font-mono font-bold text-orange-600">
                                  {p.name}
                                </td>
                                <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">
                                  {p.type}
                                </td>
                                <td className="py-2.5 px-4 font-mono text-amber-700 font-medium text-[11px]">
                                  {p.default || "—"}
                                </td>
                                <td className="py-2.5 px-4 text-slate-700">
                                  {p.description}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Callout Alerts */}
                  {section.callout && (
                    <div
                      className={cn(
                        "my-5 rounded-xl border p-4 text-sm space-y-1",
                        section.callout.type === "tip" && "bg-sky-50 border-sky-200 text-sky-950",
                        section.callout.type === "warning" && "bg-amber-50 border-amber-200 text-amber-950",
                        section.callout.type === "danger" && "bg-rose-50 border-rose-200 text-rose-950",
                        section.callout.type === "note" && "bg-slate-50 border-slate-200 text-slate-900",
                        section.callout.type === "success" && "bg-emerald-50 border-emerald-200 text-emerald-950"
                      )}
                    >
                      <div className="font-semibold text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                        <span>
                          {section.callout.type === "tip" && "💡 Tip"}
                          {section.callout.type === "warning" && "⚠️ Caution"}
                          {section.callout.type === "danger" && "🛑 Important"}
                          {section.callout.type === "note" && "📌 Note"}
                          {section.callout.type === "success" && "✅ Validated"}
                        </span>
                        <span>— {section.callout.title}</span>
                      </div>
                      <p className="leading-relaxed opacity-95 text-xs sm:text-sm">{section.callout.text}</p>
                    </div>
                  )}

                  {/* Clean Technical Table */}
                  {section.table && (
                    <div className="overflow-x-auto my-5 rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-800 font-semibold font-mono">
                            {section.table.headers.map((h, hIdx) => (
                              <th key={hIdx} className="py-2.5 px-4 text-[11px] uppercase tracking-wider">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {section.table.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                              {row.map((cell, cIdx) => (
                                <td
                                  key={cIdx}
                                  className={cn(
                                    "py-2.5 px-4 text-slate-700",
                                    cIdx === 0 && "font-mono font-medium text-slate-900"
                                  )}
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Code Block Snippets */}
                  {section.codeSnippets && section.codeSnippets.length > 0 && (
                    <div className="my-5 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-md">
                      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                          <span className="ml-2 font-mono text-xs text-slate-400">
                            {section.codeSnippets[0].filename || section.codeSnippets[0].language}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopy(section.codeSnippets?.[0]?.code || "", `code-${idx}`)
                          }
                          className="h-7 text-xs text-slate-400 hover:text-white hover:bg-slate-800 gap-1.5"
                        >
                          {copiedKey === `code-${idx}` ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400 text-xs">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span className="text-xs">Copy</span>
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="p-4 overflow-x-auto font-mono text-xs text-slate-200 leading-relaxed">
                        <pre>
                          <code>{section.codeSnippets[0].code}</code>
                        </pre>
                      </div>
                    </div>
                  )}
                </section>
              ))}
            </div>

            {/* Bottom Feedback Widget */}
            <div className="mt-12 pt-8 pb-12 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-600">
                <span className="font-semibold text-slate-900">Was this page helpful?</span> Let us know your thoughts.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleFeedback("yes")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                    feedbackGiven[currentArticle.id] === "yes"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  )}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Yes</span>
                </button>
                <button
                  onClick={() => handleFeedback("no")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                    feedbackGiven[currentArticle.id] === "no"
                      ? "bg-rose-50 border-rose-300 text-rose-700"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  )}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  <span>No</span>
                </button>
              </div>
            </div>
          </main>

          {/* RIGHT SIDEBAR (Compact Slim "On this page" TOC) */}
          <aside className="hidden xl:block h-full overflow-y-auto py-6 pl-3 text-xs scrollbar-thin scrollbar-thumb-slate-200 border-l border-slate-100">
            <div className="space-y-3">
              <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-900">
                On this page
              </h4>
              <ul className="space-y-1.5 border-l border-slate-200 ml-0.5">
                {currentArticle.content.sections.map((sec, idx) => (
                  <li key={idx} className="-ml-px">
                    <a
                      href={`#section-${idx}`}
                      className="block pl-2.5 py-0.5 text-[11px] text-slate-500 hover:text-orange-600 hover:border-l hover:border-orange-500 transition-colors truncate"
                    >
                      {sec.heading}
                    </a>
                  </li>
                ))}
              </ul>

              {/* Compact Architecture Card */}
              <div className="pt-4 mt-4 border-t border-slate-200 space-y-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2.5 space-y-2 shadow-2xs">
                  <div className="text-[10px] font-mono text-orange-600 uppercase font-semibold">
                    Architecture
                  </div>
                  <div className="font-semibold text-[11px] text-slate-900 leading-snug">
                    RxOne High-Concurrency
                  </div>
                  <Button
                    size="sm"
                    className="w-full h-6 text-[10px] bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-md px-2"
                    onClick={() =>
                      toast({
                        title: "Video Stream",
                        description: "Engineering walkthrough player queued.",
                      })
                    }
                  >
                    Watch Overview →
                  </Button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
