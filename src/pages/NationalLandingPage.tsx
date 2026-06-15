import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  GraduationCap,
  Shield,
  BarChart3,
  Users,
  Clock,
  Award,
  CheckCircle,
  Star,
  ArrowRight,
  Building,
  BookOpen,
  Target,
  Zap,
  Globe,
  TrendingUp,
  Mail,
  Phone,
  MapPin,
  Play,
  Code2,
  Terminal,
  Sparkles,
  Check,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const features = [
  {
    icon: Shield,
    title: "Advanced Anti-Cheating",
    description:
      "AI-powered proctoring with real-time monitoring and automated violation detection.",
  },
  {
    icon: BarChart3,
    title: "Comprehensive Analytics",
    description:
      "Detailed performance insights with customizable reports and data-driven insights.",
  },
  {
    icon: Clock,
    title: "Real-time Assessment",
    description:
      "Instant evaluation with automated grading and immediate feedback systems.",
  },
  {
    icon: Target,
    title: "Custom Test Builder",
    description:
      "Create assessments with multiple question types, coding challenges, and adaptive difficulty.",
  },
  {
    icon: Users,
    title: "Multi-user Management",
    description:
      "Role-based access control for administrators, trainers, and students with bulk operations.",
  },
  {
    icon: Award,
    title: "Certification Ready",
    description:
      "Generate professional certificates and badges with blockchain verification.",
  },
];

const stats = [
  { number: "50,000+", label: "Students Assessed" },
  { number: "500+", label: "Partner Institutions" },
  { number: "98%", label: "Accuracy Rate" },
  { number: "24/7", label: "Support Available" },
];

const testimonials = [
  {
    name: "Dr. Rajesh Kumar",
    role: "Director, IIT Delhi",
    content:
      "RxOne has revolutionized our assessment process. The anti-cheating features and detailed analytics have helped us maintain academic integrity while providing valuable insights.",
    rating: 5,
  },
  {
    name: "Priya Sharma",
    role: "HR Director, TCS",
    content:
      "The platform's scalability and customization options make it perfect for our large-scale recruitment drives. The automated evaluation saves us countless hours.",
    rating: 5,
  },
  {
    name: "Prof. Amit Patel",
    role: "Dean, Engineering College",
    content:
      "Outstanding platform for conducting online examinations. The real-time monitoring and comprehensive reporting features are exactly what we needed.",
    rating: 5,
  },
];

const useCases = [
  {
    icon: GraduationCap,
    title: "Educational Institutions",
    description:
      "Conduct secure online examinations, entrance tests, and skill assessments for universities and colleges nationwide.",
  },
  {
    icon: Building,
    title: "Corporate Training",
    description:
      "Evaluate employee skills, conduct certification programs, and measure training effectiveness across organizations.",
  },
  {
    icon: Users,
    title: "Placement Agencies",
    description:
      "Streamline candidate assessment with standardized tests and automated evaluation for better hiring decisions.",
  },
  {
    icon: BookOpen,
    title: "Government Programs",
    description:
      "Manage large-scale skill development initiatives with secure, scalable assessment solutions.",
  },
];

interface BentoCardProps {
  className?: string;
  index: number;
  borderRadiusClass: string;
  children: React.ReactNode;
}

function BentoCard({
  className = "",
  index,
  borderRadiusClass,
  children,
}: BentoCardProps) {
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      onMouseMove={handleMouseMove}
      className={`group relative overflow-hidden border border-border/60 bg-white/85 backdrop-blur-md p-8 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/5 hover:border-transparent ${borderRadiusClass} ${className}`}
    >
      {/* Background spotlight gradient */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          borderRadius: "inherit",
          background:
            "radial-gradient(400px circle at var(--mouse-x) var(--mouse-y), rgba(255, 87, 51, 0.08), rgba(255, 122, 0, 0.03), transparent 80%)",
        }}
      />

      {/* Dynamic Border Spotlight */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={
          {
            borderRadius: "inherit",
            padding: "1px",
            background:
              "radial-gradient(300px circle at var(--mouse-x) var(--mouse-y), rgba(255, 87, 51, 0.4), rgba(255, 122, 0, 0.2), transparent 60%)",
            WebkitMask:
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          } as React.CSSProperties
        }
      />

      <div className="relative z-10 flex flex-col h-full justify-between">
        {children}
      </div>
    </motion.div>
  );
}

function HeroMockConsole() {
  const [stage, setStage] = useState(0);
  const [codeText, setCodeText] = useState("");
  const fullCode = `// AI-Evaluated Skill Test
function assessCandidate(skills) {
  const score = skills.reduce((a, b) => a + b, 0);
  return score >= 90 ? "Hire" : "Train";
}

// Running evaluation suite...`;

  useEffect(() => {
    let interval: ReturnType<typeof setTimeout> | undefined;
    if (stage === 0) {
      setCodeText("");
      interval = setTimeout(() => setStage(1), 1500);
    } else if (stage === 1) {
      interval = setTimeout(() => setStage(2), 2000);
    } else if (stage === 2) {
      let charIndex = 0;
      interval = setInterval(() => {
        if (charIndex < fullCode.length) {
          setCodeText(fullCode.slice(0, charIndex + 1));
          charIndex++;
        } else {
          clearInterval(interval);
          setStage(3);
        }
      }, 35);
    } else if (stage === 3) {
      interval = setTimeout(() => setStage(4), 1800);
    } else if (stage === 4) {
      interval = setTimeout(() => setStage(0), 4000);
    }

    return () => {
      clearInterval(interval);
      clearTimeout(interval);
    };
  }, [stage, fullCode]);

  return (
    <div className="relative w-full max-w-lg mx-auto lg:max-w-none">
      {/* Absolute Decorative Glow behind container */}
      <div className="absolute -inset-2 bg-gradient-to-r from-primary to-accent rounded-3xl opacity-20 blur-xl animate-pulse" />

      {/* Main Glassmorphic Panel */}
      <div className="relative rounded-2xl border border-white/20 bg-slate-950/95 shadow-2xl backdrop-blur-xl overflow-hidden text-slate-300 font-mono text-[11px] flex flex-col h-[400px]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/60 border-b border-white/5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            <span className="text-[9px] text-slate-500 font-sans ml-2">
              RxOne Candidate Hub v2.1
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 text-[9px] text-slate-400 font-sans">
            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            Secure Session
          </div>
        </div>

        {/* Inner Content Grid */}
        <div className="flex-1 grid grid-cols-3 divide-x divide-white/5 overflow-hidden">
          {/* Left panel: Proctor Monitor */}
          <div className="col-span-1 p-2.5 flex flex-col justify-between bg-slate-950/50">
            <div>
              <span className="text-[8px] text-slate-500 font-sans uppercase font-bold tracking-wider block mb-1.5">
                AI Proctoring Feed
              </span>

              {/* Webcam View Mock */}
              <div className="relative h-[115px] w-full bg-slate-900 rounded-lg overflow-hidden border border-white/5 flex items-center justify-center">
                {/* Scanning overlay effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-primary/0 via-accent/5 to-primary/0 animate-pulse" />

                {stage >= 1 ? (
                  <div className="flex flex-col items-center justify-center text-center p-1">
                    {stage === 1 ? (
                      <>
                        <Loader2 className="w-5 h-5 text-accent animate-spin mb-0.5" />
                        <span className="text-[7px] text-accent animate-pulse font-sans">
                          Verifying Face...
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full border-2 border-emerald-500/40 bg-slate-850 flex items-center justify-center">
                            <Users className="w-5 h-5 text-emerald-400" />
                          </div>
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-950 flex items-center justify-center">
                            <Check className="w-1.5 h-1.5 text-white" />
                          </span>
                        </div>
                        <span className="text-[7px] text-emerald-400 font-sans font-bold mt-1 uppercase tracking-wide">
                          Verified
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-1 text-slate-650">
                    <Shield className="w-5 h-5 mb-0.5 text-slate-600" />
                    <span className="text-[7px] font-sans">Camera Standby</span>
                  </div>
                )}
              </div>
            </div>

            {/* Proctor Indicators */}
            <div className="flex flex-col gap-1 font-sans mt-2">
              <div className="flex items-center justify-between text-[8px] text-slate-400">
                <span>Eye Tracking:</span>
                <span
                  className={
                    stage >= 2
                      ? "text-emerald-400 font-semibold"
                      : "text-slate-500"
                  }
                >
                  {stage >= 2 ? "Locked" : "Standby"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[8px] text-slate-400">
                <span>Audio Feed:</span>
                <span
                  className={
                    stage >= 2
                      ? "text-emerald-400 font-semibold"
                      : "text-slate-500"
                  }
                >
                  {stage >= 2 ? "Safe (0dB)" : "Standby"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[8px] text-slate-400">
                <span>Device Lock:</span>
                <span
                  className={
                    stage >= 1
                      ? "text-emerald-400 font-semibold"
                      : "text-slate-500"
                  }
                >
                  {stage >= 1 ? "Active" : "Standby"}
                </span>
              </div>
            </div>
          </div>

          {/* Right panel (col-span-2): Code Editor */}
          <div className="col-span-2 p-2.5 flex flex-col justify-between overflow-hidden bg-slate-900/20">
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[8px] text-slate-500 font-sans uppercase font-bold tracking-wider">
                  Candidate Workspace
                </span>
                <span className="text-[8px] text-accent/80">
                  JavaScript (ES6)
                </span>
              </div>

              <pre className="text-[9px] text-slate-350 leading-tight font-mono select-none whitespace-pre-wrap">
                {codeText || (
                  <span className="text-slate-600 animate-pulse">
                    // Waiting for candidate initialization...
                  </span>
                )}
                {stage === 2 && (
                  <span className="w-1.5 h-3 bg-primary inline-block ml-0.5 animate-pulse" />
                )}
              </pre>
            </div>

            {/* Terminal output / run results */}
            <div className="border-t border-white/5 pt-1.5 mt-1.5">
              <div className="flex items-center justify-between text-[8px] text-slate-500 font-sans mb-1">
                <span>Console Output</span>
                {stage === 3 && (
                  <span className="flex items-center gap-0.5 text-primary animate-pulse">
                    <Loader2 className="w-2 h-2 animate-spin" /> Compiling...
                  </span>
                )}
              </div>

              <div className="bg-slate-950 p-1.5 rounded border border-white/5 font-mono text-[8px] h-[95px] overflow-y-auto flex flex-col justify-between">
                {stage === 0 && (
                  <span className="text-slate-550">
                    System idle. Ready to initialize exam context.
                  </span>
                )}
                {stage === 1 && (
                  <span className="text-accent animate-pulse">
                    Running hardware validation, browser check, lock
                    verification...
                  </span>
                )}
                {stage === 2 && (
                  <span className="text-slate-400">
                    Coding challenge: write assessCandidate helper to output
                    classification.
                  </span>
                )}
                {stage === 3 && (
                  <span className="text-slate-400">
                    Loading tests... Executing Test Suite [1..3]...
                  </span>
                )}
                {stage === 4 && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-emerald-400 font-bold">
                      ✓ Test 1: Standard classification check passed.
                    </span>
                    <span className="text-emerald-400 font-bold">
                      ✓ Test 2: Edge-case boundary array check passed.
                    </span>
                    <span className="text-emerald-405 font-bold">
                      ✓ Test 3: Weight rating computation passed.
                    </span>
                    <span className="text-primary font-bold mt-0.5">
                      Evaluation Score: 100/100 (Recommended Candidate)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Sparkly Score Badge */}
      <motion.div
        animate={
          stage === 4
            ? { opacity: 1, scale: 1, y: 0 }
            : { opacity: 0, scale: 0.8, y: 10 }
        }
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="absolute -top-6 -right-6 bg-gradient-primary text-white font-sans font-bold px-4 py-2 rounded-xl shadow-xl flex items-center gap-1.5 border border-white/20 z-20 pointer-events-none"
      >
        <Sparkles className="w-4 h-4 fill-current" />
        <div className="flex flex-col">
          <span className="text-[8px] uppercase tracking-wider text-white/80">
            Automated Grade
          </span>
          <span className="text-xs leading-none">98% Accuracy Score</span>
        </div>
      </motion.div>
    </div>
  );
}

export default function NationalLandingPage() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isNavTransitioning, setIsNavTransitioning] = useState(false);
  const [activeLayout, setActiveLayout] = useState<"horizontal" | "vertical">(
    "horizontal",
  );
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organization: "",
    phone: "",
    message: "",
  });

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      const totalHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress =
        totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
      setScrollProgress(progress);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsNavTransitioning(true);
    const swapTimer = setTimeout(() => {
      setActiveLayout(isScrolled ? "vertical" : "horizontal");
    }, 200);
    const fadeTimer = setTimeout(() => {
      setIsNavTransitioning(false);
    }, 850);
    return () => {
      clearTimeout(swapTimer);
      clearTimeout(fadeTimer);
    };
  }, [isScrolled]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log("Contact form submitted:", formData);
    alert(
      "Thank you for your interest! Our team will contact you within 24 hours.",
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Premium Floating Navigation Pill / Left Side Vertical Dock */}
      <div className="fixed inset-0 pointer-events-none z-50">
        <motion.nav
          layout
          transition={{
            type: "tween",
            ease: [0.76, 0, 0.24, 1],
            duration: 0.85,
          }}
          className={`fixed pointer-events-auto flex items-center justify-between border text-white backdrop-blur-xl bg-slate-950 shadow-2xl rounded-full ${
            isScrolled
              ? "flex-col py-6 px-2 border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
              : "flex-row bg-slate-950/95 border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.25)] px-7 py-3.5"
          }`}
          style={{
            transformOrigin: "center center",
          }}
          animate={
            isScrolled
              ? {
                  left: 24,
                  top: "50%",
                  y: "-50%",
                  x: 0,
                  width: 64,
                  height: 380,
                }
              : {
                  left: "50%",
                  top: 16,
                  y: 0,
                  x: "-50%",
                  width: "90%",
                  maxWidth: 1024,
                  height: 64,
                }
          }
        >
          <motion.div
            className={`flex w-full h-full items-center justify-between ${
              activeLayout === "vertical" ? "flex-col" : "flex-row"
            }`}
            animate={{ opacity: isNavTransitioning ? 0 : 1 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {/* Brand Logo / Icon */}
            <div
              className={`flex items-center cursor-pointer ${
                activeLayout === "vertical" ? "flex-col gap-1.5" : "gap-2.5"
              }`}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary flex-shrink-0">
                <span className="text-sm font-black text-white font-sans">
                  R
                </span>
              </div>
              {activeLayout !== "vertical" && (
                <span className="font-heading font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
                  RxOne
                </span>
              )}
            </div>

            {/* Center Navigation Links (Horizontal vs Vertical Icons) */}
            {activeLayout === "vertical" ? (
              <div className="flex flex-col gap-5 items-center my-auto">
                {[
                  { id: "features", label: "Features", icon: Sparkles },
                  { id: "industries", label: "Industries", icon: Building },
                  { id: "testimonials", label: "Testimonials", icon: Users },
                  { id: "contact", label: "Contact", icon: Mail },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        document
                          .getElementById(item.id)
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-white/10 transition-all duration-300 relative group"
                    >
                      <Icon className="w-4 h-4" />

                      {/* Floating Tooltip Label */}
                      <div className="absolute left-14 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 bg-slate-950 border border-white/15 px-3 py-1.5 rounded-lg text-[9px] font-bold text-white uppercase tracking-wider shadow-2xl whitespace-nowrap z-50">
                        {item.label}
                      </div>
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
                {[
                  { id: "features", label: "Features" },
                  { id: "industries", label: "Industries" },
                  { id: "testimonials", label: "Testimonials" },
                  { id: "contact", label: "Contact" },
                ].map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document
                        .getElementById(item.id)
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="hover:text-white transition-colors py-1 relative group"
                  >
                    {item.label}
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
                  </a>
                ))}
              </div>
            )}

            {/* Right CTA / Action Buttons */}
            <div
              className={`flex items-center ${activeLayout === "vertical" ? "flex-col" : "gap-3"}`}
            >
              {activeLayout !== "vertical" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/login")}
                  className="text-slate-300 hover:text-white hover:bg-white/5 rounded-full px-4 text-xs font-semibold h-8"
                >
                  Login
                </Button>
              )}

              {activeLayout === "vertical" ? (
                <button
                  onClick={() =>
                    document
                      .getElementById("contact")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="w-10 h-10 rounded-full bg-gradient-primary hover:opacity-95 text-white flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all border-0"
                  title="Get Started"
                >
                  <Zap className="w-4 h-4 fill-current" />
                </button>
              ) : (
                <Button
                  size="sm"
                  onClick={() =>
                    document
                      .getElementById("contact")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="bg-gradient-primary hover:opacity-95 text-white font-semibold rounded-full px-5 text-xs shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all border-0 h-8"
                >
                  Get Started
                </Button>
              )}
            </div>
          </motion.div>
        </motion.nav>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background pt-28 md:pt-32 pb-16 border-b border-slate-100">
        {/* Modern radial visual gradients and particles backdrop */}
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-gradient-to-br from-primary/10 via-transparent to-primary/5 rounded-full blur-[140px] pointer-events-none -z-10" />
        <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-primary/2 rounded-full blur-[100px] pointer-events-none -z-10" />
        <div className="absolute top-1/2 left-10 w-[250px] h-[250px] bg-primary/5 rounded-full blur-[80px] pointer-events-none -z-10" />

        {/* Decorative Grid Line backdrop */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.012)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.012)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_80%,transparent_100%)] -z-20" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Context Content */}
            <div className="lg:col-span-7 text-left flex flex-col justify-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                {/* Glowing Trust Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white border border-white/10 shadow-lg shadow-slate-950/10 mb-4 text-xs font-medium tracking-wide">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <Globe
                    className="w-3.5 h-3.5 text-accent mr-1 animate-spin"
                    style={{ animationDuration: "20s" }}
                  />
                  <span>Trusted by 500+ Institutions Nationwide</span>
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-extrabold text-slate-900 leading-[1.15] mb-4 tracking-tight">
                  The Intelligent Way to <br />
                  <span className="text-gradient-primary">
                    Assess, Evaluate & Hire
                  </span>{" "}
                  <br />
                  at Scale
                </h1>

                <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-6 max-w-2xl">
                  Empower your institution with next-gen secure, scalable
                  assessment solutions. Automatically proctor tests, evaluate
                  tech and non-tech skills, and drive academic excellence.
                </p>

                {/* Direct Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3.5 mb-8">
                  <Button
                    size="lg"
                    className="text-sm px-6 py-5 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 group"
                    onClick={() =>
                      document
                        .getElementById("contact")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    Start Free Trial
                    <ArrowRight className="w-4.5 h-4.5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-sm px-6 py-5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
                    onClick={() =>
                      document
                        .getElementById("features")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    View Demo
                  </Button>
                </div>

                {/* Sleek inline Stats Row */}
                <div className="border-t border-slate-200/80 pt-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {stats.map((stat, index) => (
                      <div key={index} className="flex flex-col">
                        <span className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                          {stat.number}
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                          {stat.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right Column: Immersive Console Mockup */}
            <div className="lg:col-span-5 flex justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="w-full"
              >
                <HeroMockConsole />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="relative py-32 bg-background overflow-hidden"
      >
        {/* Subtle decorative background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-tr from-primary/5 to-primary/2 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute bottom-1/4 right-10 w-[300px] h-[300px] bg-primary/2 rounded-full blur-[80px] pointer-events-none -z-10" />

        {/* Fine grid background for a tech feel */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] -z-20" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Badge
                variant="secondary"
                className="mb-4 bg-primary/10 text-primary border-primary/20 px-3 py-1 font-medium tracking-wide"
              >
                Key Features
              </Badge>
              <h2 className="text-4xl md:text-5xl font-heading font-extrabold mb-6 tracking-tight text-slate-900 leading-[1.15]">
                Comprehensive{" "}
                <span className="text-gradient-primary">
                  Assessment Solutions
                </span>
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                Everything you need to conduct secure, efficient, and insightful
                assessments at scale. Powered by next-gen AI technology.
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: Advanced Anti-Cheating */}
            <BentoCard
              index={0}
              borderRadiusClass="rounded-tl-[32px] rounded-br-[32px] rounded-tr-lg rounded-bl-lg"
              className="md:col-span-2"
            >
              <div className="grid md:grid-cols-2 gap-6 h-full items-center">
                <div className="flex flex-col justify-between h-full">
                  <div>
                    <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center mb-6 overflow-hidden transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm border border-border/40">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <Shield className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="font-heading font-bold text-xl text-slate-800 mb-3 tracking-tight group-hover:text-primary transition-colors">
                      Advanced Anti-Cheating
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-sm group-hover:text-slate-600 transition-colors">
                      AI-powered proctoring with real-time monitoring and
                      automated violation detection. Maintain the highest exam
                      integrity.
                    </p>
                  </div>
                  <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-primary">
                    <span>Proctoring Suite</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
                {/* Visual Mock */}
                <div className="relative border border-border/50 bg-slate-900 rounded-2xl p-4 overflow-hidden shadow-inner h-48 flex flex-col justify-between">
                  {/* Scan line effect */}
                  <div
                    className="absolute top-0 left-0 w-full h-[2px] bg-primary/40 animate-pulse"
                    style={{ animationDuration: "2s" }}
                  />

                  {/* Face silhouette placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                    <div className="w-24 h-24 rounded-full border-2 border-dashed border-accent/40 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-slate-800 border border-emerald-500 animate-pulse" />
                    </div>
                  </div>

                  <div className="relative z-10 flex justify-between items-start w-full">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Live Proctor
                    </span>
                    <span className="px-2 py-1 rounded bg-slate-800/80 backdrop-blur-md text-[10px] text-slate-300 font-mono">
                      Cam-01
                    </span>
                  </div>

                  <div className="relative z-10 flex flex-col gap-1 w-full bg-slate-850/80 backdrop-blur-md p-3 rounded-lg border border-white/5 font-mono text-[10px] text-slate-300">
                    <div className="flex justify-between">
                      <span>Gaze Focus:</span>
                      <span className="text-emerald-400">98% Secure</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Audio Level:</span>
                      <span className="text-emerald-400">Normal</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tab Switches:</span>
                      <span className="text-emerald-400">0 Detect</span>
                    </div>
                  </div>
                </div>
              </div>
            </BentoCard>

            {/* Card 2: Comprehensive Analytics */}
            <BentoCard
              index={1}
              borderRadiusClass="rounded-tr-[32px] rounded-bl-[32px] rounded-tl-lg rounded-br-lg"
              className="md:col-span-1 md:row-span-2"
            >
              <div className="flex flex-col justify-between h-full">
                <div>
                  <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center mb-6 overflow-hidden transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm border border-border/40">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <BarChart3 className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-heading font-bold text-xl text-slate-800 mb-3 tracking-tight group-hover:text-primary transition-colors">
                    Comprehensive Analytics
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-sm group-hover:text-slate-600 transition-colors">
                    Detailed performance insights with customizable reports and
                    data-driven insights. Generate custom exports with detailed
                    psychometric graphs.
                  </p>
                </div>
                {/* Visual Mock */}
                <div className="mt-8 border border-border/50 bg-slate-50/50 rounded-2xl p-4 flex flex-col gap-4 shadow-inner">
                  <div className="flex items-end justify-between h-24 px-2">
                    <div className="w-3 bg-gradient-to-t from-primary/60 to-primary rounded-t-sm h-[40%]" />
                    <div className="w-3 bg-gradient-to-t from-accent/60 to-accent rounded-t-sm h-[75%]" />
                    <div className="w-3 bg-gradient-to-t from-primary/60 to-primary rounded-t-sm h-[60%]" />
                    <div className="w-3 bg-gradient-to-t from-accent/60 to-accent rounded-t-sm h-[90%]" />
                    <div className="w-3 bg-gradient-to-t from-primary/60 to-primary rounded-t-sm h-[50%]" />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground border-t pt-2">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <span>Score</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-accent" />
                      <span>Speed</span>
                    </div>
                    <span className="text-foreground font-semibold">
                      98% Acc.
                    </span>
                  </div>
                </div>
              </div>
            </BentoCard>

            {/* Card 3: Real-time Assessment */}
            <BentoCard
              index={2}
              borderRadiusClass="rounded-tr-[32px] rounded-bl-[32px] rounded-tl-lg rounded-br-lg"
              className="md:col-span-1"
            >
              <div className="flex flex-col justify-between h-full">
                <div>
                  <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center mb-6 overflow-hidden transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm border border-border/40">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <Clock className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-heading font-bold text-xl text-slate-800 mb-3 tracking-tight group-hover:text-primary transition-colors">
                    Real-time Assessment
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-sm group-hover:text-slate-600 transition-colors">
                    Instant evaluation with automated grading and immediate
                    feedback systems.
                  </p>
                </div>
                {/* Visual Mock */}
                <div className="mt-6 border border-border/50 bg-slate-50/50 rounded-2xl p-4 flex items-center justify-between shadow-inner">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                      Remaining
                    </span>
                    <span className="text-lg font-mono font-bold text-slate-800 tracking-wider">
                      00:42:15
                    </span>
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 font-semibold text-xs border border-emerald-100 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Auto-Graded
                  </div>
                </div>
              </div>
            </BentoCard>

            {/* Card 4: Custom Test Builder */}
            <BentoCard
              index={3}
              borderRadiusClass="rounded-tl-[32px] rounded-br-[32px] rounded-tr-lg rounded-bl-lg"
              className="md:col-span-1"
            >
              <div className="flex flex-col justify-between h-full">
                <div>
                  <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center mb-6 overflow-hidden transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm border border-border/40">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <Target className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-heading font-bold text-xl text-slate-800 mb-3 tracking-tight group-hover:text-primary transition-colors">
                    Custom Test Builder
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-sm group-hover:text-slate-600 transition-colors">
                    Create assessments with multiple question types, coding
                    challenges, and adaptive difficulty.
                  </p>
                </div>
                {/* Visual Mock */}
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 text-xs font-semibold border border-purple-100">
                    Coding Qs
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold border border-blue-100">
                    MCQs
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-semibold border border-amber-100">
                    Adaptive
                  </span>
                </div>
              </div>
            </BentoCard>

            {/* Card 5: Multi-user Management */}
            <BentoCard
              index={4}
              borderRadiusClass="rounded-tl-[32px] rounded-br-[32px] rounded-tr-lg rounded-bl-lg"
              className="md:col-span-1"
            >
              <div className="flex flex-col justify-between h-full">
                <div>
                  <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center mb-6 overflow-hidden transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm border border-border/40">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <Users className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-heading font-bold text-xl text-slate-800 mb-3 tracking-tight group-hover:text-primary transition-colors">
                    Multi-user Management
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-sm group-hover:text-slate-600 transition-colors">
                    Role-based access control for administrators, trainers, and
                    students with bulk operations.
                  </p>
                </div>
                {/* Visual Mock */}
                <div className="mt-6 flex items-center gap-1.5">
                  <div className="flex -space-x-2 overflow-hidden">
                    <div className="h-7 w-7 rounded-full ring-2 ring-white bg-primary flex items-center justify-center text-[9px] font-bold text-white">
                      AD
                    </div>
                    <div className="h-7 w-7 rounded-full ring-2 ring-white bg-accent flex items-center justify-center text-[9px] font-bold text-accent-foreground">
                      TR
                    </div>
                    <div className="h-7 w-7 rounded-full ring-2 ring-white bg-slate-300 flex items-center justify-center text-[9px] font-bold text-slate-700">
                      ST
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono ml-2">
                    Role-based Access
                  </span>
                </div>
              </div>
            </BentoCard>

            {/* Card 6: Certification Ready */}
            <BentoCard
              index={5}
              borderRadiusClass="rounded-tr-[32px] rounded-bl-[32px] rounded-tl-lg rounded-br-lg"
              className="md:col-span-2"
            >
              <div className="grid md:grid-cols-2 gap-6 h-full items-center">
                <div className="flex flex-col justify-between h-full">
                  <div>
                    <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center mb-6 overflow-hidden transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm border border-border/40">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <Award className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="font-heading font-bold text-xl text-slate-800 mb-3 tracking-tight group-hover:text-primary transition-colors">
                      Certification Ready
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-sm group-hover:text-slate-600 transition-colors">
                      Generate professional certificates and shareable digital
                      badges instantly. Enable candidates to showcase verified
                      credentials directly on LinkedIn, resume profiles, or
                      portfolios.
                    </p>
                  </div>
                  <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-primary">
                    <span>LinkedIn & Profile Integration</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
                {/* Visual Mock */}
                <div className="relative border border-border/50 bg-slate-950 rounded-2xl p-4 flex flex-col justify-between shadow-inner h-48 overflow-hidden text-white">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 rounded-full blur-xl pointer-events-none" />

                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-[10px] text-accent tracking-wider uppercase font-semibold">
                        RxOne Certification
                      </h4>
                      <p className="text-[8px] text-slate-400 font-mono mt-0.5">
                        Verified Credential
                      </p>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-gradient-primary flex items-center justify-center shadow-md">
                      <Award className="w-3 h-3 text-white" />
                    </div>
                  </div>

                  <div className="my-2">
                    <div className="text-[8px] text-slate-400">
                      Candidate Name
                    </div>
                    <div className="text-xs font-bold text-slate-200">
                      Aditya Verma
                    </div>
                    <div className="text-[7px] text-emerald-400 mt-1 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Score: 96% (Elite tier)
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-t border-white/10 pt-2 text-[6px] text-slate-500 font-mono">
                    <div>ID: RX-2026-9A7F</div>
                    <div className="text-accent">Verifiable Link ✓</div>
                  </div>
                </div>
              </div>
            </BentoCard>
          </div>
        </div>
      </section>

      {/* No fuss section */}
      <section className="py-24 relative bg-white overflow-hidden border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Column: Interactive Candidate Grid (4 Cards) */}
            <div className="lg:col-span-6">
              <div className="w-full">
                <img
                  src="final-fuss-bg.png"
                  alt="Find the best candidate. No fuss."
                  className="w-full h-auto rounded-2xl shadow-sm"
                />
              </div>
            </div>

            {/* Right Column: Copy & Actions */}
            <div className="lg:col-span-6 space-y-6">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="space-y-6"
              >
                <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-slate-900 leading-[1.1] tracking-tight">
                  Find the best <br className="hidden sm:inline" />
                  candidate. <span className="text-[#FF5733]">No</span>{" "}
                  <span className="text-[#0EA5E9]">fuss.</span>
                </h2>

                <p className="text-base md:text-lg text-slate-600 leading-relaxed">
                  Evalart’s online evaluations can pre-filter candidates to
                  identify the best applicants and significantly reduce the
                  number of candidates who require an interview.
                </p>

                <p className="text-base md:text-lg text-slate-900 leading-relaxed">
                  Online assessments allow you to filter out up to{" "}
                  <span className="font-bold">80% of applicants.</span>
                </p>

                <div className="flex items-center gap-4 pt-2">
                  <Button
                    onClick={() =>
                      document
                        .getElementById("contact")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                    className="px-6 py-3 rounded-lg bg-[#FF5733] hover:bg-[#E04F2E] text-white font-semibold text-sm transition-all shadow-sm border-0 h-auto"
                  >
                    Watch video
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() =>
                      document
                        .getElementById("contact")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                    className="px-6 py-3 rounded-lg border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-all h-auto"
                  >
                    See sample test
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases / Industries Section */}
      <section
        id="industries"
        className="py-24 bg-slate-50/50 relative overflow-hidden border-t border-b border-slate-100"
      >
        {/* Subtle decorative background glows */}
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[300px] bg-gradient-to-tr from-primary/2 to-primary/5 rounded-full blur-[100px] pointer-events-none -z-10" />
        <div className="absolute bottom-1/3 left-1/4 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl md:text-5xl font-heading font-extrabold text-slate-900 mb-4 tracking-tight">
                Perfect for Every Industry
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Trusted by educational institutions, corporate enterprises, and
                government agencies nationwide to deliver reliable, secure
                assessments.
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Card 1: Educational Institutions */}
            <BentoCard
              index={0}
              borderRadiusClass="rounded-tl-[32px] rounded-br-[32px] rounded-tr-lg rounded-bl-lg"
              className="lg:col-span-7"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full items-center">
                <div className="flex flex-col justify-between h-full min-h-[180px]">
                  <div>
                    <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center mb-4 overflow-hidden transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm border border-border/40">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <GraduationCap className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-heading font-bold text-xl text-slate-800 mb-2.5 tracking-tight group-hover:text-primary transition-colors">
                      Educational Institutions
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-xs group-hover:text-slate-650 transition-colors">
                      Conduct secure online examinations, entrance tests, and
                      skill assessments for universities. Scaled to handle
                      thousands of concurrent takers.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <span>Academic Integrity Suite</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Visual Mock */}
                <div className="relative border border-border/50 bg-slate-950 rounded-2xl p-4 flex flex-col justify-between shadow-inner h-44 overflow-hidden text-white font-mono text-[9px]">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none" />

                  <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
                    <div>
                      <h4 className="text-[9px] text-primary tracking-wider uppercase font-semibold">
                        CS Finals: Data Structures
                      </h4>
                      <p className="text-[7px] text-slate-400 mt-0.5">
                        Session: LIVE ACTIVE
                      </p>
                    </div>
                    <span className="flex h-1.5 w-1.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                    </span>
                  </div>

                  <div className="my-2.5 flex justify-between items-center gap-2">
                    <div className="flex flex-col">
                      <span className="text-[7px] text-slate-500 uppercase">
                        Registered
                      </span>
                      <span className="text-sm font-extrabold text-slate-200">
                        4,280
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[7px] text-slate-500 uppercase">
                        Online
                      </span>
                      <span className="text-sm font-extrabold text-accent">
                        3,892
                      </span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[7px] text-slate-500 uppercase">
                        Avg. Proctor
                      </span>
                      <span className="text-sm font-extrabold text-emerald-400">
                        99.8%
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-900/80 p-2 rounded border border-white/5 text-[7px] text-slate-450 flex items-center justify-between">
                    <span>Auto Grading Engine: Active</span>
                    <span className="text-emerald-400 font-semibold">
                      ✓ Synced
                    </span>
                  </div>
                </div>
              </div>
            </BentoCard>

            {/* Card 2: Corporate Training */}
            <BentoCard
              index={1}
              borderRadiusClass="rounded-tr-[32px] rounded-bl-[32px] rounded-tl-lg rounded-br-lg"
              className="lg:col-span-5"
            >
              <div className="flex flex-col justify-between h-full min-h-[300px]">
                <div>
                  <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center mb-4 overflow-hidden transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm border border-border/40">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <Building className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-heading font-bold text-xl text-slate-800 mb-2.5 tracking-tight group-hover:text-primary transition-colors">
                    Corporate Training
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-xs group-hover:text-slate-650 transition-colors">
                    Evaluate employee skills, run certifications, and benchmark
                    technical proficiencies across your organization.
                  </p>
                </div>

                {/* Visual Mock */}
                <div className="mt-4 border border-border/50 bg-slate-950 rounded-2xl p-4 flex flex-col gap-2.5 shadow-inner text-white h-[140px] overflow-hidden">
                  <div className="flex justify-between items-center text-[9px] border-b border-white/10 pb-1.5 font-sans">
                    <span className="font-semibold text-accent">
                      Tech Stack Benchmarks
                    </span>
                    <span className="text-slate-400 font-mono text-[7px]">
                      Updates Hourly
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[7px] text-slate-300 font-mono">
                        <span>Frontend Engineering</span>
                        <span>92% Proficient</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                          style={{ width: "92%" }}
                        />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[7px] text-slate-300 font-mono">
                        <span>Backend & DB Design</span>
                        <span>84% Proficient</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                          style={{ width: "84%" }}
                        />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[7px] text-slate-300 font-mono">
                        <span>Cloud Infrastructure</span>
                        <span>71% Proficient</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                          style={{ width: "71%" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </BentoCard>

            {/* Card 3: Placement Agencies */}
            <BentoCard
              index={2}
              borderRadiusClass="rounded-tr-[32px] rounded-bl-[32px] rounded-tl-lg rounded-br-lg"
              className="lg:col-span-5"
            >
              <div className="flex flex-col justify-between h-full min-h-[300px]">
                <div>
                  <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center mb-4 overflow-hidden transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm border border-border/40">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-heading font-bold text-xl text-slate-800 mb-2.5 tracking-tight group-hover:text-primary transition-colors">
                    Placement Agencies
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-xs group-hover:text-slate-650 transition-colors">
                    Streamline candidate vetting with standardized tests and
                    automated grading. Make data-driven placement decisions
                    instantly.
                  </p>
                </div>

                {/* Visual Mock */}
                <div className="mt-4 border border-border/50 bg-slate-950 rounded-2xl p-3.5 flex flex-col justify-between shadow-inner text-white h-[140px] overflow-hidden">
                  <div className="flex justify-between items-center text-[9px] border-b border-white/10 pb-1.5 font-sans">
                    <span className="font-semibold text-accent">
                      Shortlist Pipeline
                    </span>
                    <span className="text-slate-400 font-mono text-[7px]">
                      Candidates: 240
                    </span>
                  </div>

                  <div className="space-y-2 font-sans my-1.5">
                    <div className="flex items-center justify-between text-[8px] bg-slate-900/60 p-1 rounded border border-white/5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-[6px] font-bold text-white">
                          AV
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-200">
                            Aditya Verma
                          </span>
                          <span className="text-[6px] text-slate-400">
                            Node.js Dev
                          </span>
                        </div>
                      </div>
                      <span className="px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[7px]">
                        96% Match
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[8px] bg-slate-900/60 p-1 rounded border border-white/5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center text-[6px] font-bold text-slate-900">
                          NS
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-200">
                            Neha Singh
                          </span>
                          <span className="text-[6px] text-slate-400">
                            React Specialist
                          </span>
                        </div>
                      </div>
                      <span className="px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[7px]">
                        91% Match
                      </span>
                    </div>
                  </div>

                  <div className="text-[7px] text-slate-500 text-center font-mono pt-0.5 border-t border-white/5">
                    Showing top active recommendations
                  </div>
                </div>
              </div>
            </BentoCard>

            {/* Card 4: Government Programs */}
            <BentoCard
              index={3}
              borderRadiusClass="rounded-tl-[32px] rounded-br-[32px] rounded-tr-lg rounded-bl-lg"
              className="lg:col-span-7"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full items-center">
                <div className="flex flex-col justify-between h-full min-h-[180px]">
                  <div>
                    <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center mb-4 overflow-hidden transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm border border-border/40">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <BookOpen className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-heading font-bold text-xl text-slate-800 mb-2.5 tracking-tight group-hover:text-primary transition-colors">
                      Government Programs
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-xs group-hover:text-slate-650 transition-colors">
                      Execute large-scale, high-concurrency national skill
                      programs. Robust offline support and distributed syncing
                      algorithms keep assessments robust across varying network
                      conditions.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <span>National Scaling Framework</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Visual Mock */}
                <div className="relative border border-border/50 bg-slate-950 rounded-2xl p-4 flex flex-col justify-between shadow-inner h-44 overflow-hidden text-white font-mono text-[9px]">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none" />

                  <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
                    <div>
                      <h4 className="text-[9px] text-primary tracking-wider uppercase font-semibold">
                        National Skill Index
                      </h4>
                      <p className="text-[7px] text-slate-400 mt-0.5">
                        Distributed Scale Mode
                      </p>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold text-[7px]">
                      SYSTEM OK
                    </span>
                  </div>

                  <div className="my-2 space-y-1 text-[8px] text-slate-400">
                    <div className="flex justify-between">
                      <span>Total Assessed:</span>
                      <span className="text-slate-100 font-bold">
                        1,248,500
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Regions:</span>
                      <span className="text-slate-100 font-bold">
                        28 States & UTs
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Live Server Nodes:</span>
                      <span className="text-emerald-400 font-bold">
                        120/120 Online
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-white/10 pt-1.5 text-[7px] text-slate-500">
                    <span>API SYNC: SUCCESSFUL</span>
                    <span className="text-accent">99.99% Uptime SLA</span>
                  </div>
                </div>
              </div>
            </BentoCard>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section
        id="testimonials"
        className="py-24 relative overflow-hidden bg-background"
      >
        {/* Decorative background glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] bg-gradient-to-tr from-primary/5 via-transparent to-primary/2 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl md:text-5xl font-heading font-extrabold text-slate-900 mb-4 tracking-tight">
                What Our Partners Say
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Join hundreds of institutions already driving academic and
                hiring excellence with RxOne.
              </p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => {
              // Get initials for profile placeholder
              const initials = testimonial.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2);

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15, duration: 0.6 }}
                  className="group relative"
                >
                  {/* Subtle outer glow on hover */}
                  <div className="absolute -inset-0.5 bg-gradient-primary rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-550 blur-sm -z-10" />

                  <div className="relative h-full rounded-2xl border border-slate-100 bg-white p-8 shadow-sm transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-md flex flex-col justify-between overflow-hidden">
                    {/* Decorative quote mark */}
                    <span className="absolute right-6 top-2 text-slate-100/80 text-8xl font-serif select-none pointer-events-none group-hover:text-primary/10 transition-colors duration-300">
                      “
                    </span>

                    <div>
                      {/* Star ratings */}
                      <div className="flex gap-1 mb-6">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star
                            key={i}
                            className="w-4 h-4 text-amber-400 fill-current filter drop-shadow-[0_1px_2px_rgba(245,158,11,0.2)]"
                          />
                        ))}
                      </div>

                      {/* Testimonial body content */}
                      <p className="text-slate-600 leading-relaxed text-sm italic relative z-10 mb-8">
                        "{testimonial.content}"
                      </p>
                    </div>

                    {/* Partner Bio Info */}
                    <div className="flex items-center gap-3.5 border-t border-slate-50 pt-5 mt-auto">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs shadow-sm font-sans">
                        {initials}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-heading font-bold text-slate-900 text-sm leading-tight">
                          {testimonial.name}
                        </span>
                        <span className="text-xs text-muted-foreground leading-normal mt-0.5">
                          {testimonial.role}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-background relative overflow-hidden">
        {/* Subtle grid pattern background under the container */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative overflow-hidden rounded-[32px] bg-slate-950 border border-white/10 px-8 py-16 md:p-20 text-center shadow-2xl shadow-primary/5"
          >
            {/* Glowing ambient dots inside the CTA card */}
            <div className="absolute top-[-20%] left-[-10%] w-[350px] h-[350px] bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[350px] h-[350px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-heading font-extrabold text-white mb-6 tracking-tight leading-tight">
                Ready to Transform Your Assessment Process?
              </h2>
              <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
                Join India's leading institutions in adopting next-generation
                assessment technology. Start your free trial today and
                experience the difference.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="text-base px-8 py-6 rounded-xl bg-gradient-primary text-white hover:opacity-95 hover:scale-[1.02] shadow-lg shadow-primary/25 transition-all duration-300 border-0 font-semibold"
                  onClick={() =>
                    document
                      .getElementById("contact")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Get Started Now
                  <Zap className="w-4 h-4 ml-2 fill-current" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-8 py-6 rounded-xl border-slate-800 bg-transparent text-white hover:bg-slate-900 hover:text-white transition-all duration-300 hover:scale-[1.02] hover:border-slate-700"
                  onClick={() =>
                    document
                      .getElementById("contact")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Schedule Demo
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact Form */}
      <section
        id="contact"
        className="py-24 relative overflow-hidden bg-slate-50/50"
      >
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[400px] bg-gradient-to-tr from-primary/5 via-transparent to-primary/2 rounded-full blur-[140px] pointer-events-none -z-10" />
        <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl md:text-5xl font-heading font-extrabold text-slate-900 mb-4 tracking-tight">
                Get in Touch
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Ready to get started? Contact our sales team for a personalized
                demonstration.
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left Column: Why Choose & Info */}
            <div className="lg:col-span-5 space-y-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="font-heading font-bold text-xl text-slate-900 mb-4 tracking-tight">
                    Contact Information
                  </h3>
                  <div className="space-y-4">
                    <a
                      href="mailto:sales@rxone.com"
                      className="flex items-center gap-3.5 p-4 rounded-xl border border-slate-105 bg-white hover:border-primary/30 hover:shadow-sm transition-all duration-300 group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                          Email Us
                        </span>
                        <span className="text-sm font-semibold text-slate-800">
                          sales@rxone.com
                        </span>
                      </div>
                    </a>

                    <a
                      href="tel:+911800XXXXXX"
                      className="flex items-center gap-3.5 p-4 rounded-xl border border-slate-105 bg-white hover:border-primary/30 hover:shadow-sm transition-all duration-300 group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                          Call Toll Free
                        </span>
                        <span className="text-sm font-semibold text-slate-800">
                          +91 1800-XXX-XXXX
                        </span>
                      </div>
                    </a>

                    <div className="flex items-center gap-3.5 p-4 rounded-xl border border-slate-105 bg-white hover:border-primary/30 hover:shadow-sm transition-all duration-300 group">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                          Our Headquarters
                        </span>
                        <span className="text-sm font-semibold text-slate-800">
                          Mumbai, Maharashtra
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200/60 pt-6">
                  <h3 className="font-heading font-bold text-xl text-slate-900 mb-4 tracking-tight">
                    Why Choose RxOne?
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      "Pan-India presence with 500+ partners",
                      "24/7 technical support",
                      "Custom integration capabilities",
                      "GDPR compliant data security",
                      "Free training and onboarding",
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-2.5">
                        <div className="mt-0.5 rounded-full p-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 flex-shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                        <span className="text-xs text-slate-650 leading-normal font-medium">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right Column: Lead Form Card */}
            <div className="lg:col-span-7">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="relative group"
              >
                {/* Glowing Outer Shadow Border */}
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-md -z-10" />

                <div className="relative rounded-2xl border border-slate-100 bg-white p-8 md:p-10 shadow-lg shadow-slate-200/50">
                  <div className="mb-6">
                    <h3 className="font-heading font-bold text-2xl text-slate-900 tracking-tight">
                      Request a Demo
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Fill out the form below and our sales engineering team
                      will reach out with a custom preview.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          Full Name
                        </label>
                        <Input
                          name="name"
                          placeholder="Aditya Sen"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="py-5 px-4 bg-slate-50/50 border-slate-200 focus:ring-primary/20 focus:border-primary rounded-xl text-sm"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          Email Address
                        </label>
                        <Input
                          name="email"
                          type="email"
                          placeholder="aditya@college.edu"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="py-5 px-4 bg-slate-50/50 border-slate-200 focus:ring-primary/20 focus:border-primary rounded-xl text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          Organization/Institution
                        </label>
                        <Input
                          name="organization"
                          placeholder="IIT Bombay"
                          value={formData.organization}
                          onChange={handleInputChange}
                          className="py-5 px-4 bg-slate-50/50 border-slate-200 focus:ring-primary/20 focus:border-primary rounded-xl text-sm"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          Phone Number
                        </label>
                        <Input
                          name="phone"
                          type="tel"
                          placeholder="+91 XXXXX XXXXX"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="py-5 px-4 bg-slate-50/50 border-slate-200 focus:ring-primary/20 focus:border-primary rounded-xl text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        Assessment Needs
                      </label>
                      <Textarea
                        name="message"
                        placeholder="Describe the scale, requirements, or timeline for your assessments..."
                        value={formData.message}
                        onChange={handleInputChange}
                        rows={4}
                        className="p-4 bg-slate-50/50 border-slate-200 focus:ring-primary/20 focus:border-primary rounded-xl text-sm leading-relaxed"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full py-5 rounded-xl text-base font-semibold shadow-lg shadow-primary/20 bg-gradient-primary hover:opacity-95 hover:shadow-primary/35 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] group mt-2 text-white"
                    >
                      Send Request
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </form>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-16 relative overflow-hidden">
        {/* Aesthetic Flowing Gradient Line */}
        <div
          className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#FF7A00] via-[#FF5733] to-[#C82A00]"
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
                <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-md shadow-primary/20">
                  <span className="text-sm font-extrabold text-white font-sans">
                    R
                  </span>
                </div>
                <span className="font-heading font-extrabold text-xl text-white tracking-tight">
                  RxOne
                </span>
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
                  <a
                    href="#features"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Security
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Integrations
                  </a>
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
                  <a
                    href="#"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Careers
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Press Kit
                  </a>
                </li>
                <li>
                  <a
                    href="#contact"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Contact Sales
                  </a>
                </li>
              </ul>
            </div>

            {/* Link column 3 */}
            <div>
              <h4 className="font-heading font-bold text-sm text-white mb-4 uppercase tracking-wider text-[10px]">
                Support
              </h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a
                    href="#"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Help Center
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Community
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Platform Status
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright Bar */}
          <div className="border-t border-slate-900 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p className="order-2 md:order-1">
              &copy; 2024 RxOne. All rights reserved. Made with ❤️ for India's
              education sector.
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
