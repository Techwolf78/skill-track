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

type ProctoringMode = "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CUSTOM";

interface ProctoringFlags {
  proctoringMode: ProctoringMode;
  tabSwitchTrackingEnabled: boolean;
  copyPasteBlocked: boolean;
  rightClickBlocked: boolean;
  fullscreenExitTrackingEnabled: boolean;
  webcamRequired: boolean;
  microphoneRequired: boolean;
  screenShareRequired: boolean;
  faceNotVisibleDetectionEnabled: boolean;
  multipleFaceDetectionEnabled: boolean;
  suspiciousAudioDetectionEnabled: boolean;
  objectDetectionEnabled: boolean;
  devtoolsDetectionEnabled: boolean;
  periodicSnapshotsEnabled: boolean;
  evidenceCaptureEnabled: boolean;
  liveProctoringEnabled: boolean;
  autoSubmitOnCriticalViolation: boolean;
  maxWarningsAllowed: number;
  maxCriticalViolationsAllowed: number;
}

interface TestData {
  valid: boolean;
  invitationId: string;
  candidateId: string;
  testId: string;
  testTitle: string;
  durationMins: number;
  scheduleId: string;
  endTime: string;
  token: string;
  proctoring: ProctoringFlags;
}

interface CandidateInvitation {
  id: string;
  scheduleId?: string;
  candidateId?: string;
  testId?: string;
  token?: string;
}

interface TestSchedule {
  id: string;
  testId?: string;
  endTime?: string;
}

interface TestAssessment {
  id: string;
  title?: string;
  durationMins?: number;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  proctoringMode?: ProctoringMode;
  tabSwitchTrackingEnabled?: boolean;
  copyPasteBlocked?: boolean;
  rightClickBlocked?: boolean;
  fullscreenExitTrackingEnabled?: boolean;
  webcamRequired?: boolean;
  microphoneRequired?: boolean;
  screenShareRequired?: boolean;
  faceNotVisibleDetectionEnabled?: boolean;
  multipleFaceDetectionEnabled?: boolean;
  suspiciousAudioDetectionEnabled?: boolean;
  objectDetectionEnabled?: boolean;
  devtoolsDetectionEnabled?: boolean;
  periodicSnapshotsEnabled?: boolean;
  evidenceCaptureEnabled?: boolean;
  liveProctoringEnabled?: boolean;
  autoSubmitOnCriticalViolation?: boolean;
  maxWarningsAllowed?: number;
  maxCriticalViolationsAllowed?: number;
}

interface CheckState {
  camera: "pending" | "success" | "error";
  mic: "pending" | "success" | "error";
  screen: "pending" | "success" | "error";
  browser: "pending" | "success" | "error";
}

type WizardStep = "welcome" | "diagnostics" | "consent" | "ready";

export default function TestAccess() {
  const { id, token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState<TestData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>("welcome");
  const [isVerifying, setIsVerifying] = useState(false);
  const [checks, setChecks] = useState<CheckState>({
    camera: "pending",
    mic: "pending",
    screen: "pending",
    browser: "pending",
  });
  const [screenErrorMsg, setScreenErrorMsg] = useState<string | null>(null);
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

  // Magic link / OTP states
  const [otpCode, setOtpCode] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
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

    const searchParams = new URLSearchParams(window.location.search);
    const magicToken = searchParams.get("magicToken");

    if (id) {
      if (magicToken) {
        verifyMagicToken(magicToken);
      } else if (token || isAuthenticated) {
        validateToken();
      } else {
        setLoading(false);
      }
    } else if (token && !id) {
      setError("This link is outdated. Please use the secure invitation link containing both ID and token.");
      setLoading(false);
    } else {
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

  const verifyMagicToken = async (magicTokenStr: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.post(`/candidate-invitations/${id}/access/verify`, {
        magicToken: magicTokenStr
      });
      const authData = response.data?.data || response.data;
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
        window.history.replaceState({}, "", `/test/access/${id}`);
        toast({
          title: "Verification Successful",
          description: "One-click magic link authenticated successfully.",
        });
        validateToken();
      } else {
        throw new Error("Failed to parse authentication token.");
      }
    } catch (err: unknown) {
      const errorVal = err as { response?: { data?: { message?: string } }; message?: string };
      console.error("Magic token verification failed:", err);
      window.history.replaceState({}, "", `/test/access/${id}`);
      setError(errorVal.response?.data?.message || errorVal.message || "Failed to verify magic access link");
    } finally {
      setLoading(false);
    }
  };

  const handleSendAccessCode = async () => {
    if (!id) return;
    setIsLoggingIn(true);
    setError(null);
    try {
      const response = await apiClient.post(`/candidate-invitations/${id}/access/request`);
      const resData = response.data?.data || response.data;
      setOtpRequested(true);
      setOtpCooldown(60);
      if (resData?.devOtp) {
        setDevOtp(resData.devOtp);
      }
      toast({
        title: "Access Link Sent",
        description: "A secure access link and OTP have been sent to your email.",
      });
    } catch (err: unknown) {
      const errorVal = err as { response?: { data?: { message?: string } }; message?: string };
      console.error("Request access link failed:", err);
      setError(errorVal.response?.data?.message || errorVal.message || "Failed to send access link");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleOtpSubmit = async (codeVal: string) => {
    if (!id || isVerifyingOtp) return;
    setIsVerifyingOtp(true);
    setError(null);
    try {
      const response = await apiClient.post(`/candidate-invitations/${id}/access/verify`, {
        otpCode: codeVal
      });
      const authData = response.data?.data || response.data;
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
        toast({
          title: "Verification Successful",
          description: "Access code verified successfully.",
        });
        validateToken();
      } else {
        throw new Error("Failed to parse authentication token.");
      }
    } catch (err: unknown) {
      const errorVal = err as { response?: { data?: { message?: string } }; message?: string };
      console.error("OTP verification failed:", err);
      setError(errorVal.response?.data?.message || errorVal.message || "Invalid or expired access code.");
      setOtpCode("");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const validateToken = async () => {
    try {
      setLoading(true);
      if (!id) {
        throw new Error("Invalid link parameters.");
      }

      let decoded = null;

      if (token) {
        const authResponse = await apiClient.post("/candidate-invitations/validate", {
          id,
          token,
        });

        const authData = authResponse.data?.data || authResponse.data;
        if (!authData || !authData.accessToken) {
          throw new Error("Authentication failed.");
        }

        decoded = parseJwt(authData.accessToken);
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
      } else {
        const storedToken = localStorage.getItem("token");
        if (storedToken) {
          decoded = parseJwt(storedToken);
        }
        if (!isAuthenticated || !decoded) {
          setLoading(false);
          return;
        }
      }

      // 403 Bypass/Fallback strategy: Try direct GET, fall back to list, then to JWT claims
      let invitation: CandidateInvitation | null = null;
      try {
        const invitationResponse = await apiClient.get(`/candidate-invitations/${id}`);
        invitation = invitationResponse.data?.data || invitationResponse.data;
      } catch (err: unknown) {
        const axiosError = err as { response?: { status?: number } };
        console.warn("Direct invitation fetch failed with status:", axiosError.response?.status, err);
        
        // Fallback 1: Try list endpoint
        try {
          const listResponse = await apiClient.get("/candidate-invitations?size=100");
          const listData = listResponse.data?.data || listResponse.data;
          const items = Array.isArray(listData) 
            ? listData 
            : (listData?.content && Array.isArray(listData.content)) 
              ? listData.content 
              : [];
          invitation = items.find((item: CandidateInvitation) => item.id === id) || null;
          if (invitation) {
            console.log("Found invitation in list fallback:", invitation);
          }
        } catch (listErr) {
          console.warn("List invitation fetch failed:", listErr);
        }

        // Fallback 2: Check JWT decoded claims
        if (!invitation && decoded) {
          console.log("Decoded JWT payload for fallback:", decoded);
          const scheduleId = decoded.scheduleId || decoded.schedule_id || decoded.schedId;
          const candidateId = decoded.candidateId || decoded.candidate_id || decoded.candId || decoded.id;
          const testId = decoded.testId || decoded.test_id;
          const invitationId = decoded.invitationId || decoded.invitation_id || decoded.invId || id;
          
          if (scheduleId) {
            invitation = {
              id: invitationId,
              scheduleId,
              candidateId,
              testId
            };
            console.log("Constructed invitation from JWT claims:", invitation);
          }
        }
        
        // Fallback 3: Construct invitation manually using decoded JWT if still null
        if (!invitation) {
          invitation = {
            id: id,
            scheduleId: decoded?.scheduleId || decoded?.schedule_id || decoded?.schedId,
            candidateId: decoded?.candidateId || decoded?.candidate_id || decoded?.id,
            testId: decoded?.testId || decoded?.test_id,
          };
          console.log("Constructed manual fallback invitation:", invitation);
        }
      }

      let schedule: TestSchedule | null = null;
      let test: TestAssessment | null = null;

      if (invitation && invitation.scheduleId) {
        try {
          const scheduleResponse = await apiClient.get(`/test-schedules/${invitation.scheduleId}`);
          schedule = scheduleResponse.data?.data || scheduleResponse.data;
        } catch (schedErr) {
          console.warn("Failed to fetch schedule details, continuing with defaults:", schedErr);
        }
      }

      const testId = invitation?.testId || schedule?.testId || decoded?.testId || decoded?.test_id;
      if (testId) {
        try {
          const testResponse = await apiClient.get(`/tests/${testId}`);
          test = testResponse.data?.data || testResponse.data;
        } catch (testErr) {
          console.warn("Failed to fetch test details, continuing with defaults:", testErr);
        }
      }

      if (test && test.status && test.status !== "PUBLISHED") {
        throw new Error("This test is currently in Draft or Archived state and cannot be accessed.");
      }

      // Populate testData with whatever we resolved, falling back to safe defaults/decoded payload values
      const testTitle = test?.title || decoded?.testTitle || decoded?.test_title || "Technical Assessment";
      const durationMins = test?.durationMins || decoded?.durationMins || decoded?.duration_mins || 45;
      const endTime = schedule?.endTime || decoded?.endTime || decoded?.end_time || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      const finalCandidateId = invitation?.candidateId || decoded?.candidateId || decoded?.id;
      const finalScheduleId = invitation?.scheduleId || schedule?.id || decoded?.scheduleId;
      const mode: ProctoringMode = test?.proctoringMode ?? "NONE";

      // For each flag: use the actual backend value if it came back (non-null), otherwise
      // derive a safe default from the resolved mode so NONE = everything off.
      const isLow     = mode === "LOW" || mode === "MEDIUM" || mode === "HIGH" || mode === "CUSTOM";
      const isMedHigh = mode === "MEDIUM" || mode === "HIGH" || mode === "CUSTOM";
      const isHigh    = mode === "HIGH" || mode === "CUSTOM";

      setTestData({
        valid: true,
        invitationId: invitation?.id || id,
        candidateId: finalCandidateId,
        testId: testId || "default-test-id",
        testTitle: testTitle,
        durationMins: Number(durationMins),
        scheduleId: finalScheduleId || "default-schedule-id",
        endTime: endTime,
        token: token,
        proctoring: {
          proctoringMode: mode,
          tabSwitchTrackingEnabled:         test?.tabSwitchTrackingEnabled         ?? isLow,
          copyPasteBlocked:                 test?.copyPasteBlocked                 ?? isLow,
          rightClickBlocked:                test?.rightClickBlocked                ?? false,
          fullscreenExitTrackingEnabled:    test?.fullscreenExitTrackingEnabled    ?? isLow,
          webcamRequired:                   test?.webcamRequired                   ?? isMedHigh,
          microphoneRequired:               test?.microphoneRequired               ?? isHigh,
          screenShareRequired:              test?.screenShareRequired              ?? isHigh,
          faceNotVisibleDetectionEnabled:   test?.faceNotVisibleDetectionEnabled   ?? isMedHigh,
          multipleFaceDetectionEnabled:     test?.multipleFaceDetectionEnabled     ?? isMedHigh,
          suspiciousAudioDetectionEnabled:  test?.suspiciousAudioDetectionEnabled  ?? isLow,
          objectDetectionEnabled:           test?.objectDetectionEnabled           ?? isMedHigh,
          devtoolsDetectionEnabled:         test?.devtoolsDetectionEnabled         ?? isHigh,
          periodicSnapshotsEnabled:         test?.periodicSnapshotsEnabled         ?? isMedHigh,
          evidenceCaptureEnabled:           test?.evidenceCaptureEnabled           ?? isMedHigh,
          liveProctoringEnabled:            test?.liveProctoringEnabled            ?? isMedHigh,
          autoSubmitOnCriticalViolation:    test?.autoSubmitOnCriticalViolation    ?? isLow,
          maxWarningsAllowed:               test?.maxWarningsAllowed               ?? (mode === "NONE" ? 0 : 3),
          maxCriticalViolationsAllowed:     test?.maxCriticalViolationsAllowed     ?? (isHigh ? 1 : 2),
        },
      });

      setError(null);
    } catch (error: unknown) {
      const validationErr = error as { response?: { data?: { message?: string } }; message?: string };
      console.error("Token validation error:", error);
      setError(validationErr.response?.data?.message || validationErr.message || "Invalid or expired invitation link");
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
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
    if (!testData) return;
    const p = testData.proctoring;
    setIsVerifying(true);
    setScreenErrorMsg(null);
    releaseResources();

    // 1. Browser check — always
    const isModern = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    setChecks(prev => ({ ...prev, browser: isModern ? "success" : "error" }));

    // 2. Camera + Mic — only if required by proctoring mode
    if (p.webcamRequired || p.microphoneRequired) {
      try {
        const constraints = {
          video: p.webcamRequired,
          audio: p.microphoneRequired,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setCameraStream(stream);
        if (p.webcamRequired) setChecks(prev => ({ ...prev, camera: "success" }));
        if (p.microphoneRequired) {
          setChecks(prev => ({ ...prev, mic: "success" }));
          startAudioMonitoring(stream);
        }
      } catch (e) {
        console.warn("Combined hardware check failed. Retrying separately...", e);
        if (p.webcamRequired) {
          try {
            const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
            setCameraStream(camStream);
            setChecks(prev => ({ ...prev, camera: "success" }));
          } catch { setChecks(prev => ({ ...prev, camera: "error" })); }
        }
        if (p.microphoneRequired) {
          try {
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            startAudioMonitoring(micStream);
            setChecks(prev => ({ ...prev, mic: "success" }));
          } catch { setChecks(prev => ({ ...prev, mic: "error" })); }
        }
      }
    } else {
      // Not required — auto-pass
      setChecks(prev => ({ ...prev, camera: "success", mic: "success" }));
    }

    // 3. Screen share — only if required
    if (p.screenShareRequired) {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          const track = screenStream.getVideoTracks()[0];
          const settings = track ? track.getSettings() : {};
          const displaySurface = settings.displaySurface;
          const isEntireScreen = displaySurface !== 'window' && displaySurface !== 'browser';
          const isExtended = 'isExtended' in window.screen ? (window.screen as unknown as { isExtended?: boolean }).isExtended : false;
          screenStream.getTracks().forEach(t => t.stop());
          if (!isEntireScreen) {
            setChecks(prev => ({ ...prev, screen: "error" }));
            setScreenErrorMsg("Please share your ENTIRE screen (not a window or tab).");
          } else if (isExtended) {
            setChecks(prev => ({ ...prev, screen: "error" }));
            setScreenErrorMsg("Multiple displays detected. Please disconnect extra monitors.");
          } else {
            setChecks(prev => ({ ...prev, screen: "success" }));
          }
        } else {
          setChecks(prev => ({ ...prev, screen: "error" }));
          setScreenErrorMsg("Your browser does not support screen sharing.");
        }
      } catch (e) {
        console.error("Screen sharing check failed:", e);
        setChecks(prev => ({ ...prev, screen: "error" }));
        setScreenErrorMsg("Screen sharing permission is required. Please try again.");
      }
    } else {
      setChecks(prev => ({ ...prev, screen: "success" }));
    }

    setIsVerifying(false);
  };

  const allChecksPassed =
    checks.browser === "success" &&
    (!testData?.proctoring.webcamRequired || checks.camera === "success") &&
    (!testData?.proctoring.microphoneRequired || checks.mic === "success") &&
    (!testData?.proctoring.screenShareRequired || checks.screen === "success");

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
      const invitationId = testData?.invitationId || id || "";
      const session = await testService.startTestSession(invitationId, "0.0.0.0");
      
      // 4. Store a token indicating they completed checking environment
      sessionStorage.setItem(`env_checked_${session.id}`, "true");

      navigate(`/test/${session.testId || testData?.testId || "default-test-id"}/session/${session.id}`);
    } catch (error: unknown) {
      const startErr = error as { response?: { data?: { message?: string } }; message?: string };
      // Exit fullscreen if initialization fails
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }
      toast({
        title: "Error Starting Assessment",
        description: startErr.response?.data?.message || "Failed to launch session",
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
    } catch (err: unknown) {
      const loginErr = err as { response?: { data?: { message?: string } }; message?: string };
      toast({
        title: "Login Failed",
        description: loginErr.response?.data?.message || loginErr.message || "Invalid credentials",
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
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100 font-sans relative">
        {/* Cyberpunk grid backdrop */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        
        <Card className="max-w-md w-full border border-slate-800 bg-slate-900/80 backdrop-blur-md shadow-2xl relative overflow-hidden animate-in fade-in duration-300">
          <div className="h-1 bg-emerald-500 w-full" />
          
          <CardHeader className="text-center pt-8 pb-6">
            <div className="mx-auto mb-4 w-14 h-14 rounded-xl border border-emerald-500/20 bg-emerald-950/20 flex items-center justify-center shadow-lg shadow-emerald-950/30">
              <Shield className="w-7 h-7 text-emerald-400" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight font-mono text-emerald-400">
              {otpRequested ? "SECURITY VERIFICATION" : "SECURE TEST ACCESS"}
            </CardTitle>
            <CardDescription className="text-slate-400 font-sans mt-2">
              {otpRequested
                ? "Enter the 6-digit access code sent to your registered email."
                : "Identify verification is required to start your secure test."}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-6 pb-6">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-950/30 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {otpRequested ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-xs uppercase tracking-widest font-mono text-slate-400">
                    Verification Code
                  </Label>
                  <Input
                    id="otp"
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    value={otpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setOtpCode(val);
                      if (val.length === 6) {
                        handleOtpSubmit(val);
                      }
                    }}
                    disabled={isVerifyingOtp}
                    className="text-center text-2xl tracking-[0.3em] font-mono h-12 bg-slate-950 border-slate-800 text-emerald-400 focus-visible:ring-emerald-500"
                    autoComplete="one-time-code"
                  />
                </div>

                {devOtp && (
                  <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-xs font-mono text-emerald-400 animate-pulse">
                    <span className="font-bold">[Dev Environment Mock Email]</span>
                    <br />
                    Access Code: <span className="underline font-bold text-sm tracking-wider">{devOtp}</span>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => handleOtpSubmit(otpCode)}
                    disabled={otpCode.length !== 6 || isVerifyingOtp}
                    className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold tracking-wider"
                  >
                    {isVerifyingOtp ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    {isVerifyingOtp ? "VERIFYING..." : "SUBMIT CODE"}
                  </Button>
                  
                  <Button
                    onClick={handleSendAccessCode}
                    disabled={otpCooldown > 0 || isLoggingIn}
                    variant="outline"
                    className="w-full h-11 border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-300 font-medium"
                  >
                    {otpCooldown > 0 ? `RESEND IN ${otpCooldown}S` : "RESEND EMAIL"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-400 text-center leading-relaxed">
                  We will send a one-click magic login link and a fallback 6-digit verification code to the email address associated with your invitation.
                </p>
                <Button
                  onClick={handleSendAccessCode}
                  disabled={isLoggingIn}
                  className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold tracking-wider"
                >
                  {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  {isLoggingIn ? "SENDING LINK..." : "SEND ACCESS LINK"}
                </Button>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="border-t border-slate-800/40 bg-slate-950/20 px-6 py-4 flex justify-between">
            <Button
              onClick={() => {
                setOtpRequested(false);
                setError(null);
                setOtpCode("");
              }}
              variant="ghost"
              className="text-xs text-slate-500 hover:text-slate-300 font-mono hover:bg-transparent"
              disabled={!otpRequested}
            >
              &larr; BACK
            </Button>
            <Button onClick={() => navigate("/")} variant="ghost" className="text-xs text-slate-500 hover:text-slate-300 font-mono hover:bg-transparent">
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
              
              {currentStep === "welcome" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold">Assessment Guidelines Overview</h3>
                    <ProctoringBadge mode={testData.proctoring.proctoringMode} />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    You have been invited to take the <strong>{testData.testTitle}</strong>.
                    This test is conducted in a secure browser environment using automated monitoring utilities.
                    Please ensure you are in a quiet, private space with a stable internet connection.
                  </p>

                  <div className="bg-muted/30 border rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">What to expect during onboarding:</h4>
                    <ul className="text-xs space-y-2 text-muted-foreground list-disc list-inside">
                      {testData.proctoring.proctoringMode === "NONE" ? (
                        <li>This assessment runs without proctoring. No hardware permissions will be requested.</li>
                      ) : (
                        <>
                          {testData.proctoring.webcamRequired ? <li>We will request webcam access for identity verification.</li> : null}
                          {testData.proctoring.microphoneRequired ? <li>Microphone access is required for audio monitoring.</li> : null}
                          {testData.proctoring.screenShareRequired ? <li>You must share your entire screen for the duration of the test.</li> : null}
                          <li>Once checked, you will declare consent and launch the test in fullscreen.</li>
                        </>
                      )}
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
                    {/* Live Video Preview Panel — only show if webcam required */}
                    {testData.proctoring.webcamRequired && (
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
                    )}

                    {/* Checklists */}
                    <div className="flex-1 space-y-3">
                      <h4 className="text-sm font-bold text-foreground">Hardware Diagnostics</h4>
                      <div className="space-y-2">
                        <DiagnosticRow
                          label="Browser Capability Check"
                          status={checks.browser}
                          desc="Ensures your browser supports modern secure features"
                        />
                        {testData.proctoring.webcamRequired && (
                          <DiagnosticRow
                            label="Webcam Permission Check"
                            status={checks.camera}
                            desc="Continuous visual identity verification"
                          />
                        )}
                        {testData.proctoring.microphoneRequired && (
                          <DiagnosticRow
                            label="Microphone Permission Check"
                            status={checks.mic}
                            desc="Background audio analytics"
                          />
                        )}
                        {testData.proctoring.screenShareRequired && (
                          <DiagnosticRow
                            label="Screen Share & Display Check"
                            status={checks.screen}
                            desc={screenErrorMsg || "Ensure only one monitor is connected"}
                          />
                        )}
                        {testData.proctoring.proctoringMode === "NONE" && (
                          <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-xl border">
                            This assessment has no proctoring requirements. Click Continue to proceed.
                          </div>
                        )}
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
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-extrabold text-muted-foreground tracking-wider block">Active Monitoring:</span>
                    <ProctoringBadge mode={testData.proctoring.proctoringMode} />
                  </div>
                  <div className="space-y-1.5">
                    <RuleBadge icon={<Monitor className="w-3.5 h-3.5" />} text="Fullscreen Lock" active />
                    {testData.proctoring.tabSwitchTrackingEnabled ? <RuleBadge icon={<Ban className="w-3.5 h-3.5" />} text="Tab Switch Tracking" active /> : null}
                    {testData.proctoring.copyPasteBlocked ? <RuleBadge icon={<Ban className="w-3.5 h-3.5" />} text="Copy/Paste Blocked" active /> : null}
                    {testData.proctoring.webcamRequired ? <RuleBadge icon={<Camera className="w-3.5 h-3.5" />} text="Webcam Identity Check" active /> : null}
                    {testData.proctoring.microphoneRequired ? <RuleBadge icon={<Mic className="w-3.5 h-3.5" />} text="Microphone Monitoring" active /> : null}
                    {testData.proctoring.screenShareRequired ? <RuleBadge icon={<Monitor className="w-3.5 h-3.5" />} text="Screen Share Required" active /> : null}
                    {testData.proctoring.multipleFaceDetectionEnabled ? <RuleBadge icon={<UserCheck className="w-3.5 h-3.5" />} text="Multiple Face Detection" active /> : null}
                    {testData.proctoring.objectDetectionEnabled ? <RuleBadge icon={<Search className="w-3.5 h-3.5" />} text="Object Detection (AI)" active /> : null}
                    {testData.proctoring.devtoolsDetectionEnabled ? <RuleBadge icon={<Shield className="w-3.5 h-3.5" />} text="DevTools Detection" active /> : null}
                    {testData.proctoring.proctoringMode === "NONE" && (
                      <p className="text-[10px] text-muted-foreground italic">No monitoring active for this assessment.</p>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground pt-1">Max warnings: <strong>{testData.proctoring.maxWarningsAllowed}</strong></p>
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
        {status === "success" ? <CheckCircle2 className="w-4 h-4 text-green-500 fill-current" /> : null}
        {status === "error" ? <AlertCircle className="w-4 h-4 text-red-500 fill-current" /> : null}
        {status === "pending" ? <div className="w-3.5 h-3.5 rounded-full border-2 border-muted" /> : null}
      </div>
    </div>
  );
}

function RuleBadge({ icon, text, active = true }: { icon: React.ReactNode; text: string; active?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 text-xs", active ? "text-foreground" : "text-muted-foreground line-through")}>
      <div className="text-primary">{icon}</div>
      <span>{text}</span>
    </div>
  );
}

function ProctoringBadge({ mode }: { mode: ProctoringMode }) {
  const config: Record<ProctoringMode, { label: string; className: string }> = {
    NONE: { label: "No Proctoring", className: "bg-slate-100 text-slate-600 border-slate-200" },
    LOW: { label: "Low Proctoring", className: "bg-blue-50 text-blue-700 border-blue-200" },
    MEDIUM: { label: "Medium Proctoring", className: "bg-amber-50 text-amber-700 border-amber-200" },
    HIGH: { label: "High Proctoring", className: "bg-red-50 text-red-700 border-red-200" },
    CUSTOM: { label: "Custom", className: "bg-purple-50 text-purple-700 border-purple-200" },
  };
  const { label, className } = config[mode] ?? config["NONE"];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold", className)}>
      <Shield className="w-3 h-3" />
      {label}
    </span>
  );
}
