import { useState, useEffect, useRef } from "react";
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
  Volume2, Eye, Ban, AlertTriangle, ArrowRight, ArrowLeft
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

type WizardStep = "welcome" | "diagnostics" | "consent" | "ready";

export default function TestAccess() {
  const { id, token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>("welcome");
  const [isVerifying, setIsVerifying] = useState(false);
  const [checks, setChecks] = useState<CheckState>({
    camera: "pending",
    mic: "pending",
    browser: "pending",
  });
  const [consentChecked, setConsentChecked] = useState(false);
  
  // Media Stream state & refs
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Audio level state & refs
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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
      setError("This link is outdated. Please use the secure invitation link containing both ID and token.");
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token, isAuthenticated]);

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

      const authResponse = await apiClient.post("/candidate-invitations/validate", {
        id,
        token,
      });

      const authData = authResponse.data?.data || authResponse.data;
      if (!authData || !authData.accessToken) {
        throw new Error("Authentication failed.");
      }

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

  // Video source binding
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, currentStep]);

  const startAudioMonitoring = (stream: MediaStream) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setAudioLevel(Math.min(100, Math.round((average / 128) * 100)));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
    } catch (e) {
      console.error("Failed to start audio monitoring:", e);
    }
  };

  const stopAudioMonitoring = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
    audioContextRef.current = null;
    analyserRef.current = null;
  };

  const releaseResources = () => {
    stopAudioMonitoring();
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  useEffect(() => {
    return () => {
      releaseResources();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraStream]);

  const verifyEnvironment = async () => {
    setIsVerifying(true);
    releaseResources(); // reset any previous streams
    
    // 1. Browser Check
    const isModern = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    setChecks(prev => ({ ...prev, browser: isModern ? "success" : "error" }));

    // 2. Camera & Mic request (Combined)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraStream(stream);
      setChecks(prev => ({ 
        ...prev, 
        camera: "success", 
        mic: "success" 
      }));
      startAudioMonitoring(stream);
    } catch (e) {
      console.warn("Combined hardware check failed. Retrying separately...", e);
      
      // Try camera individually
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraStream(camStream);
        setChecks(prev => ({ ...prev, camera: "success" }));
      } catch (camErr) {
        setChecks(prev => ({ ...prev, camera: "error" }));
      }

      // Try mic individually
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!cameraStream) {
          startAudioMonitoring(micStream);
        }
        setChecks(prev => ({ ...prev, mic: "success" }));
      } catch (micErr) {
        setChecks(prev => ({ ...prev, mic: "error" }));
      }
    }

    setIsVerifying(false);
  };

  const allChecksPassed = checks.camera === "success" && checks.mic === "success" && checks.browser === "success";

  const launchSecureTest = async () => {
    // 1. Enter Fullscreen Mode (Mandatory final step)
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen entry error:", err);
      toast({ 
        title: "Fullscreen Required", 
        description: "Please enable fullscreen mode to secure the exam environment.", 
        variant: "destructive" 
      });
      return;
    }

    // 2. Release diagnostics streams so active proctoring inside TestInterface can acquire them
    releaseResources();

    // 3. Start Session & Navigate
    try {
      const session = await testService.startTestSession(testData.invitationId, "0.0.0.0");
      
      // 4. Store a token indicating they completed checking environment
      sessionStorage.setItem(`env_checked_${session.id}`, "true");

      navigate(`/test/${testData.testId}/session/${session.id}`);
    } catch (error: any) {
      // Exit fullscreen if initialization fails
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }
      toast({
        title: "Error Starting Assessment",
        description: error.response?.data?.message || "Failed to launch session",
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
        <Card className="max-w-md w-full border-destructive/20 shadow-2xl overflow-hidden animate-in fade-in duration-300">
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
        <Card className="max-w-md w-full border border-border/60 shadow-2xl animate-in fade-in duration-300">
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
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 flex flex-col relative overflow-hidden">
      {/* Decorative Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/30 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[120px]" />
      </div>

      <header className="border-b bg-card/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-white shadow-md shadow-primary/20">R</div>
            <span className="font-extrabold text-lg tracking-tight">Skill-Track</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            SECURE ASSESSMENT GATEWAY
          </div>
        </div>
      </header>

      <div className="relative z-10 flex-1 container mx-auto px-4 py-8 md:py-12 flex items-center justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch w-full max-w-6xl">
          
          {/* Left Side: Onboarding State Wizard */}
          <div className="lg:col-span-7 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
                Assessment <span className="text-primary">Onboarding</span>
              </h1>
              <p className="text-sm text-muted-foreground max-w-lg">
                Complete the guided steps below to verify your device diagnostics and securely access your exam.
              </p>
            </div>

            {/* Stepper Header */}
            <div className="flex items-center justify-between max-w-md border-b pb-4">
              <StepperStep number={1} label="Welcome" active={currentStep === "welcome"} completed={currentStep !== "welcome"} />
              <StepperStep number={2} label="Diagnostics" active={currentStep === "diagnostics"} completed={currentStep === "consent" || currentStep === "ready"} />
              <StepperStep number={3} label="Declaration" active={currentStep === "consent"} completed={currentStep === "ready"} />
              <StepperStep number={4} label="Ready" active={currentStep === "ready"} completed={false} />
            </div>

            {/* Wizard Panels */}
            <div className="flex-1 py-4 animate-in fade-in duration-300">
              
              {/* Step 1: Welcome & Overview */}
              {currentStep === "welcome" && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold">Assessment Guidelines Overview</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    You have been invited to take the <strong>{testData.testTitle}</strong>. 
                    This test is conducted in a secure browser environment using automated monitoring utilities. 
                    Please ensure you are in a quiet, private space with a stable internet connection.
                  </p>
                  
                  <div className="bg-muted/30 border rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">What to expect during onboarding:</h4>
                    <ul className="text-xs space-y-2 text-muted-foreground list-disc list-inside">
                      <li>We will request webcam and microphone access (handled safely in windowed mode).</li>
                      <li>You will see a live video feed to verify your framing and lighting.</li>
                      <li>A volume indicator will verify that your microphone captures audio correctly.</li>
                      <li>Once checked, you will declare consent and launch the test directly in fullscreen.</li>
                    </ul>
                  </div>

                  <Button 
                    className="w-full sm:w-auto px-6 h-12 text-sm font-bold gap-2"
                    onClick={() => setCurrentStep("diagnostics")}
                  >
                    Start Diagnostics <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Step 2: System & Hardware Diagnostics */}
              {currentStep === "diagnostics" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Live Video Preview Panel */}
                    <div className="w-full sm:w-72 aspect-video sm:h-52 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                      {cameraStream ? (
                        <>
                          <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            muted 
                            className="w-full h-full object-cover scale-x-[-1]"
                          />
                          <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-md rounded px-2.5 py-1 flex items-center justify-between text-[10px] text-white">
                            <span className="flex items-center gap-1.5 font-bold">
                              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                              Webcam Stream Active
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4 text-xs text-slate-500 space-y-2">
                          <Camera className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
                          <p>Webcam preview is currently inactive</p>
                        </div>
                      )}
                    </div>

                    {/* Checklists */}
                    <div className="flex-1 space-y-3">
                      <h4 className="text-sm font-bold text-foreground">Hardware Diagnostics</h4>
                      
                      <div className="space-y-2">
                        <DiagnosticRow 
                          label="Browser Capability Check" 
                          status={checks.browser} 
                          desc="Ensures your browser supports modern secure features" 
                        />
                        <DiagnosticRow 
                          label="Webcam Permission Check" 
                          status={checks.camera} 
                          desc="Continuous visual identity verification" 
                        />
                        <DiagnosticRow 
                          label="Microphone Permission Check" 
                          status={checks.mic} 
                          desc="Background audio analytics" 
                        />
                      </div>

                      {/* Microphone Level Meter */}
                      {cameraStream && checks.mic === "success" && (
                        <div className="space-y-1 bg-muted/40 p-3 rounded-lg border">
                          <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                            <span>MIC SIGNAL LEVEL</span>
                            <span>{audioLevel}%</span>
                          </div>
                          <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 transition-all duration-75"
                              style={{ width: `${audioLevel}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      variant="secondary" 
                      onClick={verifyEnvironment}
                      disabled={isVerifying}
                      className="flex-1 h-12 font-bold"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Testing Hardware...
                        </>
                      ) : (
                        "Request Media & Run Checks"
                      )}
                    </Button>

                    <Button 
                      disabled={!allChecksPassed}
                      onClick={() => setCurrentStep("consent")}
                      className="flex-1 h-12 font-bold gap-1.5"
                    >
                      Continue <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Consent & Guidelines */}
              {currentStep === "consent" && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    Proctoring & Security Consent
                  </h3>
                  
                  <div className="border border-amber-200 bg-amber-50/20 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Security Declaration Highlights</span>
                    </div>
                    <p className="text-xs text-amber-800/80 leading-relaxed">
                      Navigating away from the active screen, changing windows, or exiting fullscreen mode is logged as a violation. 
                      Reaching the maximum count of 3 violations will result in automatic submission.
                    </p>
                  </div>

                  <div className="space-y-2.5 max-h-48 overflow-y-auto text-xs text-muted-foreground pr-2 border-y py-3 scrollbar-thin">
                    <p>1. <strong>Visual stream:</strong> Candidates are monitored by the webcam. You must remain in front of the camera and centered at all times.</p>
                    <p>2. <strong>Audio stream:</strong> Audio checks track noise. Candidates should test in a quiet room; speech or whispering will trigger anomalies.</p>
                    <p>3. <strong>Clipboard limits:</strong> Copy and paste actions in coding/text editors are prohibited.</p>
                    <p>4. <strong>Network resilience:</strong> If your network drops, progress is cached locally and synchronized once restored.</p>
                  </div>

                  <div className="flex items-start gap-2.5 pt-2">
                    <input 
                      type="checkbox" 
                      id="consent-checkbox" 
                      checked={consentChecked} 
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      className="w-4 h-4 rounded mt-0.5 accent-primary cursor-pointer"
                    />
                    <label htmlFor="consent-checkbox" className="text-xs font-medium text-foreground cursor-pointer select-none leading-normal">
                      I agree to the proctoring rules, consent to my camera/microphone diagnostics being streamed, and acknowledge that violating terms will terminate the session.
                    </label>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        releaseResources();
                        setCurrentStep("diagnostics");
                      }}
                      className="w-28 h-12"
                    >
                      Back
                    </Button>
                    <Button 
                      disabled={!consentChecked}
                      onClick={() => setCurrentStep("ready")}
                      className="flex-1 h-12 font-bold gap-1.5"
                    >
                      Accept & Next <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Ready & Start */}
              {currentStep === "ready" && (
                <div className="space-y-5 text-center sm:text-left">
                  <div className="inline-flex p-3 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 mb-1">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black">Ready to Launch!</h3>
                    <p className="text-sm text-muted-foreground">
                      All system diagnostics passed, guidelines reviewed, and consent recorded. 
                      Click below to lock the environment and launch your exam.
                    </p>
                  </div>

                  <div className="bg-muted/30 border rounded-xl p-4 space-y-2 text-xs text-left">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Candidate Identity:</span>
                      <span className="font-bold text-foreground">Authenticated via Token</span>
                    </div>
                    <div className="flex justify-between border-b pb-2 pt-2">
                      <span className="text-muted-foreground">Assigned Assessment:</span>
                      <span className="font-bold text-foreground">{testData.testTitle}</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-muted-foreground">Allocated Duration:</span>
                      <span className="font-bold text-foreground">{testData.durationMins} Minutes</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      variant="outline"
                      onClick={() => setCurrentStep("consent")}
                      className="w-full sm:w-28 h-14"
                    >
                      Back
                    </Button>
                    <Button 
                      onClick={launchSecureTest}
                      className="flex-1 h-14 text-lg font-black bg-green-600 hover:bg-green-700 text-white shadow-xl shadow-green-600/10 gap-2 active:scale-[0.98] transition-all"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      ENTER FULLSCREEN & START TEST
                    </Button>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Right Side: Quick Reference Sidebar */}
          <div className="lg:col-span-5 flex items-center justify-center">
            <Card className="w-full border-primary/10 shadow-2xl overflow-hidden backdrop-blur-sm bg-card/90">
              <div className="h-1.5 bg-primary" />
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Exam Details
                </CardTitle>
                <CardDescription>Verify schedule metadata</CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-muted/40 border flex flex-col gap-1 items-center text-center">
                    <Clock className="w-5 h-5 text-primary mb-0.5" />
                    <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Duration</span>
                    <span className="text-base font-black">{testData.durationMins} Min</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-muted/40 border flex flex-col gap-1 items-center text-center">
                    <Calendar className="w-5 h-5 text-primary mb-0.5" />
                    <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Deadline</span>
                    <span className="text-xs font-bold leading-tight">
                      {testData.endTime ? new Date(testData.endTime).toLocaleDateString() : "No Limit"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-extrabold text-muted-foreground tracking-wider block">Security Rule Checklist:</span>
                  <div className="space-y-1.5">
                    <RuleBadge icon={<Monitor className="w-3.5 h-3.5" />} text="Strict Fullscreen Lock" />
                    <RuleBadge icon={<Ban className="w-3.5 h-3.5" />} text="Blocked Clipboard & Copy/Paste" />
                    <RuleBadge icon={<Search className="w-3.5 h-3.5" />} text="AI Face & object track" />
                    <RuleBadge icon={<Volume2 className="w-3.5 h-3.5" />} text="Ambient audio log check" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/20 border-t py-4 text-center">
                <p className="text-[10px] text-muted-foreground leading-relaxed w-full">
                  Secure proctoring tracks window blur events and webcam telemetry to audit assessment integrity.
                </p>
              </CardFooter>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}

// Sub-components
function StepperStep({ number, label, active, completed }: { number: number; label: string; active: boolean; completed: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center border transition-all",
        active && "bg-primary text-white border-primary shadow-sm",
        completed && "bg-green-500 border-green-500 text-white",
        !active && !completed && "bg-background text-muted-foreground border-border"
      )}>
        {completed ? <CheckCircle2 className="w-4 h-4" /> : number}
      </div>
      <span className={cn(
        "text-xs font-bold hidden sm:inline",
        active && "text-primary",
        completed && "text-green-500",
        !active && !completed && "text-muted-foreground"
      )}>
        {label}
      </span>
    </div>
  );
}

function DiagnosticRow({ label, status, desc }: { label: string; status: "pending" | "success" | "error"; desc: string }) {
  const statusColors = {
    pending: "text-muted-foreground bg-muted/30 border-border",
    success: "text-green-600 bg-green-500/5 border-green-500/20",
    error: "text-red-600 bg-red-500/5 border-red-500/20",
  };

  return (
    <div className={cn("flex items-start justify-between p-3 rounded-xl border text-xs transition-colors", statusColors[status])}>
      <div className="space-y-0.5">
        <p className="font-bold">{label}</p>
        <p className="text-[10px] text-muted-foreground leading-normal">{desc}</p>
      </div>
      <div className="pt-0.5">
        {status === "success" && <CheckCircle2 className="w-4 h-4 text-green-500 fill-current" />}
        {status === "error" && <AlertCircle className="w-4 h-4 text-red-500 fill-current" />}
        {status === "pending" && <div className="w-3.5 h-3.5 rounded-full border-2 border-muted" />}
      </div>
    </div>
  );
}

function RuleBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="text-primary">{icon}</div>
      <span>{text}</span>
    </div>
  );
}
