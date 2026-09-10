import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  sessionId,
  onProceedToTest,
}: CandidateOnboardingModalProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const proctorMode = test?.proctoringMode || "NONE";
  const isProctoringActive = proctorMode !== "NONE";

  // Detect proctoring requirements from test
  const isWebcamRequired =
    isWebcamMonitored ??
    !!(
      test?.requireWebcam ||
      proctorMode === "HIGH" ||
      proctorMode === "MEDIUM"
    );

  const isMicRequired = !!test?.requireMicrophone || proctorMode === "HIGH";
  const isScreenRequired = !!test?.requireScreenShare || proctorMode === "HIGH";

  const steps = useMemo(() => {
    const list: { id: OnboardingStep; label: string }[] = [];
    if (isProctoringActive) {
      list.push({ id: "proctoring", label: "Proctoring Instructions" });
    }
    list.push({ id: "system_checks", label: "System Checks" });
    if (isWebcamRequired) {
      list.push({ id: "candidate_details", label: "Candidate Details" });
    }
    list.push({ id: "declaration", label: "Declaration" });
    return list;
  }, [isProctoringActive, isWebcamRequired]);

  const [activeStep, setActiveStep] = useState<OnboardingStep>(() =>
    isProctoringActive ? "proctoring" : "system_checks"
  );
  const [maxReachedIndex, setMaxReachedIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<OnboardingStep>>(new Set());
  const [isDeclarationAgreed, setIsDeclarationAgreed] = useState(false);

  // Candidate Details Form State
  const [candidateName, setCandidateName] = useState(user?.name || "");
  const [candidateEmail, setCandidateEmail] = useState(user?.email || "");

  // Model & Real-time AI Face Detection State
  const [blazeModel, setBlazeModel] = useState<blazeface.BlazeFaceModel | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [faceCheck, setFaceCheck] = useState<{
    isValid: boolean;
    status: "no_face" | "multiple_faces" | "face_turned" | "too_far" | "dark" | "low_confidence" | "ready";
    message: string;
  }>({
    isValid: false,
    status: "no_face",
    message: "Position face inside oval",
  });

  // Snapshot Capture & S3 Direct Upload State
  const [snapshotImage, setSnapshotImage] = useState<string | null>(null);
  const [isPhotoVerified, setIsPhotoVerified] = useState(false);
  const [isVerifyingCapture, setIsVerifyingCapture] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  // System Check Statuses
  const [webcamStatus, setWebcamStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [micStatus, setMicStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [micLevel, setMicLevel] = useState(0);
  const [screenStatus, setScreenStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  // Media Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionLoopRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (steps.length > 0 && !steps.some((s) => s.id === activeStep)) {
      setActiveStep(steps[0].id);
    }
  }, [steps, activeStep]);

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
    (prediction: blazeface.NormalizedFace, sourceEl: HTMLVideoElement | HTMLCanvasElement) => {
      const rawProb = prediction.probability;
      const prob =
        typeof rawProb === "number"
          ? rawProb
          : Array.isArray(rawProb)
          ? rawProb[0]
          : 1.0;

      // 1. High Confidence check (≥ 0.85 for clean un-obscured face recognition)
      if (prob < 0.85) {
        return { isValid: false, status: "low_confidence" as const, message: "Position face inside oval" };
      }

      // 2. Main facial landmarks must be clearly detected (eyes, nose, mouth)
      const landmarks = prediction.landmarks as Array<[number, number]>;
      if (!landmarks || landmarks.length < 4) {
        return { isValid: false, status: "no_face" as const, message: "Position face inside oval" };
      }

      const rightEye = landmarks[0];
      const leftEye = landmarks[1];
      const nose = landmarks[2];
      const mouth = landmarks[3];

      // 3. Eye distance / Proximity Check
      const eyeDist = Math.hypot(leftEye[0] - rightEye[0], leftEye[1] - rightEye[1]);
      if (eyeDist < 25) {
        return { isValid: false, status: "too_far" as const, message: "Move closer to the camera" };
      }

      // 4. Bounding Box & Face Size Check
      const topLeft = prediction.topLeft as [number, number];
      const bottomRight = prediction.bottomRight as [number, number];
      const boxWidth = Math.abs(bottomRight[0] - topLeft[0]);
      const boxHeight = Math.abs(bottomRight[1] - topLeft[1]);

      if (boxWidth < 70 || boxHeight < 70) {
        return { isValid: false, status: "too_far" as const, message: "Position face inside oval" };
      }

      // Aspect ratio of normal frontal face bounding box
      const boxRatio = boxWidth / (boxHeight || 1);
      if (boxRatio < 0.50 || boxRatio > 1.45) {
        return { isValid: false, status: "face_turned" as const, message: "Position face inside oval" };
      }

      // 5. Face Centering / Look-Straight Corridor Check
      const eyeMidX = (rightEye[0] + leftEye[0]) / 2;
      const noseOffset = Math.abs(nose[0] - eyeMidX);
      const mouthOffset = Math.abs(mouth[0] - eyeMidX);

      if (noseOffset > eyeDist * 0.35 || mouthOffset > eyeDist * 0.45) {
        return { isValid: false, status: "face_turned" as const, message: "Position face inside oval" };
      }

      // 6. Vertical Symmetry Proportions (Detect chin/forehead occlusion)
      const eyeMidY = (rightEye[1] + leftEye[1]) / 2;
      const eyeToNoseY = nose[1] - eyeMidY;
      const noseToMouthY = mouth[1] - nose[1];

      if (eyeToNoseY < eyeDist * 0.12 || noseToMouthY < eyeDist * 0.12) {
        return { isValid: false, status: "face_turned" as const, message: "Position face inside oval" };
      }

      // 7. Hand / Large Object Occlusion Check (Carefully tuned so beards, glasses, and mustaches pass naturally)
      try {
        const sampleCanvas = document.createElement("canvas");
        const sW = 160;
        const sH = 120;
        sampleCanvas.width = sW;
        sampleCanvas.height = sH;
        const sCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
        if (sCtx) {
          sCtx.drawImage(sourceEl, 0, 0, sW, sH);
          const imgData = sCtx.getImageData(0, 0, sW, sH);
          const data = imgData.data;

          const srcW = (sourceEl as HTMLVideoElement).videoWidth || (sourceEl as HTMLCanvasElement).width || 640;
          const srcH = (sourceEl as HTMLVideoElement).videoHeight || (sourceEl as HTMLCanvasElement).height || 480;
          const scaleX = sW / (srcW || 1);
          const scaleY = sH / (srcH || 1);

          const fTop = Math.max(1, Math.floor(topLeft[1] * scaleY));
          const fBottom = Math.min(sH - 2, Math.floor(bottomRight[1] * scaleY));
          const fLeft = Math.max(1, Math.floor(topLeft[0] * scaleX));
          const fRight = Math.min(sW - 2, Math.floor(bottomRight[0] * scaleX));

          const fWidth = fRight - fLeft;
          const fHeight = fBottom - fTop;

          if (fWidth > 15 && fHeight > 15) {
            // Mid-Face & Mouth Corridor (from nose level to upper lip)
            const midTop = Math.floor(fTop + fHeight * 0.40);
            const midBottom = Math.floor(fTop + fHeight * 0.85);
            const midLeft = Math.floor(fLeft + fWidth * 0.15);
            const midRight = Math.floor(fRight - fWidth * 0.15);

            let strongEdgeCount = 0;
            let midTotalPixels = 0;
            let totalLuminance = 0;

            for (let y = midTop; y <= midBottom; y++) {
              for (let x = midLeft; x <= midRight; x++) {
                const idx = (y * sW + x) * 4;
                midTotalPixels++;
                const lum = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
                totalLuminance += lum;

                // 3x3 Sobel Gradient magnitude (large fingers and hand overlays create strong sharp edges > 130)
                const getLum = (px: number, py: number) => {
                  const pIdx = (py * sW + px) * 4;
                  return data[pIdx] * 0.299 + data[pIdx + 1] * 0.587 + data[pIdx + 2] * 0.114;
                };

                const gx =
                  -1 * getLum(x - 1, y - 1) + 1 * getLum(x + 1, y - 1) +
                  -2 * getLum(x - 1, y)     + 2 * getLum(x + 1, y) +
                  -1 * getLum(x - 1, y + 1) + 1 * getLum(x + 1, y + 1);

                const gy =
                  -1 * getLum(x - 1, y - 1) - 2 * getLum(x, y - 1) - 1 * getLum(x + 1, y - 1) +
                   1 * getLum(x - 1, y + 1) + 2 * getLum(x, y + 1) + 1 * getLum(x + 1, y + 1);

                const mag = Math.hypot(gx, gy);
                if (mag > 130) {
                  strongEdgeCount++;
                }
              }
            }

            const strongEdgeDensity = midTotalPixels > 0 ? strongEdgeCount / midTotalPixels : 0;
            const avgMidLum = midTotalPixels > 0 ? totalLuminance / midTotalPixels : 0;

            // Calibrated threshold to allow natural facial hair/glasses while flagging dense blockages
            if (strongEdgeDensity > 0.50) {
              return {
                isValid: false,
                status: "no_face" as const,
                message: "Position face inside oval",
              };
            }

            // Extreme darkness / blockage check
            if (avgMidLum < 10) {
              return {
                isValid: false,
                status: "dark" as const,
                message: "Position face inside oval",
              };
            }
          }
        }
      } catch {
        // Fallback gracefully
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
                message: "Position face inside oval",
              });
            } else if (predictions.length > 1) {
              setFaceCheck({
                isValid: false,
                status: "multiple_faces",
                message: "Multiple people detected",
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

  // Submit Photo with 2-Step Verification & S3 Storage Processing
  const submitPhoto = async () => {
    if (!videoRef.current || isVerifyingCapture) return;
    try {
      setIsVerifyingCapture(true);
      setCaptureError(null);

      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsVerifyingCapture(false);
        setCaptureError("Face not detected. Please position your face clearly and submit again.");
        return;
      }

      // 1. Draw raw camera frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // 2. Step 2 Verification: Run AI model strictly on the captured canvas frame
      console.log("🔍 [Identity Verification] Running Step 2 frozen-frame face detection verification...");
      if (blazeModel) {
        const predictions = await blazeModel.estimateFaces(canvas, false);

        if (!predictions || predictions.length === 0) {
          console.warn("❌ [Identity Verification] Step 2 Failed: No face detected in captured frame.");
          setIsVerifyingCapture(false);
          setCaptureError("Face not detected or not visible. Please position your face inside the oval and submit again.");
          toast({
            title: "Verification Failed",
            description: "Face not detected. Please position your face inside the oval and submit again.",
            variant: "destructive",
          });
          return;
        }

        if (predictions.length > 1) {
          console.warn(`❌ [Identity Verification] Step 2 Failed: Multiple faces (${predictions.length}) detected.`);
          setIsVerifyingCapture(false);
          setCaptureError("Multiple faces detected. Please ensure you are alone in the frame and submit again.");
          toast({
            title: "Verification Failed",
            description: "Multiple people detected. Please re-take your photo alone.",
            variant: "destructive",
          });
          return;
        }

        // Evaluate captured face geometry strictly on the captured canvas frame
        const verifiedEval = evaluateFaceGeometry(predictions[0], canvas);
        if (!verifiedEval.isValid) {
          console.warn("❌ [Identity Verification] Step 2 Failed: Face geometry/alignment check failed:", verifiedEval);
          setIsVerifyingCapture(false);
          setCaptureError("Face not clearly visible. Please position your face inside the oval and submit again.");
          toast({
            title: "Verification Failed",
            description: "Face not clearly visible. Please align your face inside the oval and submit again.",
            variant: "destructive",
          });
          return;
        }

        console.log("✅ [Identity Verification] Step 2 Passed: Single centered face confirmed with high confidence.", predictions[0]);
      }

      // 3. Convert verified canvas frame to Blob for S3 upload
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9)
      );

      if (!blob) {
        console.warn("❌ [Identity Verification] Failed to encode canvas to JPEG blob.");
        setIsVerifyingCapture(false);
        setCaptureError("Face not detected. Please position your face clearly and submit again.");
        return;
      }

      // 4. Resolve or initialize Test Session if not yet available, and upload to S3 Storage
      let activeSessionId = sessionId;
      if (!activeSessionId && invitationId) {
        try {
          console.log(`🚀 [S3 Storage] Resolving active test session for invitation: ${invitationId}...`);
          const session = await testService.startTestSession(invitationId, "0.0.0.0");
          if (session && session.id) {
            activeSessionId = session.id;
          }
        } catch (sessErr) {
          console.warn("⚠️ [S3 Storage] Could not initialize test session for pre-upload:", sessErr);
        }
      }

      if (activeSessionId) {
        setIsUploading(true);
        try {
          const capturedAt = Date.now();
          console.log(`🚀 [S3 Storage] Requesting presigned URL for CANDIDATE_PHOTO on session: ${activeSessionId}...`);
          const { storagePath } = await proctoringService.presignEvidence(
            activeSessionId,
            "CANDIDATE_PHOTO"
          );
          console.log(`📂 [S3 Storage] Target S3 Storage Key:\n${storagePath}`);

          console.log(`📤 [S3 Storage] Uploading ${blob.size} bytes JPEG via backend proxy...`);
          await proctoringService.proxyUpload(activeSessionId, storagePath, blob);
          console.log(`✅ [S3 Storage] Proxy upload succeeded! Image stored at: ${storagePath}`);

          console.log(`📝 [S3 Storage] Confirming candidate photo evidence in database...`);
          await proctoringService.confirmEvidence(
            activeSessionId,
            storagePath,
            "CANDIDATE_PHOTO",
            capturedAt,
            blob.size
          );
          console.log(`✅ [S3 Storage] Candidate reference photo confirmed in database.`);
        } catch (err) {
          console.warn("⚠️ [S3 Storage] Photo upload warning:", err);
        } finally {
          setIsUploading(false);
        }
      }


      // 5. Verification & S3 pipeline completed successfully!
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setSnapshotImage(dataUrl);
      setIsPhotoVerified(true);
      setCaptureError(null);
      setIsVerifyingCapture(false);

      // Stop live camera hardware
      stopAllMedia();

      toast({
        title: "Photo Verified & Submitted",
        description: "Candidate identity photo verified and uploaded successfully.",
      });
    } catch (e) {
      console.error("Snapshot verification & submission error:", e);
      setIsVerifyingCapture(false);
      setCaptureError("Face not detected or not visible. Please position your face inside the oval and submit again.");
      toast({
        title: "Verification Error",
        description: "Face not detected. Please position your face inside the oval and submit again.",
        variant: "destructive",
      });
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

  const handleTestScreen = async () => {
    setScreenStatus("testing");
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setScreenStatus("success");
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setScreenStatus("error");
    }
  };

  const [isLaunching, setIsLaunching] = useState(false);

  const currentIndex = steps.findIndex((s) => s.id === activeStep);
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === steps.length - 1;

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setActiveStep(steps[currentIndex - 1].id);
    }
  };

  const handleNext = async () => {
    setCompletedSteps((prev) => new Set(prev).add(activeStep));
    if (!isLastStep && currentIndex >= 0) {
      const nextIdx = currentIndex + 1;
      setMaxReachedIndex((prev) => Math.max(prev, nextIdx));
      setActiveStep(steps[nextIdx].id);
    } else {
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

        // 4. Navigate to core assessment interface
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
          {isProctoringActive ? (
            <div className="bg-[#4353a4] text-white text-[10px] md:text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
              <span>PROCTOR MODE</span>
            </div>
          ) : (
            <div className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] md:text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
              <span>STANDARD ASSESSMENT</span>
            </div>
          )}

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
              {steps.map((step, index) => {
                const isActive = activeStep === step.id;
                const isCompleted = completedSteps.has(step.id);
                // Can jump to any step that has been reached or already completed
                const isNavigable = index <= maxReachedIndex || isCompleted;

                return (
                  <button
                    key={step.id}
                    onClick={() => {
                      if (isNavigable) {
                        setActiveStep(step.id);
                      }
                    }}
                    disabled={!isNavigable}
                    className={`w-full text-left px-5 py-3.5 text-xs md:text-sm font-semibold transition-all flex items-center justify-between ${
                      isActive
                        ? "bg-[#5b6bbd] text-white shadow-xs font-bold cursor-default"
                        : isNavigable
                        ? "text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                        : "text-slate-300 bg-slate-50/50 cursor-not-allowed"
                    }`}
                  >
                    <span>{step.label}</span>
                    {isCompleted && !isActive && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    )}
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

                  {/* 2-Column Content: Rules on Left, Guidelines on Right (Vertically Centered) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
                    {/* Left Points */}
                    <div className="lg:col-span-6 space-y-4 my-auto">
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
                    <div className="lg:col-span-6 flex flex-col items-center justify-center">
                      <div className="w-full bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-center overflow-hidden shadow-2xs">
                        <img
                          src="/proctoringGuide.png"
                          alt="Proctoring Guide"
                          className="w-full h-auto max-h-[300px] object-contain rounded-md"
                        />
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

                    {/* 5. Webcam Card (Only if required) */}
                    {isWebcamRequired && (
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
                    )}

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

                    {/* 7. Screen Share Card (If required) */}
                    {isScreenRequired && (
                      <div className="bg-white border border-slate-200/90 rounded-sm p-4 flex flex-col justify-between shadow-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-dashed border-slate-200">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 shrink-0">
                              <Monitor className="w-5 h-5 stroke-[1.5]" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-800">Screen Share</span>
                                {screenStatus === "success" ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 fill-emerald-50" />
                                ) : (
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 fill-rose-50" />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                {screenStatus === "success"
                                  ? "Verified"
                                  : screenStatus === "error"
                                  ? "Permission Denied"
                                  : screenStatus === "testing"
                                  ? "Testing..."
                                  : "Permission Required"}
                              </p>
                            </div>
                          </div>

                          {screenStatus === "success" ? (
                            <span className="px-3.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold tracking-wider rounded-xs select-none">
                              Enabled
                            </span>
                          ) : (
                            <button
                              onClick={handleTestScreen}
                              disabled={screenStatus === "testing"}
                              className="px-4 py-1.5 bg-[#4353a4] hover:bg-[#324080] text-white text-[11px] font-bold tracking-wider uppercase rounded-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                            >
                              {screenStatus === "testing" ? "..." : "TEST"}
                            </button>
                          )}
                        </div>
                        <div className="pt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
                          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Verifies desktop screen sharing.</span>
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

                      {/* Candidate Verified Details (Read-Only) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-200 rounded-sm">
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Candidate Name
                          </span>
                          <div className="text-sm font-semibold text-slate-800 bg-white border border-slate-200/80 px-3 py-2 rounded-xs flex items-center justify-between">
                            <span className="truncate">{candidateName || "—"}</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-1.5" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Candidate Email
                          </span>
                            <div className="text-sm font-semibold text-slate-800 bg-white border border-slate-200/80 px-3 py-2 rounded-xs flex items-center justify-between">
                            <span className="truncate">{candidateEmail || "—"}</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-1.5" />
                          </div>
                        </div>
                      </div>

                      {/* Visual Reference Guide */}
                      <div className="bg-white border border-slate-200 rounded-sm p-3 shadow-xs">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                            Photo Framing & Behavior Reference
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            Follow proctoring standards
                          </span>
                        </div>
                        <div className="w-full flex items-center justify-center bg-slate-50/50 rounded-xs p-1">
                          <img
                            src="/proctoringGuide.png"
                            alt="Proctoring Framing Guide"
                            className="w-full h-auto max-h-[170px] object-contain"
                          />
                        </div>
                      </div>

                      {/* Guidelines: 1 Green & 1 Red Rule with Good Lighting & Positioning */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        {/* Do This */}
                        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xs p-3.5 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Do This</span>
                          </div>
                          <ul className="text-[11px] text-slate-600 space-y-1.5 pl-4 leading-relaxed list-disc">
                            <li>
                              <strong className="text-slate-700">Capture Positioning:</strong> Center your full face straight inside the oval guide at arm's length with eyes level to the camera.
                            </li>
                            <li>
                              <strong className="text-slate-700">Lighting Conditions:</strong> Ensure bright, even front lighting on your face (avoid dark shadows or strong backlight).
                            </li>
                          </ul>
                        </div>

                        {/* Avoid This */}
                        <div className="bg-rose-50/70 border border-rose-200/80 rounded-xs p-3.5 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>Avoid This</span>
                          </div>
                          <ul className="text-[11px] text-slate-600 space-y-1.5 pl-4 leading-relaxed list-disc">
                            <li>
                              Do not cover your face, nose, or mouth with hands or objects.
                            </li>
                            <li>
                              Do not tilt your head away or have other individuals present in the frame.
                            </li>
                          </ul>
                        </div>
                      </div>

                      {/* Recapture Warning Banner if Verification Failed */}
                      {captureError && (
                        <div className="bg-rose-50 border border-rose-300 rounded-xs p-3.5 flex items-start gap-3 text-xs text-rose-800 animate-in fade-in">
                          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="font-bold text-rose-900">Photo Verification Failed</span>
                            <p className="text-rose-700">{captureError}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Live Viewfinder + BlazeFace Dotted Guide */}
                    <div className="lg:col-span-5 flex flex-col items-center">
                      <div
                        className={`w-full max-w-sm bg-white rounded-sm p-4 flex flex-col items-center gap-4 shadow-sm transition-all border-2 ${
                          snapshotImage && isPhotoVerified
                            ? "border-emerald-500 shadow-emerald-50"
                            : snapshotImage
                            ? "border-indigo-200"
                            : faceCheck.isValid
                            ? "border-emerald-500 shadow-emerald-50"
                            : "border-rose-400 shadow-rose-50"
                        }`}
                      >
                        {/* Video Feed / Snapshot Preview Box with Dotted Oval Overlay */}
                        <div className="w-full aspect-[4/3] bg-slate-900 rounded-xs overflow-hidden relative flex items-center justify-center border border-slate-800 shadow-inner">
                          {snapshotImage ? (
                            <div className="w-full h-full relative">
                              <img
                                src={snapshotImage}
                                alt="Candidate Verified Photo"
                                className="w-full h-full object-cover"
                              />
                              {isPhotoVerified && (
                                <div className="absolute top-2.5 right-2.5 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>VERIFIED</span>
                                </div>
                              )}
                            </div>
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
                                    isVerifyingCapture
                                      ? "bg-indigo-600/90 text-white"
                                      : faceCheck.isValid
                                      ? "bg-emerald-600/90 text-white"
                                      : "bg-rose-600/90 text-white"
                                  }`}
                                >
                                  {isVerifyingCapture ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      <span>Verifying captured face...</span>
                                    </>
                                  ) : isModelLoading ? (
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
                                setIsPhotoVerified(false);
                                setCaptureError(null);
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
                              onClick={submitPhoto}
                              disabled={!faceCheck.isValid || isModelLoading || isVerifyingCapture}
                              className={`px-8 py-2 text-xs font-bold rounded-full shadow-sm transition-all cursor-pointer ${
                                isVerifyingCapture
                                  ? "bg-indigo-600 text-white cursor-wait"
                                  : faceCheck.isValid
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "bg-slate-300 text-slate-500 cursor-not-allowed opacity-60"
                              }`}
                            >
                              {isVerifyingCapture ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                  Verifying & Submitting...
                                </>
                              ) : (
                                <>
                                  <Camera className="w-3.5 h-3.5 mr-1.5" />
                                  Submit Photo
                                </>
                              )}
                            </Button>
                            {!faceCheck.isValid && !isModelLoading && !isVerifyingCapture && (
                              <span className="text-[10px] text-slate-400">
                                Position face inside oval to submit photo
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
                  <div className="space-y-1">
                    <h3 className="text-xl md:text-2xl font-extrabold text-[#5b6bbd] tracking-tight">
                      Declaration & Code of Conduct
                    </h3>
                    <p className="text-xs text-slate-400 italic">
                      Please read and acknowledge the assessment terms and conditions before proceeding.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-6 border border-slate-200 rounded-sm space-y-4 text-xs text-slate-700 leading-relaxed max-h-72 overflow-y-auto">
                    <p className="font-semibold text-slate-900">
                      By taking this assessment, you agree to comply with all proctoring protocols:
                    </p>
                    <ul className="space-y-2 list-disc pl-5">
                      <li>I will not attempt to leave fullscreen mode or switch browser tabs during the test.</li>
                      <li>I will remain in full view of the webcam and will not use earphones, secondary devices, or external aids.</li>
                      <li>I understand that automated violation detection logs navigation, audio anomalies, and webcam frame evidence.</li>
                      <li>Any critical violations may result in immediate test termination and notification to administrators.</li>
                    </ul>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xs">
                    <Checkbox
                      id="declaration"
                      checked={isDeclarationAgreed}
                      onCheckedChange={(checked) => setIsDeclarationAgreed(Boolean(checked))}
                      className="mt-0.5"
                    />
                    <label
                      htmlFor="declaration"
                      className="text-xs text-slate-700 font-medium cursor-pointer select-none leading-relaxed"
                    >
                      I confirm that I am the registered candidate, have reviewed the rules, and agree to abide by the assessment integrity guidelines.
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Step Footer Action Bar with PREVIOUS & NEXT buttons */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              {currentIndex > 0 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  className="px-6 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-100 rounded-xs border-slate-200 cursor-pointer"
                >
                  <span>PREVIOUS</span>
                </Button>
              )}

              {(() => {
                let isStepValid = true;
                if (activeStep === "system_checks") {
                  if (isWebcamRequired && webcamStatus !== "success") isStepValid = false;
                  if (isMicRequired && micStatus !== "success") isStepValid = false;
                  if (isScreenRequired && screenStatus !== "success") isStepValid = false;
                } else if (activeStep === "candidate_details") {
                  if (!candidateName.trim() || !candidateEmail.trim()) isStepValid = false;
                  if (isWebcamRequired && (!snapshotImage || !isPhotoVerified)) isStepValid = false;
                } else if (activeStep === "declaration") {
                  if (!isDeclarationAgreed) isStepValid = false;
                }

                return (
                  <Button
                    onClick={handleNext}
                    disabled={!isStepValid || isLaunching}
                    className="bg-[#5b6bbd] hover:bg-[#4a589e] disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-2 text-xs font-bold uppercase tracking-wider rounded-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {isLaunching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isLastStep ? "Start Test" : "NEXT"}</span>
                  </Button>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
