import { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/lib/auth-service";
import { getRedirectPathForRole } from "@/lib/auth-utils";
import { useAuth } from "@/lib/auth-context";
import { validateLoginForm } from "@/lib/auth/formValidation";
import { cn } from "@/lib/utils";

const features = [
  "MCQ & Coding Assessments",
  "Anti-Cheating Detection",
  "Auto-Evaluation",
  "Detailed Analytics",
];

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login: loginToContext } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const [adminEmail, setAdminEmail] = useState("superadmin@gryphonacademy.co.in");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || cooldown > 0) return;
    setIsLoading(true);
    try {
      const response = await authService.login({
        email: adminEmail,
        password: adminPassword,
      });

      console.log("Login response:", response);
      setFailedAttempts(0);
      loginToContext(response.accessToken, response.user);

      toast({
        title: "Login Successful",
        description: `Welcome back, ${response.user.name || adminEmail}!`,
      });

      const redirectPath = getRedirectPathForRole(response.user.role);
      navigate(redirectPath);
    } catch (error: unknown) {
      console.error("Login failed:", error);
      const nextFailedCount = failedAttempts + 1;
      setFailedAttempts(nextFailedCount);

      // Lockout logic: If 5 consecutive failures -> 30s cooldown; otherwise -> 3s cooldown
      const waitTime = nextFailedCount >= 5 ? 30 : 3;
      setCooldown(waitTime);

      let errorMessage = "Invalid credentials. Please try again.";
      let errorTitle = "Login Failed";
      if (nextFailedCount >= 5) {
        errorTitle = "Too Many Failed Attempts";
        errorMessage = "Maximum login attempts reached. Please wait 30 seconds before trying again.";
      } else if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          errorTitle = "Rate Limit Exceeded";
        }
        errorMessage =
          error.response?.data?.message ||
          error.response?.data?.data?.message ||
          error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: errorTitle,
        description: `${errorMessage} (Please wait ${waitTime}s before retrying)`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fillAdminCredentials = () => {
    setAdminEmail("superadmin@gryphonacademy.co.in");
    setAdminPassword("password123");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Hero */}
      <motion.div
        className="hidden lg:flex lg:w-1/2 bg-gradient-hero p-12 flex-col justify-between relative overflow-hidden"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-primary">
              <span className="text-2xl font-bold text-primary-foreground">
                R
              </span>
            </div>
            <span className="font-heading font-bold text-2xl text-white">
              RxOne
            </span>
          </div>
          <p className="text-white/60 text-sm">Skill Assessment Platform</p>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl lg:text-5xl font-heading font-bold text-white leading-tight">
              Assess Skills.
              <br />
              <span className="text-gradient-primary">Build Talent.</span>
            </h1>
            <p className="text-white/70 mt-4 text-lg max-w-md">
              Comprehensive assessment platform for training institutes and
              placement companies.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature}
                className="flex items-center gap-2 text-white/80"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="text-sm">{feature}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-8 text-white/40 text-sm">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            <span>12+ Colleges</span>
          </div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            <span>2,500+ Students</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <span>Secure Platform</span>
          </div>
        </div>
      </motion.div>

      {/* Right Panel - Admin Login Form */}
      <motion.div
        className="flex-1 flex items-center justify-center p-8 bg-background"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-heading font-bold">Admin Login</h2>
            <p className="text-muted-foreground mt-1">
              Enter your credentials to access the admin portal
            </p>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="text-sm text-muted-foreground">
                Use quick-fill credentials for demo login.
              </p>
              <button
                type="button"
                onClick={fillAdminCredentials}
                className="text-sm font-medium text-primary hover:underline"
              >
                Fill Admin
              </button>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="admin@company.com"
                  className={cn(
                    "h-12",
                    adminEmail && validateLoginForm({ email: adminEmail }).errors.email && "border-red-500 focus-visible:ring-red-500"
                  )}
                  value={adminEmail}
                  onChange={(event) => setAdminEmail(event.target.value)}
                  required
                />
                {adminEmail && validateLoginForm({ email: adminEmail }).errors.email && (
                  <p className="text-xs text-red-500 font-medium">Please enter a valid email address (e.g. user@domain.com)</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminPassword">Password</Label>
                <div className="relative">
                  <Input
                    id="adminPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="h-12 pr-10"
                    value={adminPassword}
                    onChange={(event) => setAdminPassword(event.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-input" />
                  <span className="text-muted-foreground">Remember me</span>
                </label>
                <a href="#" className="text-primary hover:underline">
                  Forgot password?
                </a>
              </div>
              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full"
                disabled={isLoading || cooldown > 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : cooldown > 0 ? (
                  `Please wait (${cooldown}s)...`
                ) : (
                  "Sign in as Admin"
                )}
              </Button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
