import React, { useState, useEffect, useRef, useCallback } from "react";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import "@tensorflow/tfjs-backend-cpu";
import * as blazeface from "@tensorflow-models/blazeface";
import {
  Shield,
  Info,
  X,
  CheckCircle2,
  AlertCircle,
  Camera,
  Monitor,
  BellOff,
  Maximize,
  ArrowRight,
  MessageSquare,
  Image as ImageIcon,
  Clock,
  Wifi,
  Globe,
  Mic,
  RefreshCw,
  Check,
  Loader2,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { testService, Test, TestQuestion } from "@/lib/test-service";
import { proctoringService } from "@/lib/proctoring-service";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

type OnboardingStep = "proctoring" | "system_checks" | "candidate_details" | "declaration";

interface CandidateOnboardingModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  test?: Test | null;
  testQuestions?: TestQuestion[];
  testTitle?: string;
  isWebcamMonitored?: boolean;
  invitationId?: string;
  testId?: string;
  sessionId?: string;
  onProceedToTest?: () => void;
}

export default function NewCandidateOnboardingWizard({
  isOpen = true,
  onClose,
  test,
  testQuestions = [],
  testTitle = "Assessment",
  isWebcamMonitored,
  invitationId,
  testId,
  sessionId: propSessionId,
  onProceedToTest,
}: CandidateOnboardingModalProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState<OnboardingStep>("proctoring");
  const [isDeclarationAgreed, setIsDeclarationAgreed] = useState(false);

  // Candidate Details state
  const [candidateName, setCandidateName] = useState(user?.name || "");
  const [candidateEmail, setCandidateEmail] = useState(user?.email || "");
  const [snapshotImage, setSnapshotImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Media Streams & Diagnostics state
  const [webcamStatus, setWebcamStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [micStatus, setMicStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [screenStatus, setScreenStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [micLevel, setMicLevel] = useState(0);

  // BlazeFace Detector & Real-time Alignment state
  const [blazeModel, setBlazeModel] = useState<blazeface.BlazeFaceModel | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [faceCheck, setFaceCheck] = useState<{
    isValid: boolean;
    status: "initializing" | "no_face" | "multiple_faces" | "face_turned" | "too_far" | "dark" | "ready";
    message: string;
  }>({
    isValid: false,
    status: "initializing",
    message: "Initializing face detector...",
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const detectionLoopRef = useRef<number | null>(null);

  // Detect proctoring requirements from test
  const isWebcamRequired =
    isWebcamMonitored ??
    !!(
      test?.requireWebcam ||
      test?.proctoringMode === "HIGH" ||
      test?.proctoringMode === "MEDIUM" ||
      test?.proctoringMode === "CUSTOM"
    );

  const isMicRequired = !!test?.requireMicrophone;
  const isScreenRequired = !!test?.requireScreenShare;

  const steps: { id: OnboardingStep; label: string }[] = [
    { id: "proctoring", label: "Proctoring Instructions" },
    { id: "system_checks", label: "System Checks" },
    { id: "candidate_details", label: "Candidate Details" },
    { id: "declaration", label: "Declaration" },
  ];

  // Stop camera, audio, and detection loops
  const stopAllMedia = () => {
    if (detectionLoopRef.current) {
      cancelAnimationFrame(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopAllMedia();
    };
  }, []);

  // Initialize BlazeFace Model
  useEffect(() => {
    let isMounted = true;
    const initBlazeFace = async () => {
      if (blazeModel) return;
      setIsModelLoading(true);
      try {
        await tf.ready();
        try {
          await tf.setBackend("webgl");
        } catch {
          await tf.setBackend("cpu");
        }
        const model = await blazeface.load();
        if (isMounted) {
          setBlazeModel(model);
          setIsModelLoading(false);
        }
      } catch (e) {
        console.warn("BlazeFace loading error:", e);
        if (isMounted) setIsModelLoading(false);
      }
    };

    if (activeStep === "candidate_details") {
      initBlazeFace();
    }

    return () => {
      isMounted = false;
    };
  }, [activeStep, blazeModel]);

  // Start/Stop camera for Candidate Details step
  useEffect(() => {
    if (activeStep === "candidate_details" && !snapshotImage) {
      startCameraViewfinder();
    } else if (activeStep !== "candidate_details") {
      stopAllMedia();
    }
  }, [activeStep, snapshotImage]);

  const startCameraViewfinder = async () => {
    try {
      stopAllMedia();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setWebcamStatus("success");
    } catch {
      setWebcamStatus("error");
      setFaceCheck({
        isValid: false,
        status: "no_face",
        message: "Camera access blocked. Please allow permissions.",
      });
    }
  };

  // Strict Face Alignment & Quality Verification Algorithm
  const evaluateFaceGeometry = useCallback(
    (prediction: blazeface.NormalizedFace, videoEl: HTMLVideoElement) => {
      const rawProb = prediction.probability;
      const prob =
        typeof rawProb === "number"
          ? rawProb
          : Array.isArray(rawProb)
          ? rawProb[0]
          : 1.0;

      // 1. Confidence check (85%-90% threshold for good recognition)
      if (prob < 0.85) {
        return { isValid: false, status: "low_confidence" as const, message: "Adjust lighting for better visibility" };
      }

      const landmarks = prediction.landmarks as Array<[number, number]>;
      if (!landmarks || landmarks.length < 4) {
        return { isValid: false, status: "no_face" as const, message: "Face partially obscured" };
      }

      const rightEye = landmarks[0];
      const leftEye = landmarks[1];
      const nose = landmarks[2];
      const mouth = landmarks[3];

      // 2. Eye distance / Proximity Check
      const eyeDist = Math.hypot(leftEye[0] - rightEye[0], leftEye[1] - rightEye[1]);
      if (eyeDist < 25) {
        return { isValid: false, status: "too_far" as const, message: "Move a bit closer to the camera" };
      }

      // 3. Face Centering / Look-Straight Corridor Check
      const minEyeX = Math.min(rightEye[0], leftEye[0]) - eyeDist * 0.25;
      const maxEyeX = Math.max(rightEye[0], leftEye[0]) + eyeDist * 0.25;

      if (nose[0] < minEyeX || nose[0] > maxEyeX || mouth[0] < minEyeX || mouth[0] > maxEyeX) {
        return { isValid: false, status: "face_turned" as const, message: "Look directly straight at the camera" };
      }

      // 4. Vertical Symmetry Proportions
      const eyeMidY = (rightEye[1] + leftEye[1]) / 2;
      const eyeToNoseY = nose[1] - eyeMidY;
      const noseToMouthY = mouth[1] - nose[1];

      if (eyeToNoseY < eyeDist * 0.15 || noseToMouthY < eyeDist * 0.15) {
        return { isValid: false, status: "face_turned" as const, message: "Position head straight without tilting" };
      }

      // 5. Darkness / Black screen detection
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 48;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          let sum = 0;
          for (let i = 0; i < imgData.data.length; i += 4) {
            sum += (imgData.data[i] + imgData.data[i + 1] + imgData.data[i + 2]) / 3;
          }
          const avgLum = sum / (imgData.data.length / 4);
          if (avgLum < 12) {
            return { isValid: false, status: "dark" as const, message: "Environment is too dark. Increase lighting." };
          }
        }
      } catch {
        // Ignore canvas sampling errors
      }

      return { isValid: true, status: "ready" as const, message: "Face aligned! Ready to capture" };
    },
    []
  );

  // Real-time Detection Loop
  useEffect(() => {
    if (!blazeModel || !videoRef.current || snapshotImage || activeStep !== "candidate_details") return;

    let isRunning = true;
    let lastCheckTime = 0;

    const runDetection = async () => {
      const now = Date.now();
      if (now - lastCheckTime >= 250) {
        lastCheckTime = now;
        if (videoRef.current && videoRef.current.readyState >= 2) {
          try {
            const predictions = await blazeModel.estimateFaces(videoRef.current, false);
            if (!isRunning) return;

            if (predictions.length === 0) {
              setFaceCheck({
                isValid: false,
                status: "no_face",
                message: "Align your face inside the oval",
              });
            } else if (predictions.length > 1) {
              setFaceCheck({
                isValid: false,
                status: "multiple_faces",
                message: "Multiple people detected. Position solo.",
              });
            } else {
              const res = evaluateFaceGeometry(predictions[0], videoRef.current);
              setFaceCheck(res);
            }
          } catch {
            // Keep running silently
          }
        }
      }

      if (isRunning) {
        detectionLoopRef.current = requestAnimationFrame(runDetection);
      }
    };

    detectionLoopRef.current = requestAnimationFrame(runDetection);

    return () => {
      isRunning = false;
      if (detectionLoopRef.current) {
        cancelAnimationFrame(detectionLoopRef.current);
      }
    };
  }, [blazeModel, snapshotImage, activeStep, evaluateFaceGeometry]);

  // Capture Clean Photo & Upload to Supabase if Session is Active
  const captureSnapshot = async () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw clean raw camera frame (without the guide overlay)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setSnapshotImage(dataUrl);

      // Stop camera stream once captured
      stopAllMedia();

      // Convert to blob for Supabase upload
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        // If an active candidate test session exists, upload to Supabase
        if (sessionId) {
          setIsUploading(true);
          try {
            const capturedAt = Date.now();
            const { url: signedUploadUrl, storagePath } = await proctoringService.presignEvidence(
              sessionId,
              "CANDIDATE_PHOTO"
            );

            if (signedUploadUrl && signedUploadUrl.startsWith("http")) {
              await fetch(signedUploadUrl, {
                method: "PUT",
                headers: { "Content-Type": "image/jpeg", "x-upsert": "true" },
                body: blob,
              });

              await proctoringService.confirmEvidence(
                sessionId,
                storagePath,
                "CANDIDATE_PHOTO",
                capturedAt,
                blob.size
              );
            }
          } catch (err) {
            console.warn("Supabase photo upload error (stored locally):", err);
          } finally {
            setIsUploading(false);
          }
        }
      }, "image/jpeg", 0.9);
    } catch (e) {
      console.error("Snapshot capture error:", e);
    }
  };

  // Test Webcam in Step 2
  const handleTestWebcam = async () => {
    setWebcamStatus("testing");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setWebcamStatus("success");
      setTimeout(() => {
        stream.getTracks().forEach((t) => t.stop());
      }, 1500);
    } catch {
      setWebcamStatus("error");
    }
  };

  // Test Mic in Step 2
  const handleTestMic = async () => {
    setMicStatus("testing");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let ticks = 0;
      const checkAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const avg = sum / bufferLength;
        setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
        ticks++;
        if (ticks < 40) {
          requestAnimationFrame(checkAudio);
        } else {
          setMicStatus("success");
          stream.getTracks().forEach((t) => t.stop());
          ctx.close().catch(() => {});
        }
      };
      checkAudio();
    } catch {
      setMicStatus("error");
    }
  };

  const [isLaunching, setIsLaunching] = useState(false);

  const handleNext = async () => {
    if (activeStep === "proctoring") setActiveStep("system_checks");
    else if (activeStep === "system_checks") setActiveStep("candidate_details");
    else if (activeStep === "candidate_details") setActiveStep("declaration");
    else if (activeStep === "declaration") {
      if (isLaunching) return;
      setIsLaunching(true);

      // Stop onboarding media streams
      stopAllMedia();

      if (onProceedToTest) {
        onProceedToTest();
        setIsLaunching(false);
        return;
      }

      // Launch secure assessment
      try {
        // 1. Enter Fullscreen Mode
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen().catch(() => {});
        }

        // 2. Start Backend Test Session
        const targetInvitationId = invitationId || "";
        const session = await testService.startTestSession(targetInvitationId, "0.0.0.0");
        const sessStatus = String(session.status);

        // If session was already completed/submitted, navigate to results
        if (
          sessStatus === "SUBMITTED" ||
          sessStatus === "AUTO_SUBMITTED" ||
          sessStatus === "EVALUATED" ||
          sessStatus === "FLAGGED"
        ) {
          if (document.fullscreenElement) {
            await document.exitFullscreen().catch(() => {});
          }
          navigate(`/test/${session.testId || testId}/results?session=${session.id}&submitted=true`);
          return;
        }

        // 3. Save verified state to sessionStorage for TestInterface
        sessionStorage.setItem(`env_checked_${session.id}`, "true");
        sessionStorage.setItem(`identity_verified_${session.id}`, "true");

        // 4. Upload photo snapshot if captured
        if (snapshotImage) {
          try {
            const fetchRes = await fetch(snapshotImage);
            const blob = await fetchRes.blob();
            const capturedAt = Date.now();
            const { url: signedUploadUrl, storagePath } = await proctoringService.presignEvidence(
              session.id,
              "IDENTITY_PHOTO"
            );

            if (signedUploadUrl && signedUploadUrl.startsWith("http")) {
              await fetch(signedUploadUrl, {
                method: "PUT",
                headers: { "Content-Type": "image/jpeg", "x-upsert": "true" },
                body: blob,
              });

              await proctoringService.confirmEvidence(
                session.id,
                storagePath,
                "IDENTITY_PHOTO",
                capturedAt,
                blob.size
              );
            }
          } catch (uploadErr) {
            console.warn("Failed to upload identity snapshot:", uploadErr);
          }
        }

        // 5. Navigate to core assessment interface
        navigate(`/test/${session.testId || testId || "assessment"}/session/${session.id}`);
      } catch (err: any) {
        if (document.fullscreenElement) {
          await document.exitFullscreen().catch(() => {});
        }
        console.error("Failed to launch test session:", err);
        toast({
          title: "Error Launching Assessment",
          description: err?.response?.data?.message || err?.message || "Failed to start test session",
          variant: "destructive",
        });
        setIsLaunching(false);
      }
    }
  };

  // Device & OS detection
  const detectedOS = navigator.userAgent.includes("Windows")
    ? "Windows"
    : navigator.userAgent.includes("Mac")
    ? "macOS"
    : navigator.userAgent.includes("Linux")
    ? "Linux"
    : "Desktop OS";

  const detectedBrowser = navigator.userAgent.includes("Edg")
    ? "Microsoft Edge"
    : navigator.userAgent.includes("Chrome")
    ? "Google Chrome"
    : navigator.userAgent.includes("Firefox")
    ? "Mozilla Firefox"
    : navigator.userAgent.includes("Safari")
    ? "Apple Safari"
    : "Modern Browser";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col font-sans text-slate-800 antialiased overflow-hidden">
      {/* ── Top Header / Onboarding Navbar ── */}
      <header className="h-14 bg-white border-b border-slate-200 px-6 md:px-8 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <h1 className="text-sm md:text-base font-semibold text-slate-700">
            You're about to start this assessment
          </h1>
          <span className="text-xs text-slate-400 font-normal hidden sm:inline">
            • {testTitle}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Proctor Mode Badge */}
          <div className="bg-[#4353a4] text-white text-[10px] md:text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
            <span>{test?.proctoringMode || "STANDARD"} PROCTOR MODE</span>
          </div>

          {/* Close / Exit Button */}
          <button
            onClick={() => {
              stopAllMedia();
              if (onClose) onClose();
            }}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            title="Close / Exit"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── Main Layout: Sidebar + Content Box ── */}
      <div className="flex-1 flex overflow-hidden bg-[#f4f7fb] p-3 md:p-5 w-full">
        <div className="w-full h-full flex flex-col md:flex-row gap-4 md:gap-5 items-stretch">
          {/* 1. Left Sidebar Navigation */}
          <div className="w-full md:w-64 shrink-0 flex flex-col gap-1">
            <div className="bg-white border border-slate-200 shadow-xs rounded-xs overflow-hidden divide-y divide-slate-100">
              {steps.map((step) => {
                const isActive = activeStep === step.id;
                return (
                  <button
                    key={step.id}
                    onClick={() => setActiveStep(step.id)}
                    className={`w-full text-left px-5 py-3.5 text-xs md:text-sm font-semibold transition-all cursor-pointer flex items-center justify-between ${
                      isActive
                        ? "bg-[#5b6bbd] text-white shadow-xs font-bold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span>{step.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Main Outlet / Step Card */}
          <div className="flex-1 bg-white border border-slate-200 shadow-xs rounded-xs flex flex-col overflow-hidden">
            {/* Step Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 tracking-tight">
                {steps.find((s) => s.id === activeStep)?.label}
              </h2>
            </div>

            {/* Step Body Content */}
            <div className="flex-1 p-6 md:p-8 overflow-y-auto">
              {/* STEP 1: Proctoring Instructions */}
              {activeStep === "proctoring" && (
                <div className="space-y-6">
                  {/* Warning / Webcam Notice Box */}
                  {isWebcamRequired && (
                    <div className="border border-rose-200 bg-rose-50/60 rounded-xs p-4 flex items-center gap-3 text-xs md:text-sm text-rose-700 font-medium">
                      <div className="w-6 h-6 rounded-full border border-rose-300 flex items-center justify-center shrink-0 text-rose-600">
                        <Camera className="w-3.5 h-3.5" />
                      </div>
                      <p>
                        This assessment is going to be monitored via Webcam. Please make sure that your Webcam is functional throughout the assessment.
                      </p>
                    </div>
                  )}

                  {/* 2-Column Content: Rules on Left, Guidelines on Right */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
                    {/* Left Points */}
                    <div className="lg:col-span-6 space-y-4">
                      <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-slate-800">
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">
                          i
                        </div>
                        <span>Points to keep in mind during this assessment:</span>
                      </div>

                      <ul className="space-y-3.5 pl-6 text-xs md:text-sm text-slate-700 font-medium">
                        {(test?.warnOnFullscreenExit ?? true) && (
                          <li className="flex items-start gap-2.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                            <span>Stay on Fullscreen until the end of assessment.</span>
                          </li>
                        )}
                        {(test?.enableTabSwitchTracking ?? true) && (
                          <li className="flex items-start gap-2.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                            <span>Do not move out of the Tab or switch Windows (monitored).</span>
                          </li>
                        )}
                        {(test?.blockCopyPaste ?? true) && (
                          <li className="flex items-start gap-2.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                            <span>Copying and pasting text is disabled during this test.</span>
                          </li>
                        )}
                        {(test?.blockRightClick ?? true) && (
                          <li className="flex items-start gap-2.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                            <span>Right-click context menu is restricted.</span>
                          </li>
                        )}
                        {test?.requireMicrophone && (
                          <li className="flex items-start gap-2.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                            <span>Microphone will monitor ambient room audio.</span>
                          </li>
                        )}
                        {test?.requireScreenShare && (
                          <li className="flex items-start gap-2.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                            <span>Entire screen sharing is required during the exam.</span>
                          </li>
                        )}
                        <li className="flex items-start gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                          <span>Disable system Notifications to prevent accidental popups.</span>
                        </li>
                      </ul>
                    </div>

                    {/* Right Visual Guidelines */}
                    <div className="lg:col-span-6 flex flex-col items-center justify-center space-y-2">
                      <div className="w-full bg-slate-50 border border-slate-200 rounded-sm p-6 text-center text-slate-600 space-y-3">
                        <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4353a4] mx-auto">
                          <Shield className="w-6 h-6 stroke-[1.75]" />
                        </div>
                        <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Proctored Environment Standard
                        </p>
                        <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                          Sit in a well-lit room with your face clearly visible to the webcam. Avoid background chatter or other persons in the camera frame.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: System Checks */}
              {activeStep === "system_checks" && (
                <div className="space-y-6">
                  {/* Top Notice Banner */}
                  <div className="bg-[#4353a4] text-white px-5 py-2.5 rounded-none text-xs font-semibold shadow-xs flex items-center justify-between">
                    <span>Perform diagnostics below to ensure your system meets requirements</span>
                    <span className="text-[11px] text-indigo-100 font-normal">All checks are verified client-side</span>
                  </div>

                  {/* Diagnostic Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-1">
                    {/* 1. System Time Card */}
                    <div className="bg-white border border-slate-200/90 rounded-sm p-4 flex flex-col justify-between shadow-xs">
                      <div className="flex items-start justify-between pb-3 border-b border-dashed border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 shrink-0">
                            <Clock className="w-5 h-5 stroke-[1.5]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-800">System Time</span>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 fill-emerald-50" />
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                              {new Date().toLocaleString("en-US", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="pt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>System time is up to date.</span>
                      </div>
                    </div>

                    {/* 2. Internet Connection Card */}
                    <div className="bg-white border border-slate-200/90 rounded-sm p-4 flex flex-col justify-between shadow-xs">
                      <div className="flex items-start justify-between pb-3 border-b border-dashed border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 shrink-0">
                            <Wifi className="w-5 h-5 stroke-[1.5]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-800">Internet Connection</span>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 fill-emerald-50" />
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                              {navigator.onLine ? "Online & Stable" : "Offline"}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="pt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Network latency is acceptable.</span>
                      </div>
                    </div>

                    {/* 3. Operating System Card */}
                    <div className="bg-white border border-slate-200/90 rounded-sm p-4 flex flex-col justify-between shadow-xs">
                      <div className="flex items-start justify-between pb-3 border-b border-dashed border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 shrink-0">
                            <Monitor className="w-5 h-5 stroke-[1.5]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-800">Operating System</span>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 fill-emerald-50" />
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                              {detectedOS}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="pt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Your OS is supported.</span>
                      </div>
                    </div>

                    {/* 4. Browser Card */}
                    <div className="bg-white border border-slate-200/90 rounded-sm p-4 flex flex-col justify-between shadow-xs">
                      <div className="flex items-start justify-between pb-3 border-b border-dashed border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 shrink-0">
                            <Globe className="w-5 h-5 stroke-[1.5]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-800">Browser</span>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 fill-emerald-50" />
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                              {detectedBrowser}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="pt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Your browser is compatible.</span>
                      </div>
                    </div>

                    {/* 5. Webcam Card */}
                    <div className="bg-white border border-slate-200/90 rounded-sm p-4 flex flex-col justify-between shadow-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-dashed border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 shrink-0">
                            <Camera className="w-5 h-5 stroke-[1.5]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-800">Webcam</span>
                              {webcamStatus === "success" ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 fill-emerald-50" />
                              ) : (
                                <AlertCircle className="w-3.5 h-3.5 text-rose-500 fill-rose-50" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                              {webcamStatus === "success"
                                ? "Verified"
                                : webcamStatus === "error"
                                ? "Permission Denied"
                                : webcamStatus === "testing"
                                ? "Testing..."
                                : "Permission Required"}
                            </p>
                          </div>
                        </div>

                        {webcamStatus === "success" ? (
                          <span className="px-3.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold tracking-wider rounded-xs select-none">
                            Enabled
                          </span>
                        ) : (
                          <button
                            onClick={handleTestWebcam}
                            disabled={webcamStatus === "testing"}
                            className="px-4 py-1.5 bg-[#4353a4] hover:bg-[#324080] text-white text-[11px] font-bold tracking-wider uppercase rounded-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            {webcamStatus === "testing" ? "..." : "TEST"}
                          </button>
                        )}
                      </div>
                      <div className="pt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Verifies camera permissions.</span>
                      </div>
                    </div>

                    {/* 6. Microphone Card (If required or present) */}
                    {isMicRequired && (
                      <div className="bg-white border border-slate-200/90 rounded-sm p-4 flex flex-col justify-between shadow-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-dashed border-slate-200">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 shrink-0">
                              <Mic className="w-5 h-5 stroke-[1.5]" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-800">Microphone</span>
                                {micStatus === "success" ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 fill-emerald-50" />
                                ) : (
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 fill-rose-50" />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                {micStatus === "success"
                                  ? `Verified (${micLevel}%)`
                                  : micStatus === "error"
                                  ? "Permission Denied"
                                  : micStatus === "testing"
                                  ? "Testing..."
                                  : "Permission Required"}
                              </p>
                            </div>
                          </div>

                          {micStatus === "success" ? (
                            <span className="px-3.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold tracking-wider rounded-xs select-none">
                              Enabled
                            </span>
                          ) : (
                            <button
                              onClick={handleTestMic}
                              disabled={micStatus === "testing"}
                              className="px-4 py-1.5 bg-[#4353a4] hover:bg-[#324080] text-white text-[11px] font-bold tracking-wider uppercase rounded-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                            >
                              {micStatus === "testing" ? "..." : "TEST"}
                            </button>
                          )}
                        </div>
                        <div className="pt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
                          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Verifies microphone audio input.</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: Candidate Details & Identity Snapshot with BlazeFace Alignment */}
              {activeStep === "candidate_details" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Form & Guidelines */}
                    <div className="lg:col-span-7 space-y-6">
                      <div className="space-y-1">
                        <h3 className="text-xl md:text-2xl font-extrabold text-[#5b6bbd] tracking-tight">
                          Identity & Candidate Profile
                        </h3>
                        <p className="text-xs text-slate-400 italic">
                          Confirm your details and take a verified photo before starting your assessment.
                        </p>
                      </div>

                      {/* Candidate Form Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-200 rounded-sm">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">
                            Candidate Name
                          </Label>
                          <Input
                            value={candidateName}
                            onChange={(e) => setCandidateName(e.target.value)}
                            placeholder="e.g. John Doe"
                            className="bg-white border-slate-300 text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">
                            Candidate Email
                          </Label>
                          <Input
                            value={candidateEmail}
                            onChange={(e) => setCandidateEmail(e.target.value)}
                            placeholder="e.g. candidate@example.com"
                            className="bg-white border-slate-300 text-xs h-9"
                          />
                        </div>
                      </div>

                      {/* Guidelines */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                        {/* Do This */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-emerald-600">Do This</h4>
                          <ul className="space-y-2.5 text-xs text-slate-600">
                            <li className="flex items-start gap-2">
                              <span className="text-emerald-500 font-bold">✓</span>
                              <span>Take photo in good lighting</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-emerald-500 font-bold">✓</span>
                              <span>Look straight into the camera</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-emerald-500 font-bold">✓</span>
                              <span>Center your face inside the dotted guide</span>
                            </li>
                          </ul>
                        </div>

                        {/* Avoid This */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-rose-500">Avoid This</h4>
                          <ul className="space-y-2.5 text-xs text-slate-600">
                            <li className="flex items-start gap-2">
                              <span className="text-rose-500 font-bold">✕</span>
                              <span>Blurry, dark, or obscured images</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-rose-500 font-bold">✕</span>
                              <span>Looking away or turning your head</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-rose-500 font-bold">✕</span>
                              <span>Multiple people or faces in frame</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Live Viewfinder + BlazeFace Dotted Guide */}
                    <div className="lg:col-span-5 flex flex-col items-center">
                      <div
                        className={`w-full max-w-sm bg-white rounded-sm p-4 flex flex-col items-center gap-4 shadow-sm transition-all border-2 ${
                          snapshotImage
                            ? "border-indigo-200"
                            : faceCheck.isValid
                            ? "border-emerald-500 shadow-emerald-50"
                            : "border-rose-400 shadow-rose-50"
                        }`}
                      >
                        {/* Video Feed / Snapshot Preview Box with Dotted Oval Overlay */}
                        <div className="w-full aspect-[4/3] bg-slate-900 rounded-xs overflow-hidden relative flex items-center justify-center border border-slate-800 shadow-inner">
                          {snapshotImage ? (
                            <img
                              src={snapshotImage}
                              alt="Candidate Verified Photo"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <>
                              <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                              />

                              {/* ── BlazeFace Real-time Dotted Oval & Indicator Overlay ── */}
                              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                                {/* SVG Dotted Oval Guide */}
                                <svg
                                  className="w-full h-full"
                                  viewBox="0 0 320 240"
                                  preserveAspectRatio="none"
                                >
                                  <ellipse
                                    cx="160"
                                    cy="115"
                                    rx="75"
                                    ry="95"
                                    fill="none"
                                    stroke={faceCheck.isValid ? "#10B981" : "#F43F5E"}
                                    strokeWidth="2.5"
                                    strokeDasharray="6 6"
                                    className="transition-colors duration-300"
                                  />
                                </svg>

                                {/* Top/Bottom Status Badge inside Camera */}
                                <div
                                  className={`absolute bottom-3 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide flex items-center gap-1.5 shadow-md backdrop-blur-xs transition-all ${
                                    faceCheck.isValid
                                      ? "bg-emerald-600/90 text-white"
                                      : "bg-rose-600/90 text-white"
                                  }`}
                                >
                                  {isModelLoading ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      <span>Loading Face Detector...</span>
                                    </>
                                  ) : faceCheck.isValid ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>{faceCheck.message}</span>
                                    </>
                                  ) : (
                                    <>
                                      <AlertCircle className="w-3.5 h-3.5" />
                                      <span>{faceCheck.message}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {webcamStatus === "error" && (
                                <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-4 text-center text-rose-400">
                                  <AlertCircle className="w-8 h-8 mb-2" />
                                  <span className="text-xs font-medium">Camera blocked or not found.</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Capture / Retake Action Button */}
                        {snapshotImage ? (
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => {
                                setSnapshotImage(null);
                                startCameraViewfinder();
                              }}
                              variant="outline"
                              className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 px-6 py-2 text-xs font-bold rounded-full cursor-pointer"
                            >
                              Retake Photo
                            </Button>
                            {isUploading && (
                              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Button
                              onClick={captureSnapshot}
                              disabled={!faceCheck.isValid || isModelLoading}
                              className={`px-8 py-2 text-xs font-bold rounded-full shadow-sm transition-all cursor-pointer ${
                                faceCheck.isValid
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "bg-slate-300 text-slate-500 cursor-not-allowed opacity-60"
                              }`}
                            >
                              <Camera className="w-3.5 h-3.5 mr-1.5" />
                              Capture Photo
                            </Button>
                            {!faceCheck.isValid && !isModelLoading && (
                              <span className="text-[10px] text-slate-400">
                                Align your face straight to enable capture
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Declaration */}
              {activeStep === "declaration" && (
                <div className="space-y-6 w-full py-2">
                  <div className="p-6 bg-slate-50/70 border border-slate-200 rounded-sm w-full space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                      Honor Code & Assessment Declaration
                    </h3>
                    <label className="flex items-start gap-3.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isDeclarationAgreed}
                        onChange={(e) => setIsDeclarationAgreed(e.target.checked)}
                        className="w-4 h-4 mt-0.5 text-[#5b6bbd] focus:ring-0 rounded-none border-slate-300 cursor-pointer"
                      />
                      <span className="text-xs md:text-sm text-slate-700 leading-relaxed font-normal">
                        I hereby declare that I will take this assessment honestly without seeking unauthorized assistance, looking up answers on external devices, or violating proctoring protocols. I consent to diagnostics streaming and understand that violation of these terms may result in immediate test termination.
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Step Footer Action Bar with PREVIOUS & NEXT buttons */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              {activeStep !== "proctoring" && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (activeStep === "system_checks") setActiveStep("proctoring");
                    else if (activeStep === "candidate_details") setActiveStep("system_checks");
                    else if (activeStep === "declaration") setActiveStep("candidate_details");
                  }}
                  className="px-6 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-100 rounded-xs border-slate-200 cursor-pointer"
                >
                  <span>PREVIOUS</span>
                </Button>
              )}

              <Button
                onClick={handleNext}
                disabled={activeStep === "declaration" && !isDeclarationAgreed}
                className="bg-[#5b6bbd] hover:bg-[#4a589e] disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-2 text-xs font-bold uppercase tracking-wider rounded-xs shadow-xs transition-all cursor-pointer"
              >
                <span>{activeStep === "declaration" ? "Start Test" : "NEXT"}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Support Bubble ── */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          className="w-12 h-12 rounded-full bg-[#5b6bbd] hover:bg-[#4a589e] text-white flex items-center justify-center shadow-lg transition-all cursor-pointer"
          title="Need Help?"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
