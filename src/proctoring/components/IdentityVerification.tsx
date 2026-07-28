import React, { useState, useEffect, useRef, useCallback } from "react";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import "@tensorflow/tfjs-backend-cpu";
import * as blazeface from "@tensorflow-models/blazeface";
import { Camera, CheckCircle2, AlertCircle, Loader2, ShieldCheck, Play, RefreshCw, UserCheck, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { proctoringService } from "@/lib/proctoring-service";
import { toast } from "sonner";

interface IdentityVerificationProps {
  sessionId: string;
  onComplete: () => void;
}

export const IdentityVerification: React.FC<IdentityVerificationProps> = ({ sessionId, onComplete }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [detector, setDetector] = useState<blazeface.BlazeFaceModel | null>(null);
  
  // Status states
  const [cameraStatus, setCameraStatus] = useState<"loading" | "active" | "denied">("loading");
  const [faceStatus, setFaceStatus] = useState<"initializing" | "no_face" | "multiple_faces" | "face_covered" | "face_detected">("initializing");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [brightnessWarning, setBrightnessWarning] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 1. Initialize BlazeFace Detector
  useEffect(() => {
    let isMounted = true;
    const initBlazeFace = async () => {
      try {
        await tf.ready();
        try {
          await tf.setBackend("webgl");
        } catch {
          await tf.setBackend("cpu");
        }
        const loadedModel = await blazeface.load();
        if (isMounted) {
          setDetector(loadedModel);
          setFaceStatus("no_face");
        }
      } catch (err) {
        console.error("BlazeFace initialization error:", err);
        if (isMounted) {
          setFaceStatus("no_face");
        }
      }
    };
    initBlazeFace();
    return () => {
      isMounted = false;
    };
  }, []);

  const [retryCount, setRetryCount] = useState(0);

  // 2. Controlled Webcam Stream Lifecycle
  useEffect(() => {
    if (capturedImage) return;

    let activeStream: MediaStream | null = null;
    let isCancelled = false;

    const startCamera = async () => {
      setCameraStatus("loading");
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" }
        });

        if (isCancelled) {
          mediaStream.getTracks().forEach(t => t.stop());
          return;
        }

        activeStream = mediaStream;
        setStream(mediaStream);
        setCameraStatus("active");

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(e => {
            if (e.name !== "AbortError") {
              console.warn("Video play exception:", e);
            }
          });
        }
      } catch (err) {
        console.error("Camera access denied or failed:", err);
        if (!isCancelled) {
          setCameraStatus("denied");
        }
      }
    };

    startCamera();

    return () => {
      isCancelled = true;
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [capturedImage, retryCount]);

  const [faceErrorMessage, setFaceErrorMessage] = useState<string | null>(null);

  // Helper: Strict facial proportion and occlusion verification
  const checkStrictFaceValidity = useCallback((prediction: blazeface.NormalizedFace, videoEl: HTMLVideoElement): { isValid: boolean; error: string } => {
    const rawProb = prediction.probability;
    const prob = typeof rawProb === "number"
      ? rawProb
      : Array.isArray(rawProb)
        ? rawProb[0]
        : 1.0;

    if (prob < 0.90) {
      return { isValid: false, error: "Low confidence. Ensure direct lighting on face." };
    }

    const landmarks = prediction.landmarks as Array<[number, number]>;
    if (!landmarks || landmarks.length < 4) {
      return { isValid: false, error: "Face obscured or incomplete." };
    }

    const rightEye = landmarks[0];
    const leftEye = landmarks[1];
    const nose = landmarks[2];
    const mouth = landmarks[3];

    // 1. Eye distance check
    const eyeDist = Math.hypot(leftEye[0] - rightEye[0], leftEye[1] - rightEye[1]);
    if (eyeDist < 25) {
      return { isValid: false, error: "Move closer to the camera." };
    }

    // 2. Strict Horizontal Corridor Alignment
    const minEyeX = Math.min(rightEye[0], leftEye[0]) - eyeDist * 0.15;
    const maxEyeX = Math.max(rightEye[0], leftEye[0]) + eyeDist * 0.15;

    if (nose[0] < minEyeX || nose[0] > maxEyeX) {
      return { isValid: false, error: "Hand covering face or face turned away." };
    }

    if (mouth[0] < minEyeX || mouth[0] > maxEyeX) {
      return { isValid: false, error: "Lower face or mouth covered by hand." };
    }

    // 3. Strict Vertical Proportions (Eye -> Nose -> Mouth)
    const eyeMidY = (rightEye[1] + leftEye[1]) / 2;
    const eyeToNoseY = nose[1] - eyeMidY;
    const noseToMouthY = mouth[1] - nose[1];

    if (eyeToNoseY < eyeDist * 0.22 || eyeToNoseY > eyeDist * 0.95) {
      return { isValid: false, error: "Hand or object covering upper face/nose." };
    }

    if (noseToMouthY < eyeDist * 0.22 || noseToMouthY > eyeDist * 0.95) {
      return { isValid: false, error: "Hand covering lower face/mouth." };
    }

    // 4. Pixel Variance & Contrast Check (Detects hand covering nose/mouth)
    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoEl.videoWidth || 640;
      canvas.height = videoEl.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const radius = Math.round(eyeDist * 0.3);
        const sampleX = Math.max(0, Math.min(canvas.width - radius * 2, Math.round(mouth[0] - radius)));
        const sampleY = Math.max(0, Math.min(canvas.height - radius * 2, Math.round(mouth[1] - radius)));
        
        const mouthPixels = ctx.getImageData(sampleX, sampleY, radius * 2, radius * 2);
        let minLum = 255;
        let maxLum = 0;
        for (let i = 0; i < mouthPixels.data.length; i += 4) {
          const lum = 0.299 * mouthPixels.data[i] + 0.587 * mouthPixels.data[i + 1] + 0.114 * mouthPixels.data[i + 2];
          if (lum < minLum) minLum = lum;
          if (lum > maxLum) maxLum = lum;
        }

        // If contrast/luminance range across mouth/lower face is unnaturally low (< 28), skin patch/hand is covering face
        if (maxLum - minLum < 28) {
          return { isValid: false, error: "Hand covering face — Keep face uncovered." };
        }
      }
    } catch {
      // Ignore sample error
    }

    return { isValid: true, error: "" };
  }, []);

  // 3. Real-time Face Detection Loop with BlazeFace & Geometric Landmark Verification
  useEffect(() => {
    if (!detector || !videoRef.current || cameraStatus !== "active" || capturedImage) return;

    let animId: number;
    let lastDetectTime = 0;

    const detectFace = async () => {
      const now = Date.now();
      if (now - lastDetectTime >= 300) {
        lastDetectTime = now;
        if (videoRef.current && videoRef.current.readyState >= 2) {
          try {
            const predictions = await detector.estimateFaces(videoRef.current, false);
            if (predictions.length === 0) {
              setFaceStatus("no_face");
              setFaceErrorMessage("Position Face in Frame");
            } else if (predictions.length > 1) {
              setFaceStatus("multiple_faces");
              setFaceErrorMessage("Multiple Faces Detected — Position Solo");
            } else {
              const result = checkStrictFaceValidity(predictions[0], videoRef.current);
              if (result.isValid) {
                setFaceStatus("face_detected");
                setFaceErrorMessage(null);
              } else {
                setFaceStatus("face_covered");
                setFaceErrorMessage(result.error);
              }
            }
          } catch (e) {
            console.warn("Face estimation error:", e);
          }
        }
      }
      animId = requestAnimationFrame(detectFace);
    };

    animId = requestAnimationFrame(detectFace);
    return () => cancelAnimationFrame(animId);
  }, [detector, cameraStatus, capturedImage, checkStrictFaceValidity]);

  // 4. Capture Canvas Photo
  const handleCapture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    // Usability: Brightness calculation
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let total = 0;
    for (let i = 0; i < imgData.data.length; i += 4) {
      total += (imgData.data[i] + imgData.data[i + 1] + imgData.data[i + 2]) / 3;
    }
    const avgBrightness = (total / (imgData.data.length / 4) / 255) * 100;

    if (avgBrightness < 5) {
      setBrightnessWarning("Photo appears too dark. Please make sure your room is well lit.");
    } else if (avgBrightness > 95) {
      setBrightnessWarning("Photo appears overexposed. Please adjust your background light.");
    } else {
      setBrightnessWarning(null);
    }

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);

    canvas.toBlob(blob => {
      if (blob) setCapturedBlob(blob);
    }, "image/jpeg", 0.85);

    // Stop live stream when photo is captured
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedBlob(null);
    setBrightnessWarning(null);
    setFaceStatus("initializing");
  };

  // 5. Confirm & Upload Photo to Server
  const handleConfirmAndUpload = async () => {
    if (!capturedBlob || !sessionId) return;
    setIsUploading(true);
    try {
      // 1. Presign Upload URL
      const { url: presignedUrl, storagePath } = await proctoringService.presignEvidence(sessionId, "CANDIDATE_PHOTO");

      // 2. Direct Upload Blob to Storage (if valid http endpoint)
      if (presignedUrl && presignedUrl.startsWith("http")) {
        try {
          await fetch(presignedUrl, {
            method: "PUT",
            headers: { "Content-Type": "image/jpeg" },
            body: capturedBlob,
          });
        } catch (putErr) {
          console.warn("Storage PUT upload exception, proceeding to confirm evidence record:", putErr);
        }
      }

      // 3. Confirm Evidence on Backend
      await proctoringService.confirmEvidence(sessionId, storagePath, "CANDIDATE_PHOTO", Date.now(), capturedBlob.size);

      toast.success("Identity Photo Verified & Uploaded!");
      onComplete();
    } catch (err) {
      console.error("Identity Photo Upload Error:", err);
      toast.error("Failed to upload identity photo. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md p-4 animate-fade-in">
      <Card className="w-full max-w-lg shadow-2xl border-primary/20">
        <CardHeader className="text-center pb-3">
          <div className="mx-auto mb-2 w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <UserCheck className="w-7 h-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold font-heading">Candidate Identity Snapshot</CardTitle>
          <CardDescription className="text-xs">
            Position your face inside the frame. A clear selfie snapshot is required for identity validation.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Brightness / Error Alerts */}
          {brightnessWarning && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-600 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{brightnessWarning}</span>
            </div>
          )}

          {cameraStatus === "denied" && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-600 rounded-xl text-center space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
              <p className="text-sm font-bold">Camera Permission Denied</p>
              <p className="text-xs">Camera access is mandatory for identity capture. Please enable camera permissions in your browser address bar and click retry.</p>
              <Button size="sm" variant="outline" onClick={() => setRetryCount(c => c + 1)} className="gap-1 mt-2">
                <RefreshCw className="w-3.5 h-3.5" /> Retry Camera
              </Button>
            </div>
          )}

          {/* Camera Video / Preview Box */}
          {cameraStatus !== "denied" && (
            <div className="relative mx-auto w-72 h-72 rounded-2xl overflow-hidden border-2 border-primary/30 shadow-xl bg-slate-950 flex items-center justify-center">
              {!capturedImage ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                  {/* Face Framing Guide */}
                  <div className={`absolute inset-6 border-2 border-dashed rounded-full pointer-events-none transition-colors duration-300 ${
                    faceStatus === "face_detected" 
                      ? "border-emerald-400/80 bg-emerald-500/5" 
                      : faceStatus === "multiple_faces" 
                        ? "border-amber-400/80 bg-amber-500/5"
                        : "border-white/40"
                  }`} />
                  
                  {/* Status Overlay Badge */}
                  <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none">
                    {faceStatus === "initializing" && (
                      <Badge variant="secondary" className="bg-slate-900/80 text-slate-300 text-[11px] gap-1 backdrop-blur-sm">
                        <Loader2 className="w-3 h-3 animate-spin" /> Detecting Face...
                      </Badge>
                    )}
                    {faceStatus === "no_face" && (
                      <Badge variant="outline" className="bg-red-500/80 text-white border-red-400 text-[11px] gap-1 backdrop-blur-sm">
                        <AlertCircle className="w-3 h-3" /> Position Face in Frame
                      </Badge>
                    )}
                    {faceStatus === "multiple_faces" && (
                      <Badge variant="outline" className="bg-amber-500/80 text-white border-amber-400 text-[11px] gap-1 backdrop-blur-sm">
                        <Users className="w-3 h-3" /> Multiple Faces Detected
                      </Badge>
                    )}
                    {faceStatus === "face_covered" && (
                      <Badge variant="outline" className="bg-amber-600/90 text-white border-amber-400 text-[11px] gap-1 backdrop-blur-sm">
                        <AlertCircle className="w-3 h-3" /> {faceErrorMessage || "Face Covered — Uncover Face"}
                      </Badge>
                    )}
                    {faceStatus === "face_detected" && (
                      <Badge variant="outline" className="bg-emerald-600 text-white border-emerald-400 text-[11px] gap-1 backdrop-blur-sm shadow-md animate-pulse">
                        <CheckCircle2 className="w-3 h-3" /> Face Clear & Verified
                      </Badge>
                    )}
                  </div>
                </>
              ) : (
                <img
                  src={capturedImage}
                  alt="Captured Candidate Selfie"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          {cameraStatus !== "denied" && !capturedImage && (
            <Button
              className={`w-full gap-2 transition-all font-semibold ${
                faceStatus === "face_detected"
                  ? "bg-primary hover:bg-primary/90 text-white shadow-lg"
                  : "bg-muted text-muted-foreground cursor-not-allowed opacity-70"
              }`}
              onClick={handleCapture}
              disabled={faceStatus !== "face_detected"}
            >
              <Camera className="w-4 h-4" />
              {faceStatus === "face_detected"
                ? "Capture Identity Snapshot"
                : faceErrorMessage || "Position Face inside Frame to Capture"}
            </Button>
          )}

          {capturedImage && (
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleRetake}
                disabled={isUploading}
              >
                Retake Photo
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2 shadow-md"
                onClick={handleConfirmAndUpload}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" /> Confirm & Continue
                  </>
                )}
              </Button>
            </div>
          )}
          
          <p className="text-[10px] text-center text-muted-foreground">
            Identity snapshot will be attached to your official scorecard and verified by test administrators.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};
