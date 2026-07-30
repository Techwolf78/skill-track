import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, CheckCircle2, AlertCircle, RefreshCw, Terminal, UploadCloud, ShieldCheck } from "lucide-react";
import { proctoringService } from "@/lib/proctoring-service";
import { toast } from "sonner";

interface TestPhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

interface LogEntry {
  id: string;
  time: string;
  type: "info" | "success" | "warning" | "error";
  text: string;
}

export function TestPhotoUploadModal({ isOpen, onClose, sessionId }: TestPhotoUploadModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (text: string, type: "info" | "success" | "warning" | "error" = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { id: Math.random().toString(), time, type, text }]);
    console.log(`[TestPhotoUpload ${type.toUpperCase()}] ${text}`);
  };

  const generateSamplePhoto = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw tech background with avatar silhouette
    const grad = ctx.createLinearGradient(0, 0, 640, 480);
    grad.addColorStop(0, "#1e1b4b");
    grad.addColorStop(1, "#312e81");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 480);

    ctx.fillStyle = "#818cf8";
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "center";
    ctx.fillText("TEST IDENTITY PHOTO CAPTURE", 320, 180);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "16px monospace";
    ctx.fillText(`Timestamp: ${new Date().toLocaleTimeString()}`, 320, 220);
    ctx.fillText("Status: VERIFIED FOR SUPABASE UPLOAD", 320, 250);

    // Draw avatar head/shoulders
    ctx.beginPath();
    ctx.arc(320, 330, 50, 0, Math.PI * 2);
    ctx.fillStyle = "#6366f1";
    ctx.fill();

    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        addLog(`Generated synthetic sample photo (${(blob.size / 1024).toFixed(1)} KB JPEG)`, "success");
      }
    }, "image/jpeg", 0.85);
  };

  // Start webcam
  useEffect(() => {
    if (!isOpen) return;

    addLog("Initializing camera feed for test capture...", "info");
    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 } })
      .then((mediaStream) => {
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        addLog("Webcam stream active. Ready for capture.", "success");
      })
      .catch((err) => {
        addLog(`Webcam error: ${err.message}. You can use 'Generate Sample Photo' below!`, "warning");
      });

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        addLog(`Photo captured (${(blob.size / 1024).toFixed(1)} KB JPEG)`, "success");
      }
    }, "image/jpeg", 0.85);
  };

  const handleRetake = () => {
    setCapturedBlob(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    addLog("Photo reset. Take another capture.", "warning");
  };

  const handleRunUploadPipeline = async () => {
    if (!capturedBlob) {
      toast.error("Please capture a photo first!");
      return;
    }

    setIsUploading(true);
    addLog("=== STARTING SUPABASE & BACKEND UPLOAD PIPELINE ===", "info");

    try {
      // 1. Presign Upload URL
      addLog(`Step 1: Requesting presigned URL for session: ${sessionId}...`, "info");
      const { url: presignedUrl, storagePath } = await proctoringService.presignEvidence(
        sessionId,
        "CANDIDATE_PHOTO"
      );
      addLog(`Presign Success! Target Storage Path: ${storagePath}`, "success");
      addLog(`Presigned URL Endpoint: ${presignedUrl}`, "info");

      // 2. Direct Upload Blob to Storage
      if (presignedUrl && presignedUrl.startsWith("http")) {
        addLog("Step 2: Uploading binary JPEG payload directly to Storage...", "info");
        
        // Test both PUT with x-upsert and POST
        try {
          const res = await fetch(presignedUrl, {
            method: "PUT",
            headers: {
              "Content-Type": "image/jpeg",
              "x-upsert": "true",
            },
            body: capturedBlob,
          });

          if (res.ok) {
            addLog(`Direct Storage Upload HTTP ${res.status} OK! Image stored at ${storagePath}`, "success");
          } else {
            const errBody = await res.text();
            addLog(`Direct Storage Upload status ${res.status}: ${errBody || res.statusText}`, "warning");
          }
        } catch (fetchErr: any) {
          addLog(`Storage Upload Exception: ${fetchErr.message}`, "warning");
        }
      } else {
        addLog(`Fallback Presign URL received: ${presignedUrl}`, "warning");
      }

      // 3. Confirm Evidence on Backend
      addLog("Step 3: Registering evidence record in PostgreSQL DB...", "info");
      await proctoringService.confirmEvidence(
        sessionId,
        storagePath,
        "CANDIDATE_PHOTO",
        Date.now(),
        capturedBlob.size
      );
      addLog("Evidence record confirmed! Candidate photo entry registered successfully.", "success");
      toast.success("Identity Photo Upload Pipeline Completed!");

    } catch (err: any) {
      addLog(`Upload Pipeline Failed: ${err.message}`, "error");
      toast.error("Upload Pipeline Error. Check log terminal below.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-3xl bg-slate-950 text-slate-100 border-slate-800 p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-indigo-400">
            <Camera className="h-5 w-5" /> Test Photo Upload & Supabase Diagnostics
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Test candidate identity photo capture, presigned URL generation, and direct Supabase storage writing with live diagnostic logs.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-2">
          {/* Camera / Preview View */}
          <div className="flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3">
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center border border-slate-800">
              {!previewUrl ? (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              ) : (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex flex-col gap-2 w-full">
              {!previewUrl ? (
                <div className="flex gap-2 w-full">
                  <Button onClick={handleCapture} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white">
                    <Camera className="h-4 w-4 mr-2" /> Capture Camera
                  </Button>
                  <Button onClick={generateSamplePhoto} variant="outline" className="flex-1 border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40">
                    <UploadCloud className="h-4 w-4 mr-2" /> Generate Test Photo
                  </Button>
                </div>
              ) : (
                <>
                  <Button onClick={handleRetake} variant="outline" className="flex-1 border-slate-700 text-slate-300">
                    <RefreshCw className="h-4 w-4 mr-1" /> Retake
                  </Button>
                  <Button
                    onClick={handleRunUploadPipeline}
                    disabled={isUploading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    {isUploading ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <UploadCloud className="h-4 w-4 mr-2" />
                    )}
                    Upload to Supabase
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Diagnostic Log Terminal */}
          <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono font-bold text-indigo-400 flex items-center gap-1.5">
                <Terminal className="h-4 w-4" /> Live Diagnostic Logs
              </span>
              <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
                {logs.length} events
              </Badge>
            </div>

            <div className="flex-1 h-64 overflow-y-auto font-mono text-[11px] space-y-1.5 pr-1">
              {logs.length === 0 ? (
                <span className="text-slate-600 italic">Ready. Click 'Capture Photo' to start pipeline...</span>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex gap-2 items-start leading-tight">
                    <span className="text-slate-500 shrink-0">[{log.time}]</span>
                    <span
                      className={
                        log.type === "success"
                          ? "text-emerald-400 font-semibold"
                          : log.type === "error"
                          ? "text-rose-400 font-bold"
                          : log.type === "warning"
                          ? "text-amber-400"
                          : "text-slate-300"
                      }
                    >
                      {log.text}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
