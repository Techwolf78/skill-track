import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import Cal, { getCalApi } from "@calcom/embed-react";
import {
  Mail,
  Phone,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GryphonLogo } from "@/components/ui/GryphonLogo";

export default function ContactPage() {
  const navigate = useNavigate();

  useEffect(() => {
    (async function () {
      const cal = await getCalApi({ namespace: "30min" });
      cal("ui", {
        theme: "light",
        styles: { branding: { brandColor: "#f97316" } },
        hideEventTypeDetails: false,
        layout: "month_view",
      });
    })();
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Ultra-Slim White Compact iOS Navbar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-11 sm:h-12 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div
            className="shrink-0 flex items-center cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => navigate("/")}
          >
            <GryphonLogo variant="light" size="sm" iconOnly={false} />
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center justify-center gap-5 lg:gap-7 text-xs font-medium text-slate-600">
            <Link to="/#features" className="hover:text-slate-900 transition-colors py-1">
              Features
            </Link>
            <Link to="/#lifecycle-showcase" className="hover:text-slate-900 transition-colors py-1">
              Lifecycle
            </Link>
            <Link to="/#industries" className="hover:text-slate-900 transition-colors py-1">
              Industries
            </Link>
            <Link to="/#testimonials" className="hover:text-slate-900 transition-colors py-1">
              Testimonials
            </Link>
            <Link to="/#faq" className="hover:text-slate-900 transition-colors py-1">
              FAQs
            </Link>
            <Link
              to="/contact"
              className="text-slate-900 font-bold border-b-2 border-slate-900 py-0.5"
            >
              Contact
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/login")}
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full px-3 text-xs font-semibold h-7"
            >
              Login
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const el = document.getElementById("demo-form");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-slate-950 hover:bg-slate-900 text-white font-semibold rounded-full px-3.5 text-xs h-7 shadow-xs transition-all cursor-pointer"
            >
              <span>Book a Demo</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area - Auxy-Inspired Clean Minimalist Layout */}
      <main className="flex-1 pt-2 sm:pt-3 pb-6 sm:pb-8 bg-white">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
            {/* Left Column: Eyebrow + Headline + Cal.com Embed */}
            <div className="lg:col-span-9">
              <div className="max-w-2xl mb-1.5 sm:mb-2">
                <span className="text-[9px] font-bold text-primary tracking-widest uppercase block mb-0.5">
                  Contact Us
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight mb-0.5">
                  Let's talk about your assessment & hiring stack
                </h1>
                <p className="text-xs text-slate-600 leading-normal font-normal max-w-xl">
                  Tell us a bit about your institution and evaluation workflows, and we'll show you exactly how Gryphon 360 scales your assessments — no generic pitch, just a straight answer.
                </p>
              </div>

              {/* Cal.com Live Interactive Embed */}
              <div
                id="demo-form"
                className="w-full overflow-hidden"
              >
                <Cal
                  namespace="30min"
                  calLink="gryphon-academy/30min"
                  style={{ width: "100%", height: "100%", overflow: "scroll" }}
                  config={{ layout: "month_view", theme: "light" }}
                />
              </div>
            </div>

            {/* Right Column: 3 Clean Apple / Auxy Cards (Compact Sidebar) */}
            <div className="lg:col-span-3 space-y-2.5 lg:pt-0.5">
              {/* Card 1: Prefer email? */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-xs hover:border-slate-300 transition-all space-y-1">
                <div className="w-6 h-6 rounded-md bg-slate-950 text-white flex items-center justify-center">
                  <Mail className="w-3 h-3" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 pt-0.5">
                  Prefer email?
                </h3>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Reach our team directly and we'll route your message to the right person.
                </p>
                <a
                  href="mailto:gryphon360@gryphonacademy.co.in"
                  className="text-[10.5px] font-semibold text-primary hover:underline font-mono inline-block pt-0.5 break-all"
                >
                  gryphon360@gryphonacademy.co.in
                </a>
              </div>

              {/* Card 2: Prefer to talk live? */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-xs hover:border-slate-300 transition-all space-y-1">
                <div className="w-6 h-6 rounded-md bg-slate-950 text-white flex items-center justify-center">
                  <Phone className="w-3 h-3" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 pt-0.5">
                  Prefer to talk live?
                </h3>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Book time on our calendar and we'll walk through your use case together.
                </p>
                <a
                  href="https://cal.com/gryphon-academy/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-slate-900 hover:text-primary transition-colors inline-flex items-center gap-1 pt-0.5"
                >
                  <span>Book a demo</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </a>
              </div>

              {/* Card 3: Already a partner? */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-xs hover:border-slate-300 transition-all space-y-1">
                <div className="w-6 h-6 rounded-md bg-slate-950 text-white flex items-center justify-center">
                  <ShieldCheck className="w-3 h-3" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 pt-0.5">
                  Already a customer?
                </h3>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Check our FAQ for quick answers, or reach your account team directly.
                </p>
                <Link
                  to="/help"
                  className="text-[11px] font-semibold text-slate-900 hover:text-primary transition-colors inline-flex items-center gap-1 pt-0.5"
                >
                  <span>Visit FAQ</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </Link>
              </div>

              {/* Headquarters Note */}
              <div className="px-0.5 pt-0.5">
                <span className="text-[9px] text-slate-400 uppercase font-semibold tracking-wider block mb-0.5">
                  Headquarters
                </span>
                <p className="text-[10.5px] text-slate-500 leading-tight">
                  <strong className="text-slate-700 font-medium">Gryphon Academy Pvt. Ltd.</strong> <br />
                  9th Floor, Olympia Business House, Baner, Pune 411045
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-16 relative overflow-hidden mt-auto">
        {/* Aesthetic Flowing Gradient Line */}
        <div
          className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600"
          style={{
            backgroundSize: "200% auto",
            animation: "gradientFlow 5s linear infinite",
          }}
        />

        {/* Floating Glowing Gradient Orb */}
        <motion.div
          className="absolute -bottom-20 -right-20 w-[450px] h-[450px] bg-gradient-to-br from-primary/15 to-transparent rounded-full blur-[120px] pointer-events-none"
          animate={{
            scale: [1, 1.15, 0.95, 1],
            x: [0, 20, -10, 0],
            y: [0, -20, 15, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 10,
            ease: "easeInOut",
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12">
            {/* Brand column */}
            <div className="lg:col-span-2 space-y-5">
              <div className="flex items-center gap-3">
                <GryphonLogo variant="dark" size="lg" />
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
                India's premier skill assessment platform, trusted by colleges,
                universities, and leading corporate enterprises nationwide to
                deliver bulletproof evaluation at scale.
              </p>
              {/* Optional Badges or Social row */}
              <div className="flex gap-3 text-xs text-slate-500 font-mono">
                <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Secure Assessment
                </span>
                <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  ISO 27001
                </span>
              </div>
            </div>

            {/* Link column 1 */}
            <div>
              <h4 className="font-heading font-bold text-sm text-white mb-4 uppercase tracking-wider text-[10px]">
                Product
              </h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link
                    to="/#features"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    to="/#faq"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    FAQs & Proctoring
                  </Link>
                </li>
                <li>
                  <Link
                    to="/#security"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Security
                  </Link>
                </li>
                <li>
                  <Link
                    to="/#integrations"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Integrations
                  </Link>
                </li>
              </ul>
            </div>

            {/* Link column 2 */}
            <div>
              <h4 className="font-heading font-bold text-sm text-white mb-4 uppercase tracking-wider text-[10px]">
                Company
              </h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link
                    to="/"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    to="/"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Careers
                  </Link>
                </li>
                <li>
                  <Link
                    to="/"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Press Kit
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="hover:text-primary transition-colors duration-200 text-primary font-semibold"
                  >
                    Contact & Book Demo
                  </Link>
                </li>
              </ul>
            </div>

            {/* Link column 3 */}
            <div>
              <h4 className="font-heading font-bold text-sm text-white mb-4 uppercase tracking-wider text-[10px]">
                Support & Contact
              </h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link
                    to="/help"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link
                    to="/help?tab=faqs"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Community & FAQs
                  </Link>
                </li>
                <li>
                  <Link
                    to="/status"
                    className="hover:text-primary transition-colors duration-200 flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Platform Status
                  </Link>
                </li>
                <li>
                  <a
                    href="mailto:gryphon360@gryphonacademy.co.in"
                    className="hover:text-primary text-slate-300 transition-colors duration-200 font-mono text-xs flex items-center gap-1.5"
                  >
                    gryphon360@gryphonacademy.co.in
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright Bar */}
          <div className="border-t border-slate-900 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p className="order-2 md:order-1">
              &copy; 2026 Gryphon 360. All rights reserved. Made with ❤️ for
              India's education sector.
            </p>
            <div className="flex gap-6 order-1 md:order-2">
              <a href="#" className="hover:text-slate-400 transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-slate-400 transition-colors">
                Terms of Service
              </a>
              <a href="#" className="hover:text-slate-450 transition-colors">
                SLA Agreement
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
