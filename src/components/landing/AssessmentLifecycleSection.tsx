import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Code2,
  ShieldCheck,
  Zap,
  BarChart3,
  Check,
  Sparkles,
  ArrowRight,
  Globe,
  Award,
} from "lucide-react";

export interface LifecycleTab {
  id: string;
  stageName: string;
  title: string;
  category: string;
  description: string;
  longDescription: string;
  ctaPrimary: string;
  ctaSecondary: string;
  icon: React.ElementType;
  bannerBg: string;
  accentText: string;
  accentBtn: string;
}

export const lifecycleTabs: LifecycleTab[] = [
  {
    id: "author",
    stageName: "Author",
    title: "Question Studio & AI Test Generator",
    category: "AUTHOR",
    description:
      "Create coding challenges, MCQs, and adaptive tests with 100K+ curated questions.",
    longDescription:
      "Introducing Question Studio, an AI-enhanced assessment authoring engine that amplifies question relevance and syllabus coverage. Our platform generates rubric-aligned coding challenges and multi-tier MCQs across 35+ programming languages, custom unit test suites, and adaptive difficulty tracks effortlessly.",
    ctaPrimary: "Explore Question Studio",
    ctaSecondary: "View Question Bank",
    icon: Globe,
    bannerBg: "bg-[#9fbdfc] hover:brightness-[0.98]",
    accentText: "text-indigo-600",
    accentBtn: "bg-indigo-600 hover:bg-indigo-700 text-white",
  },
  {
    id: "proctor",
    stageName: "Proctor",
    title: "AI Anti-Cheating & Integrity Engine",
    category: "PROCTOR",
    description:
      "Client-side 468-point face mesh, gaze tracking, and strict tab-lock security.",
    longDescription:
      "Maintain flawless academic integrity with edge-computed neural proctoring. Monitor 468 facial landmarks, iris gaze trajectory, secondary voices, and tab-switching in real-time. Eliminates impersonation and unauthorized aids with zero cloud latency or invigilator bottlenecks.",
    ctaPrimary: "Hire AI Proctor",
    ctaSecondary: "See Live Demo",
    icon: ShieldCheck,
    bannerBg: "bg-[#cebdfa] hover:brightness-[0.98]",
    accentText: "text-violet-600",
    accentBtn: "bg-violet-600 hover:bg-violet-700 text-white",
  },
  {
    id: "evaluate",
    stageName: "Evaluate",
    title: "Instant Code Execution & Sandboxed Grading",
    category: "EVALUATE",
    description:
      "Dockerized code sandboxes, hidden edge cases, and automated scorecards.",
    longDescription:
      "Evaluate code submissions against millions of hidden boundary cases, time complexity constraints, and memory limits in isolated Docker sandboxes. Deliver objective grades, runtime performance curves, and diagnostic feedback the exact millisecond candidates finish.",
    ctaPrimary: "Inspect Evaluation Engine",
    ctaSecondary: "Sample Sandbox",
    icon: Zap,
    bannerBg: "bg-[#f2bcd4] hover:brightness-[0.98]",
    accentText: "text-pink-600",
    accentBtn: "bg-pink-600 hover:bg-pink-700 text-white",
  },
  {
    id: "analyze",
    stageName: "Analyze",
    title: "Talent Intelligence & Instant Shortlists",
    category: "ANALYZE",
    description:
      "Cohort skill matrices, nationwide percentiles, and 1-click ATS exports.",
    longDescription:
      "Cut manual interview time by up to 80%. Compare cohorts across multi-dimensional skill matrices, identify top 5% talent percentiles instantly, and download tamper-proof audit dossiers with synchronized proctoring timelines for university accreditation and recruiter ATSs.",
    ctaPrimary: "Explore Talent Reports",
    ctaSecondary: "Download Audit Dossier",
    icon: Award,
    bannerBg: "bg-[#fed1a8] hover:brightness-[0.98]",
    accentText: "text-amber-600",
    accentBtn: "bg-amber-600 hover:bg-amber-700 text-white",
  },
];

/* -------------------------------------------------------------------------
   Illustrations
   ------------------------------------------------------------------------- */

function AuthorIllustration() {
  return (
    <div className="relative w-full h-[360px] sm:h-[420px] lg:h-[460px] rounded-3xl overflow-hidden border border-indigo-100/80 shadow-md flex items-center justify-center bg-[#eef2ff] group">
      <img
        src="/landing/author_illustration.jpg"
        alt="Question Studio & AI Test Generator Illustration"
        className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.02]"
        loading="lazy"
      />
    </div>
  );
}

function ProctorIllustration() {
  return (
    <div className="relative w-full h-[360px] sm:h-[420px] lg:h-[460px] rounded-3xl overflow-hidden border border-purple-100/80 shadow-md flex items-center justify-center bg-[#f5f3ff] group">
      <img
        src="/landing/proctor_illustration.jpg"
        alt="AI Anti-Cheating & Integrity Engine Illustration"
        className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.02]"
        loading="lazy"
      />
    </div>
  );
}

function EvaluateIllustration() {
  return (
    <div className="relative w-full h-[360px] sm:h-[420px] lg:h-[460px] rounded-3xl overflow-hidden border border-pink-100/80 shadow-md flex items-center justify-center bg-[#fff1f2] group">
      <img
        src="/landing/evaluate_illustration.jpg"
        alt="Instant Code Execution & Sandboxed Grading Illustration"
        className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.02]"
        loading="lazy"
      />
    </div>
  );
}

function AnalyzeIllustration() {
  return (
    <div className="relative w-full h-[360px] sm:h-[420px] lg:h-[460px] rounded-3xl overflow-hidden border border-amber-100/80 shadow-md flex items-center justify-center bg-[#fff7ed] group">
      <img
        src="/landing/analyze_illustration.jpg"
        alt="Talent Intelligence & Instant Shortlists Illustration"
        className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.02]"
        loading="lazy"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------
   SECTION: Scroll-Driven Fixed Left Tabs with Dynamic Active Switch
   ------------------------------------------------------------------------- */

export function AssessmentInteractiveShowcase({
  onExploreClick,
}: {
  onExploreClick?: () => void;
}) {
  const [activeTabId, setActiveTabId] = useState<string>("author");

  // ScrollSpy: Listens to scroll and smoothly activates tabs based on scroll position
  // Accurate ScrollSpy: Uses getBoundingClientRect relative to viewport
  useEffect(() => {
    const stageIds = ["author", "proctor", "evaluate", "analyze"];

    const handleScroll = () => {
      const triggerPoint = window.innerHeight * 0.45; // 45% down the viewport

      let currentActive = stageIds[0];

      for (let i = 0; i < stageIds.length; i++) {
        const el = document.getElementById(`lifecycle-stage-${stageIds[i]}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          // If the section top has crossed above the trigger point, it becomes active
          if (rect.top <= triggerPoint) {
            currentActive = stageIds[i];
          }
        }
      }

      setActiveTabId(currentActive);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial check on mount
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToStage = (stageId: string) => {
    setActiveTabId(stageId);
    const element = document.getElementById(`lifecycle-stage-${stageId}`);
    if (element) {
      const navOffset = 90; // offset for floating navbar
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  const handleAction = () => {
    if (onExploreClick) {
      onExploreClick();
    } else {
      document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      id="lifecycle-showcase"
      className="py-16 md:py-24 bg-white relative overflow-visible border-b border-slate-100"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
        {/* Sleek Clean Centered Section Heading */}
        <div className="text-center mx-auto max-w-4xl mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-[44px] font-heading font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            The End-to-End Solution for Smart Hiring
          </h2>
        </div>

        <div className="relative flex items-start gap-6 sm:gap-8 lg:gap-12">
          {/* MOBILE STICKY TOP TABS (when on small screens) */}
          <div className="sm:hidden sticky top-16 z-40 w-full bg-white/95 backdrop-blur-md py-2.5 px-3 border-b border-slate-200 flex items-center justify-between gap-1.5 shadow-xs -mx-6 mb-8">
            {lifecycleTabs.map((tab) => {
              const isActive = tab.id === activeTabId;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => scrollToStage(tab.id)}
                  className={`flex-1 py-2 px-2 rounded-xl text-center font-bold text-xs transition-all ${
                    isActive
                      ? "bg-[#4338ca] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.stageName}
                </button>
              );
            })}
          </div>

          {/* DESKTOP STICKY VERTICAL CAPSULE PILL RAIL (Fixed on scroll, perfectly sized) */}
          <div className="hidden sm:block sticky top-28 lg:top-32 self-start z-40 pt-1 flex-shrink-0">
            <div className="flex flex-col gap-2.5 bg-white/95 backdrop-blur-md p-1.5 rounded-[22px] border border-slate-200/90 shadow-sm">
              {lifecycleTabs.map((tab) => {
                const isActive = tab.id === activeTabId;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => scrollToStage(tab.id)}
                    aria-label={`Jump to ${tab.stageName} stage`}
                    className={`w-9 sm:w-10 py-4 sm:py-5 rounded-xl border transition-all duration-200 flex items-center justify-center cursor-pointer select-none [writing-mode:vertical-rl] rotate-180 text-[10px] sm:text-[10.5px] font-mono font-bold tracking-widest uppercase ${
                      isActive
                        ? "bg-[#4338ca] text-white border-[#4338ca] shadow-md shadow-indigo-500/25 scale-105"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"
                    }`}
                    style={{ minHeight: "82px" }}
                  >
                    {tab.stageName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SCROLLING CONTENT STAGES (Alternating Text & Image on desktop) */}
          <div className="flex-1 space-y-28 sm:space-y-36">
            {/* STAGE 1: AUTHOR (Text Left, Image Right) */}
            <div
              id="lifecycle-stage-author"
              className="scroll-mt-28 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
            >
              <div className="lg:col-span-6 space-y-5 order-1 lg:order-1">
                <span className="text-xs font-mono font-bold tracking-widest text-indigo-600 uppercase block">
                  AUTHOR
                </span>
                <h3 className="text-3xl sm:text-4xl font-heading font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                  Question Studio & AI Test Generator
                </h3>
                <p className="text-base text-slate-600 leading-relaxed">
                  Introducing Question Studio, an AI-enhanced assessment authoring
                  engine that amplifies question relevance and syllabus coverage.
                  Our platform generates rubric-aligned coding challenges and
                  multi-tier MCQs across 35+ programming languages, custom unit
                  test suites, and adaptive difficulty tracks effortlessly.
                </p>
                <div className="flex flex-wrap items-center gap-3.5 pt-2">
                  <Button
                    onClick={handleAction}
                    className="px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-sm border-0 h-auto bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
                  >
                    <span>Explore Question Studio</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleAction}
                    className="px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 border-slate-200 h-auto text-slate-700 hover:bg-slate-50"
                  >
                    View Question Bank
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-6 w-full order-2 lg:order-2">
                <AuthorIllustration />
              </div>
            </div>

            {/* STAGE 2: PROCTOR (Image Left, Text Right) */}
            <div
              id="lifecycle-stage-proctor"
              className="scroll-mt-28 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
            >
              <div className="lg:col-span-6 w-full order-2 lg:order-1">
                <ProctorIllustration />
              </div>

              <div className="lg:col-span-6 space-y-5 order-1 lg:order-2">
                <span className="text-xs font-mono font-bold tracking-widest text-violet-600 uppercase block">
                  PROCTOR
                </span>
                <h3 className="text-3xl sm:text-4xl font-heading font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                  AI Anti-Cheating & Integrity Engine
                </h3>
                <p className="text-base text-slate-600 leading-relaxed">
                  Maintain flawless academic integrity with edge-computed neural
                  proctoring. Monitor 468 facial landmarks, iris gaze trajectory,
                  secondary voices, and tab-switching in real-time. Eliminates
                  impersonation and unauthorized aids with zero cloud latency or
                  invigilator bottlenecks.
                </p>
                <div className="flex flex-wrap items-center gap-3.5 pt-2">
                  <Button
                    onClick={handleAction}
                    className="px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-sm border-0 h-auto bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2"
                  >
                    <span>Hire AI Proctor</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleAction}
                    className="px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 border-slate-200 h-auto text-slate-700 hover:bg-slate-50"
                  >
                    See Live Demo
                  </Button>
                </div>
              </div>
            </div>

            {/* STAGE 3: EVALUATE (Text Left, Image Right) */}
            <div
              id="lifecycle-stage-evaluate"
              className="scroll-mt-28 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
            >
              <div className="lg:col-span-6 space-y-5 order-1 lg:order-1">
                <span className="text-xs font-mono font-bold tracking-widest text-pink-600 uppercase block">
                  EVALUATE
                </span>
                <h3 className="text-3xl sm:text-4xl font-heading font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                  Instant Code Execution & Sandboxed Grading
                </h3>
                <p className="text-base text-slate-600 leading-relaxed">
                  Evaluate code submissions against millions of hidden boundary
                  cases, time complexity constraints, and memory limits in
                  isolated Docker sandboxes. Deliver objective grades, runtime
                  performance curves, and diagnostic feedback the exact
                  millisecond candidates finish.
                </p>
                <div className="flex flex-wrap items-center gap-3.5 pt-2">
                  <Button
                    onClick={handleAction}
                    className="px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-sm border-0 h-auto bg-pink-600 hover:bg-pink-700 text-white flex items-center gap-2"
                  >
                    <span>Inspect Evaluation Engine</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleAction}
                    className="px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 border-slate-200 h-auto text-slate-700 hover:bg-slate-50"
                  >
                    Sample Sandbox
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-6 w-full order-2 lg:order-2">
                <EvaluateIllustration />
              </div>
            </div>

            {/* STAGE 4: ANALYZE (Image Left, Text Right) */}
            <div
              id="lifecycle-stage-analyze"
              className="scroll-mt-28 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
            >
              <div className="lg:col-span-6 w-full order-2 lg:order-1">
                <AnalyzeIllustration />
              </div>

              <div className="lg:col-span-6 space-y-5 order-1 lg:order-2">
                <span className="text-xs font-mono font-bold tracking-widest text-amber-600 uppercase block">
                  ANALYZE
                </span>
                <h3 className="text-3xl sm:text-4xl font-heading font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                  Talent Intelligence & Instant Shortlists
                </h3>
                <p className="text-base text-slate-600 leading-relaxed">
                  Cut manual interview time by up to 80%. Compare cohorts across
                  multi-dimensional skill matrices, identify top 5% talent
                  percentiles instantly, and download tamper-proof audit dossiers
                  with synchronized proctoring timelines for university
                  accreditation and recruiter ATSs.
                </p>
                <div className="flex flex-wrap items-center gap-3.5 pt-2">
                  <Button
                    onClick={handleAction}
                    className="px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-sm border-0 h-auto bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2"
                  >
                    <span>Explore Talent Reports</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleAction}
                    className="px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 border-slate-200 h-auto text-slate-700 hover:bg-slate-50"
                  >
                    Download Audit Dossier
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------
   Combined default export
   ------------------------------------------------------------------------- */

export function AssessmentLifecycleSection({
  onExploreClick,
}: {
  onExploreClick?: () => void;
}) {
  return <AssessmentInteractiveShowcase onExploreClick={onExploreClick} />;
}
