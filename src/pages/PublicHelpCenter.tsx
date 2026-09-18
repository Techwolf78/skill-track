import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  HelpCircle,
  AlertTriangle,
  Activity,
  CheckCircle2,
  LifeBuoy,
  MessageSquare,
  Send,
  Sparkles,
  X,
  Info,
  ShieldCheck,
  Laptop,
  GraduationCap,
  Briefcase,
  Layers,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { GryphonLogo } from "@/components/ui/GryphonLogo";
import {
  ERROR_CODES_DATA,
  FAQ_DATA,
  ErrorCodeItem,
  FaqItem,
} from "@/data/helpCenterData";
import { cn } from "@/lib/utils";

export default function PublicHelpCenter() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  // Active Tab State: Default is FAQs
  const [activeSectionTab, setActiveSectionTab] = useState<
    "faqs" | "errors" | "status"
  >("faqs");
  const [searchQuery, setSearchQuery] = useState("");
  const [faqCategory, setFaqCategory] = useState<string>("All");

  // Error Code Search State
  const [errorCodeQuery, setErrorCodeQuery] = useState("");

  // Support Ticket Form State
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    name: "",
    email: "",
    role: "Candidate",
    category: "Technical Issue / Login",
    priority: "MEDIUM",
    subject: "",
    description: "",
  });
  const [ticketSubmittedId, setTicketSubmittedId] = useState<string | null>(
    null,
  );

  // Handle URL Param & Route Path changes
  useEffect(() => {
    if (location.pathname === "/status") {
      setActiveSectionTab("status");
      return;
    }
    const tab = searchParams.get("tab");
    if (tab === "status") setActiveSectionTab("status");
    else if (tab === "errors") setActiveSectionTab("errors");
    else if (tab === "faqs") setActiveSectionTab("faqs");
  }, [searchParams, location.pathname]);

  // Keyboard shortcut Ctrl+K / Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("help-search-input")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filtered FAQs based on category and smart tokenized search query
  const filteredFaqs = useMemo(() => {
    let list = FAQ_DATA;
    if (faqCategory !== "All") {
      list = list.filter(
        (f) => f.category.toLowerCase() === faqCategory.toLowerCase(),
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const tokens = q
        .split(/[\s,&+]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 1);

      return list.filter((f) => {
        const fullText =
          `${f.question} ${f.answer} ${f.category} ${f.tags.join(" ")}`.toLowerCase();
        // Exact match or matches any of the keyword tokens
        if (fullText.includes(q)) return true;
        return tokens.some((token) => fullText.includes(token));
      });
    }
    return list;
  }, [faqCategory, searchQuery]);

  // Filtered Error Codes with smart tokenized search query
  const filteredErrorCodes = useMemo(() => {
    const query = errorCodeQuery.trim() || searchQuery.trim();
    if (!query) return ERROR_CODES_DATA;
    const q = query.toLowerCase().trim();
    const tokens = q
      .split(/[\s,&+]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 1);

    return ERROR_CODES_DATA.filter((e) => {
      const fullText =
        `${e.code} ${e.title} ${e.description} ${e.symptom} ${e.category} ${e.resolutionSteps.join(" ")}`.toLowerCase();
      if (fullText.includes(q)) return true;
      return tokens.some((token) => fullText.includes(token));
    });
  }, [errorCodeQuery, searchQuery]);

  const handlePopularTagClick = (tag: string) => {
    setSearchQuery(tag);
    setFaqCategory("All");
    setActiveSectionTab("faqs");
    // Smooth scroll to the FAQs container so the user sees results immediately
    setTimeout(() => {
      document.getElementById("faq-section-container")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  };

  // Ticket submission handler
  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.email || !ticketForm.subject || !ticketForm.description) {
      sonnerToast.error("Please fill in all required fields");
      return;
    }
    const tktId = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
    setTicketSubmittedId(tktId);
    sonnerToast.success("Support Ticket Created", {
      description: `Reference #${tktId}. Our support desk will contact ${ticketForm.email} shortly.`,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans selection:bg-indigo-500/15 selection:text-indigo-900">
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2.5 group transition-transform active:scale-95"
            >
              <GryphonLogo variant="light" size="md" />
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTicketModalOpen(true)}
              className="text-xs h-9 font-semibold text-slate-700 border-slate-300 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 rounded-lg shadow-2xs"
            >
              <LifeBuoy className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              <span>Contact Support</span>
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/login")}
              className="text-xs h-9 font-semibold bg-slate-950 hover:bg-slate-800 text-white rounded-lg shadow-sm"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* 2. Hero Search Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50 to-[#F1F5F9] border-b border-slate-200/80 pt-12 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              How can we{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700">
                help you
              </span>{" "}
              today?
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto mt-2">
              Find instant answers to common exam questions, troubleshoot error
              codes, verify system status, or submit a support ticket.
            </p>
          </motion.div>

          {/* Crisp Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="relative max-w-2xl mx-auto"
          >
            <div className="relative flex items-center bg-white rounded-xl border border-slate-300 shadow-xs hover:border-slate-400 focus-within:border-indigo-600 focus-within:ring-3 focus-within:ring-indigo-600/15 transition-all">
              <Search className="w-5 h-5 text-slate-400 ml-4 shrink-0 pointer-events-none" />
              <input
                id="help-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search test rules, camera help, error codes, login assistance... (Ctrl+K)"
                className="w-full h-12 pl-3 pr-24 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent border-none outline-none focus:outline-none focus:ring-0"
              />
              <div className="absolute right-3 flex items-center gap-1.5">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded-md shadow-2xs">
                  ⌘K
                </kbd>
              </div>
            </div>

            {/* Clean Popular Search Suggestions */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 text-xs text-slate-500">
              <span className="font-semibold text-slate-400 mr-1">
                Popular:
              </span>
              {[
                "Camera Permission",
                "Internet Disconnection",
                "Test Rules & Window",
                "Login & Access Code",
                "Scorecard & Results",
                "Privacy & Security",
              ].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handlePopularTagClick(tag)}
                  className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-indigo-600 bg-white hover:bg-indigo-50/70 border border-slate-200/90 hover:border-indigo-200 rounded-lg transition-colors shadow-2xs cursor-pointer active:scale-95"
                >
                  {tag}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Quick Action Grid */}
        </div>
      </section>

      {/* 3. Main Content Hub */}
      <main
        id="faq-section-container"
        className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8"
      >
        {/* Navigation Segmented Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 inline-flex flex-wrap gap-1">
            <button
              onClick={() => setActiveSectionTab("faqs")}
              className={cn(
                "px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all",
                activeSectionTab === "faqs"
                  ? "bg-white text-indigo-700 font-bold shadow-xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60",
              )}
            >
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              <span>Frequently Asked Questions</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                {FAQ_DATA.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSectionTab("errors")}
              className={cn(
                "px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all",
                activeSectionTab === "errors"
                  ? "bg-white text-rose-700 font-bold shadow-xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60",
              )}
            >
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Error Code Troubleshooter</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-50 text-rose-700">
                {ERROR_CODES_DATA.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSectionTab("status")}
              className={cn(
                "px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all",
                activeSectionTab === "status"
                  ? "bg-white text-emerald-800 font-bold shadow-xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60",
              )}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>System Status</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTicketModalOpen(true)}
            className="text-xs h-9 font-semibold text-indigo-600 bg-indigo-50/60 hover:bg-indigo-100/70 border-indigo-200/80 rounded-xl transition-all shadow-2xs gap-1.5 self-start sm:self-auto"
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
            <span>Need Help? Submit Ticket</span>
          </Button>
        </div>

        {/* SECTION 1: FAQS ACCORDION */}
        {activeSectionTab === "faqs" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    Frequently Asked Questions
                  </h2>
                  <Badge
                    variant="outline"
                    className="text-xs font-mono font-semibold bg-indigo-50 text-indigo-700 border-indigo-200"
                  >
                    {filteredFaqs.length}{" "}
                    {filteredFaqs.length === 1 ? "answer" : "answers"}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                  Clear answers regarding test access, camera permissions,
                  internet recovery, and test rules.
                </p>
              </div>

              {/* FAQ Category Pills */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  "All",
                  "Candidates",
                  "Proctoring",
                  "Security & Privacy",
                  "General",
                  "Recruiters",
                  "Coding Engine",
                ].map((fc) => (
                  <button
                    key={fc}
                    onClick={() => setFaqCategory(fc)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer",
                      faqCategory === fc
                        ? "bg-slate-950 text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    {fc}
                  </button>
                ))}
              </div>
            </div>

            {/* FAQs List or Empty State */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs divide-y divide-slate-100">
              {filteredFaqs.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      No FAQs found matching &ldquo;{searchQuery}&rdquo;
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      We couldn&apos;t find any questions matching your query in
                      the &ldquo;{faqCategory}&rdquo; category. Try clearing
                      your search or exploring the Error Code Directory.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("");
                        setFaqCategory("All");
                      }}
                      className="text-xs rounded-lg"
                    >
                      Clear Search Filter
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setActiveSectionTab("errors")}
                      className="text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-400" />
                      Check Error Code Directory
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsTicketModalOpen(true)}
                      className="text-xs text-indigo-600 hover:bg-indigo-50"
                    >
                      <LifeBuoy className="w-3.5 h-3.5 mr-1" />
                      Contact Support
                    </Button>
                  </div>
                </div>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {filteredFaqs.map((faq) => (
                    <AccordionItem
                      key={faq.id}
                      value={faq.id}
                      className="border-b border-slate-100 last:border-0 py-1"
                    >
                      <AccordionTrigger className="text-left font-bold text-sm sm:text-base text-slate-900 hover:text-indigo-600 transition-colors hover:no-underline py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                          <span>{faq.question}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-4.5 pb-4">
                        <p>{faq.answer}</p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                            {faq.category}
                          </span>
                          {faq.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>
          </div>
        )}

        {/* SECTION 2: ERROR CODE TROUBLESHOOTER */}
        {activeSectionTab === "errors" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    Error Code Dictionary & Quick Resolutions
                  </h2>
                  <Badge
                    variant="outline"
                    className="text-xs font-mono font-semibold bg-rose-50 text-rose-700 border-rose-200"
                  >
                    {filteredErrorCodes.length}{" "}
                    {filteredErrorCodes.length === 1 ? "code" : "codes"}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                  Lookup error codes displayed on your test screen for immediate
                  step-by-step resolution.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={errorCodeQuery}
                  onChange={(e) => setErrorCodeQuery(e.target.value)}
                  placeholder="Search code e.g. ERR_CAMERA..."
                  className="pl-8 h-9 text-xs bg-white"
                />
              </div>
            </div>

            {filteredErrorCodes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-4 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    No error codes found matching &ldquo;
                    {errorCodeQuery || searchQuery}&rdquo;
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Please verify the exact error code shown on your assessment
                    screen, or search our Frequently Asked Questions.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setErrorCodeQuery("");
                      setSearchQuery("");
                    }}
                    className="text-xs rounded-lg"
                  >
                    Clear Search
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setActiveSectionTab("faqs")}
                    className="text-xs bg-slate-900 text-white rounded-lg"
                  >
                    <HelpCircle className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                    Search Frequently Asked Questions
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredErrorCodes.map((err) => (
                  <div
                    key={err.code}
                    className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-100">
                          {err.code}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 mt-1.5">
                          {err.title}
                        </h3>
                      </div>

                      <span
                        className={cn(
                          "text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase",
                          err.severity === "CRITICAL" &&
                            "bg-rose-50 text-rose-700 border border-rose-200",
                          err.severity === "HIGH" &&
                            "bg-amber-50 text-amber-700 border border-amber-200",
                          err.severity === "MEDIUM" &&
                            "bg-indigo-50 text-indigo-700 border border-indigo-200",
                          err.severity === "LOW" &&
                            "bg-slate-100 text-slate-600",
                        )}
                      >
                        {err.severity}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {err.description}
                    </p>

                    <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Resolution Steps:</span>
                      </div>
                      <ul className="space-y-1 text-slate-600 pl-5 list-disc text-[11px] leading-relaxed">
                        {err.resolutionSteps.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: LIVE SYSTEM STATUS (CLEAN APPLE / iOS MINIMALIST STYLE) */}
        {activeSectionTab === "status" && (
          <div className="space-y-6">
            {/* Clean Apple-Style Status Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <span className="relative flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
                  </span>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight">
                      All Systems Operational
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Gryphon 360 platform, candidate assessment engines, and
                      proctoring services are operating normally.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Operational</span>
                  </span>
                </div>
              </div>

              {/* 90-Day Continuous SLA Uptime Ribbon */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="text-slate-400 font-medium">
                    90 days ago
                  </span>
                  <span className="font-semibold text-slate-700">
                    100.0% Platform Availability
                  </span>
                  <span className="text-slate-400 font-medium">Today</span>
                </div>
                <div className="flex items-center gap-1 h-7 w-full overflow-hidden">
                  {Array.from({ length: 45 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 h-full bg-emerald-500/85 hover:bg-emerald-600 rounded-[2px] transition-colors cursor-pointer"
                      title={`Day ${45 - i}: 100% Operational • 0 Incidents`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Past Incidents Card (Apple Style) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    Incident History
                  </h4>
                  <p className="text-xs text-slate-500">
                    No service disruptions or incidents reported in the past 90
                    days.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 self-start sm:self-auto shrink-0">
                100% Uptime
              </span>
            </div>
          </div>
        )}
      </main>

      {/* 4. Support Ticket Submission Modal */}
      <Dialog open={isTicketModalOpen} onOpenChange={setIsTicketModalOpen}>
        <DialogContent className="max-w-lg bg-white p-6 rounded-2xl border-slate-200 shadow-2xl">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-indigo-600" />
              <span>Contact 24/7 Technical Support</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Submit a support ticket and our technical team will respond
              directly to your email.
            </DialogDescription>
          </DialogHeader>

          {ticketSubmittedId ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Ticket #{ticketSubmittedId} Submitted
              </h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                We have queued your inquiry with priority{" "}
                <strong>{ticketForm.priority}</strong>. Confirmation sent to{" "}
                <strong>{ticketForm.email}</strong>.
              </p>
              <Button
                size="sm"
                onClick={() => {
                  setTicketSubmittedId(null);
                  setIsTicketModalOpen(false);
                }}
                className="mt-2 text-xs bg-slate-950 text-white"
              >
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={handleTicketSubmit} className="space-y-3.5 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Your Name *
                  </label>
                  <Input
                    required
                    value={ticketForm.name}
                    onChange={(e) =>
                      setTicketForm({ ...ticketForm, name: e.target.value })
                    }
                    placeholder="Aditya Sen"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Email Address *
                  </label>
                  <Input
                    type="email"
                    required
                    value={ticketForm.email}
                    onChange={(e) =>
                      setTicketForm({ ...ticketForm, email: e.target.value })
                    }
                    placeholder="aditya@student.edu"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Your Role
                  </label>
                  <select
                    value={ticketForm.role}
                    onChange={(e) =>
                      setTicketForm({ ...ticketForm, role: e.target.value })
                    }
                    className="w-full h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Candidate">Candidate / Student</option>
                    <option value="Recruiter">Recruiter / Evaluator</option>
                    <option value="Faculty">University Faculty</option>
                    <option value="Admin">Platform Administrator</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Priority Level
                  </label>
                  <select
                    value={ticketForm.priority}
                    onChange={(e) =>
                      setTicketForm({ ...ticketForm, priority: e.target.value })
                    }
                    className="w-full h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="LOW">Low (General Inquiry)</option>
                    <option value="MEDIUM">Medium (Feature/Question)</option>
                    <option value="HIGH">High (Upcoming Exam)</option>
                    <option value="CRITICAL">
                      Critical (Live Exam Blocked)
                    </option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Subject *
                </label>
                <Input
                  required
                  value={ticketForm.subject}
                  onChange={(e) =>
                    setTicketForm({ ...ticketForm, subject: e.target.value })
                  }
                  placeholder="e.g. Webcam permission issue on Google Chrome"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Issue Description *
                </label>
                <Textarea
                  required
                  rows={3}
                  value={ticketForm.description}
                  onChange={(e) =>
                    setTicketForm({
                      ...ticketForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Please specify test name, error code, browser version, or problem details..."
                  className="text-xs resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsTicketModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Submit Ticket
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 5. Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-900">
            <div className="flex items-center gap-3">
              <GryphonLogo variant="dark" size="md" />
            </div>

            <div className="flex flex-wrap gap-6 text-xs text-slate-400 font-medium">
              <button
                onClick={() => navigate("/")}
                className="hover:text-white transition-colors"
              >
                Home
              </button>
              <button
                onClick={() => setActiveSectionTab("faqs")}
                className="hover:text-white transition-colors"
              >
                FAQs
              </button>
              <button
                onClick={() => setActiveSectionTab("errors")}
                className="hover:text-white transition-colors"
              >
                Error Directory
              </button>
              <button
                onClick={() => setActiveSectionTab("status")}
                className="hover:text-white transition-colors"
              >
                Platform Status
              </button>
              <button
                onClick={() => setIsTicketModalOpen(true)}
                className="hover:text-white transition-colors"
              >
                Support Desk
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>
              &copy; 2026 Gryphon 360. All rights reserved. Secure &
              confidential assessment platform.
            </p>
            <div className="flex gap-4">
              <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-medium text-slate-400">
                Privacy Protected
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-medium text-slate-400">
                Secure Platform
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-medium text-slate-400">
                24/7 Monitored
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
