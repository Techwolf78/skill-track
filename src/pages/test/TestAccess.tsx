import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { 
  Loader2, Clock, Calendar, AlertCircle, Monitor, 
  Camera, Mic, ShieldCheck, CheckCircle2, Play, 
  FileText, Shield, UserCheck, Smartphone, Search,
  Volume2, Eye, Ban, AlertTriangle
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { testService } from "@/lib/test-service";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { authService } from "@/lib/auth-service";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CheckState {
  camera: "pending" | "success" | "error";
  mic: "pending" | "success" | "error";
  browser: "pending" | "success" | "error";
}

export default function TestAccess() {
  const { id, token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Onboarding state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [checks, setChecks] = useState<CheckState>({
    camera: "pending",
    mic: "pending",
    browser: "pending",
  });
  
  // Embedded login state
  const { login: loginToContext, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showColdStartMessage, setShowColdStartMessage] = useState(false);

  useEffect(() => {
    let timer: any;
    if (loading || isLoggingIn) {
      timer = setTimeout(() => {
        setShowColdStartMessage(true);
      }, 4000);
    } else {
      setShowColdStartMessage(false);
    }
    return () => clearTimeout(timer);
  }, [loading, isLoggingIn]);

  useEffect(() => {
    // Check for mobile or tablet user agents, plus iPad desktop mode detection
    const isMobileOrTablet = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
      (navigator.maxTouchPoints > 0 && /Macintosh/i.test(navigator.userAgent));
    
    if (isMobileOrTablet) {
      setIsMobile(true);
      setLoading(false);
      return;
    }

    if (id && token) {
      validateToken();
    } else if (token && !id) {
      // Legacy token-only routing fallback
      setError("This link is outdated. Please use the secure invitation link containing both ID and token.");
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token, isAuthenticated]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const parseJwt = (tokenStr: string) => {
    try {
      const base64Url = tokenStr.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  const validateToken = async () => {
    try {
      setLoading(true);
      if (!id || !token) {
        throw new Error("Invalid link parameters.");
      }

      // 1. Post to validate endpoint to authenticate the candidate
      const authResponse = await apiClient.post("/candidate-invitations/validate", {
        id,
        token,
      });

      const authData = authResponse.data?.data || authResponse.data;
      if (!authData || !authData.accessToken) {
        throw new Error("Authentication failed.");
      }

      // 2. Decode user from JWT and log in context
      const decoded = parseJwt(authData.accessToken);
      if (decoded) {
        const userData = {
          id: decoded.id,
          name: decoded.name,
          email: decoded.sub,
          role: decoded.role,
        };
        loginToContext(authData.accessToken, userData);
      } else {
        throw new Error("Failed to parse authentication token.");
      }

      // 3. Fetch invitation details using the newly acquired credentials
      const invitationResponse = await apiClient.get(`/candidate-invitations/${id}`);
      const invitation = invitationResponse.data?.data || invitationResponse.data;

      if (invitation.scheduleId) {
        const scheduleResponse = await apiClient.get(`/test-schedules/${invitation.scheduleId}`);
        const schedule = scheduleResponse.data?.data || scheduleResponse.data;
        
        if (schedule.testId) {
          const testResponse = await apiClient.get(`/tests/${schedule.testId}`);
          const test = testResponse.data?.data || testResponse.data;
          
          setTestData({
            valid: true,
            invitationId: invitation.id,
            candidateId: invitation.candidateId,
            testId: test.id,
            testTitle: test.title,
            durationMins: test.durationMins,
            scheduleId: schedule.id,
            endTime: schedule.endTime,
            token: token
          });
        } else {
          throw new Error("Test not found");
        }
      } else {
        throw new Error("Schedule not found");
      }
      setError(null);
    } catch (error: any) {
      console.error("Token validation error:", error);
      setError(error.response?.data?.message || error.message || "Invalid or expired invitation link");
    } finally {
      setLoading(false);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
      toast({ title: "Fullscreen Error", description: "Please enable fullscreen mode manually.", variant: "destructive" });
    }
  };

  const verifyEnvironment = async () => {
    setIsVerifying(true);
    
    // 1. Browser Check
    const isModern = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    setChecks(prev => ({ ...prev, browser: isModern ? "success" : "error" }));

    // 2. Camera Check
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      camStream.getTracks().forEach(t => t.stop());
      setChecks(prev => ({ ...prev, camera: "success" }));
    } catch (e) {
      setChecks(prev => ({ ...prev, camera: "error" }));
    }

    // 3. Mic Check
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.getTracks().forEach(t => t.stop());
      setChecks(prev => ({ ...prev, mic: "success" }));
    } catch (e) {
      setChecks(prev => ({ ...prev, mic: "error" }));
    }

    setIsVerifying(false);
  };

  const allChecksPassed = Object.values(checks).every(v => v === "success") && isFullscreen;

  const startTest = async () => {
    if (!allChecksPassed) return;

    try {
      const session = await testService.startTestSession(testData.invitationId, "0.0.0.0");

      navigate(`/test/${testData.testId}/session/${session.id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to start test",
        variant: "destructive",
      });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const response = await authService.login({ email, password });
      loginToContext(response.accessToken, response.user);
      toast({
        title: "Login Successful",
        description: "Re-validating your test access...",
      });
      // Re-validate token now that we have a session
      await validateToken();
    } catch (err: any) {
      toast({
        title: "Login Failed",
        description: err.response?.data?.message || err.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Preparing your secure environment...</p>
        {showColdStartMessage && (
          <p className="text-center text-xs text-amber-500 animate-pulse max-w-xs px-4">
            ⏳ Backend is waking up... Cold start on Render free tier can take up to 50 seconds. Please wait.
          </p>
        )}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full border-destructive/20 shadow-2xl overflow-hidden">
          <div className="h-2 bg-destructive" />
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <Smartphone className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">Device Not Supported</CardTitle>
            <CardDescription className="text-base mt-2">
              This assessment requires hardware diagnostics, screen sharing capability, and proctoring features that are not supported on mobile or tablet browsers.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Please open the invitation link on a <strong>desktop or laptop computer</strong> with a functional webcam, microphone, and a modern web browser (e.g., Google Chrome, Firefox, Microsoft Edge).
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate("/")} variant="outline" className="w-full">
              Return to Homepage
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (error || !testData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full border-destructive/20 shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Authentication Required</CardTitle>
            <CardDescription className="text-base mt-2">
              {error || "Please log in to access this test."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="candidate@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full h-12 text-lg mt-4" disabled={isLoggingIn}>
                {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                {isLoggingIn ? "Logging in..." : "Login to Continue"}
              </Button>
              {showColdStartMessage && (
                <p className="text-center text-xs text-amber-500 animate-pulse mt-2">
                  ⏳ Backend is waking up... Cold start on Render free tier can take up to 50 seconds. Please wait.
                </p>
              )}
            </form>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate("/")} variant="ghost" className="w-full">
              Return to Homepage
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const instructions = [
    { icon: <Monitor className="w-5 h-5" />, title: "Strict Fullscreen", desc: "Test will auto-submit if you exit fullscreen for >10s." },
    { icon: <Ban className="w-5 h-5" />, title: "No Tab Switching", desc: "Browsing other tabs or windows is strictly prohibited." },
    { icon: <Eye className="w-5 h-5" />, title: "Camera Required", desc: "Face must be visible and centered in the frame at all times." },
    { icon: <Volume2 className="w-5 h-5" />, title: "Audio Monitoring", desc: "Background speech or noise will trigger a violation." },
    { icon: <Smartphone className="w-5 h-5" />, title: "No Mobile Devices", desc: "Phones, tablets, and smartwatches are not allowed." },
    { icon: <Search className="w-5 h-5" />, title: "AI Monitoring", desc: "Suspicious movements or objects are tracked in real-time." },
    { icon: <UserCheck className="w-5 h-5" />, title: "No Assistance", desc: "Only the registered candidate should be present." },
    { icon: <Shield className="w-5 h-5" />, title: "Trust Score", desc: "Multiple violations will result in immediate disqualification." },
    { icon: <AlertTriangle className="w-5 h-5" />, title: "No Pausing", desc: "Once started, the timer cannot be paused for any reason." },
    { icon: <FileText className="w-5 h-5" />, title: "Submission", desc: "Ensure all answers are saved before the final timer ends." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Decorative Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/30 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[120px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 md:py-16 min-h-screen flex items-center justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch w-full max-w-7xl">
          
          {/* Left Side: Instructions */}
          <div className="space-y-8 flex flex-col">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold tracking-tight">
                <ShieldCheck className="w-4 h-4" />
                SECURE ASSESSMENT GATEWAY
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.1]">
                Before you <span className="text-primary">begin.</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                Please review these mandatory instructions to ensure a smooth and fair assessment experience.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              {instructions.map((item, idx) => (
                <div key={idx} className="group p-4 rounded-xl border bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-300 shadow-sm flex gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold leading-tight">{item.title}</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Action Card */}
          <div className="flex items-center justify-center">
            <Card className="w-full max-w-md border-primary/10 shadow-2xl overflow-hidden backdrop-blur-sm bg-card/90">
              <div className="h-2 bg-primary" />
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-3xl font-black">{testData.testTitle}</CardTitle>
                <CardDescription className="text-base">Ready to showcase your skills?</CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6 pt-6">
                {/* Test Meta */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-muted/50 border flex flex-col gap-1 items-center text-center">
                    <Clock className="w-5 h-5 text-primary mb-1" />
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Duration</span>
                    <span className="text-lg font-black">{testData.durationMins}m</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-muted/50 border flex flex-col gap-1 items-center text-center">
                    <Calendar className="w-5 h-5 text-primary mb-1" />
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Deadline</span>
                    <span className="text-xs font-bold leading-tight">
                      {testData.endTime ? new Date(testData.endTime).toLocaleDateString() : "No Limit"}
                    </span>
                  </div>
                </div>

                {/* Step 1: Fullscreen */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm mb-1 px-1">
                    <span className="font-bold flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary text-[10px] text-white flex items-center justify-center">1</span>
                      Fullscreen Entry
                    </span>
                    {isFullscreen ? (
                      <span className="text-green-500 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Active
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">Required</span>
                    )}
                  </div>
                  
                  {!isFullscreen ? (
                    <Button 
                      variant="default" 
                      className="w-full h-14 text-lg font-bold shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
                      onClick={toggleFullscreen}
                    >
                      <Monitor className="w-5 h-5 mr-2" />
                      Enter Fullscreen Mode
                    </Button>
                  ) : (
                    <div className="p-4 rounded-xl border border-green-500/20 bg-green-500/5 flex items-center gap-3 text-green-600 animate-in fade-in zoom-in duration-300">
                      <ShieldCheck className="w-6 h-6" />
                      <div className="text-xs font-bold">Safe Environment Locked</div>
                    </div>
                  )}
                </div>

                {/* Step 2: System Check */}
                <div className={cn("space-y-4 transition-all duration-500", !isFullscreen && "opacity-40 grayscale pointer-events-none")}>
                  <div className="flex items-center justify-between text-sm mb-1 px-1">
                    <span className="font-bold flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary text-[10px] text-white flex items-center justify-center">2</span>
                      System Verification
                    </span>
                    {checks.camera === "success" && checks.mic === "success" && (
                      <span className="text-green-500 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Ready
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <CheckRow label="Camera Access" status={checks.camera} icon={<Camera className="w-4 h-4" />} />
                    <CheckRow label="Microphone Access" status={checks.mic} icon={<Mic className="w-4 h-4" />} />
                    <CheckRow label="Secure Browser" status={checks.browser} icon={<ShieldCheck className="w-4 h-4" />} />
                  </div>

                  {!allChecksPassed ? (
                    <Button 
                      variant="secondary" 
                      className="w-full h-12 font-bold"
                      disabled={isVerifying || !isFullscreen}
                      onClick={verifyEnvironment}
                    >
                      {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Run System Check"}
                    </Button>
                  ) : null}
                </div>
              </CardContent>

              <CardFooter className="pt-2 pb-8 px-6">
                <Button 
                  onClick={startTest} 
                  disabled={!allChecksPassed}
                  className={cn(
                    "w-full h-16 text-xl font-black shadow-xl transition-all active:scale-95 gap-3",
                    allChecksPassed ? "bg-green-600 hover:bg-green-700 text-white" : "bg-muted text-muted-foreground"
                  )}
                >
                  {allChecksPassed ? (
                    <>
                      <Play className="w-6 h-6 fill-current" />
                      START ASSESSMENT
                    </>
                  ) : (
                    "Complete Steps to Start"
                  )}
                </Button>
              </CardFooter>
              
              <div className="px-6 pb-6">
                <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
                  By starting, you consent to AI-driven monitoring of your workspace, audio, and visual feed for proctoring purposes.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckRow({ label, status, icon }: { label: string; status: "pending" | "success" | "error"; icon: React.ReactNode }) {
  const statusColors = {
    pending: "text-muted-foreground bg-muted/50",
    success: "text-green-600 bg-green-500/10 border-green-500/20",
    error: "text-red-600 bg-red-500/10 border-red-500/20",
  };

  return (
    <div className={cn("flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-colors", statusColors[status])}>
      <div className="flex items-center gap-2">
        {icon}
        {label}
      </div>
      {status === "success" && <CheckCircle2 className="w-4 h-4" />}
      {status === "error" && <AlertCircle className="w-4 h-4" />}
      {status === "pending" && <div className="w-4 h-4 rounded-full border-2 border-muted" />}
    </div>
  );
}
