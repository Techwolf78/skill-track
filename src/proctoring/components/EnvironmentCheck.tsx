import React, { useState, useEffect } from "react";
import { 
  Camera, 
  Mic, 
  Monitor, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  ShieldCheck,
  Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useProctoring } from "@/proctoring/ProctoringProvider";

interface CheckState {
  camera: "pending" | "success" | "error";
  mic: "pending" | "success" | "error";
  screen: "pending" | "success" | "error";
  browser: "pending" | "success" | "error";
  fullscreen: "pending" | "success" | "error";
}

export const EnvironmentCheck: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { startProctoring } = useProctoring();
  const [checks, setChecks] = useState<CheckState>({
    camera: "pending",
    mic: "pending",
    screen: "pending",
    browser: "pending",
    fullscreen: "pending"
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [screenErrorMsg, setScreenErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      setChecks(prev => ({ 
        ...prev, 
        fullscreen: active ? "success" : "pending" 
      }));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const verifyEnvironment = async () => {
    setIsVerifying(true);
    setScreenErrorMsg(null);
    
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

    // 4. Screen Sharing & Multiple Displays Check
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        
        const track = screenStream.getVideoTracks()[0];
        const settings = track ? track.getSettings() : {};
        const displaySurface = settings.displaySurface;
        const isEntireScreen = displaySurface !== 'window' && displaySurface !== 'browser';

        // Check for multiple monitors
        const isExtended = 'isExtended' in window.screen ? (window.screen as unknown as { isExtended?: boolean }).isExtended : false;
        
        // Stop screen tracks immediately
        screenStream.getTracks().forEach(t => t.stop());

        if (!isEntireScreen) {
          setChecks(prev => ({ ...prev, screen: "error" }));
          setScreenErrorMsg("Please share your ENTIRE screen (not a window or tab) and close all other apps (VS Code, Teams, Brave, etc.) to proceed.");
        } else if (isExtended) {
          setChecks(prev => ({ ...prev, screen: "error" }));
          setScreenErrorMsg("Multiple displays detected. Please disconnect extra monitors to proceed.");
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
      setScreenErrorMsg("Screen sharing permission is required. Please close other applications and try again.");
    }

    setIsVerifying(false);
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
    }
  };

  const allPassed = Object.values(checks).every(v => v === "success");

  const handleStart = () => {
    // Request fullscreen on start
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
          console.warn("Fullscreen request denied or failed:", err);
        });
      }
    } catch (err) {
      console.warn("Fullscreen API not available:", err);
    }
    
    startProctoring();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
      <Card className="w-full max-w-lg shadow-2xl border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Secure Environment Check</CardTitle>
          <CardDescription>
            We need to verify your environment before you can start the test.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CheckItem 
            icon={<Camera className="w-5 h-5" />} 
            label="Camera Access" 
            status={checks.camera} 
            description="Required for face monitoring"
          />
          <CheckItem 
            icon={<Mic className="w-5 h-5" />} 
            label="Microphone Access" 
            status={checks.mic} 
            description="Required for audio monitoring"
          />
          <CheckItem 
            icon={<Monitor className="w-5 h-5" />} 
            label="Screen Share & Display Check" 
            status={checks.screen} 
            description={screenErrorMsg || "Ensure only one monitor is connected"}
          />
          <CheckItem 
            icon={<ShieldCheck className="w-5 h-5" />} 
            label="Browser Compatibility" 
            status={checks.browser} 
            description="Checking for modern browser features"
          />
          {!isFullscreen && (
            <div className="pt-2">
              <Button 
                variant="default"
                className="w-full gap-2"
                onClick={toggleFullscreen}
              >
                <Monitor className="w-4 h-4" />
                Enable Fullscreen Mode
              </Button>
              <p className="text-[10px] text-center text-muted-foreground mt-2">
                Fullscreen is mandatory to prevent unauthorized tab switching.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          {!allPassed ? (
            <Button 
              className="w-full" 
              onClick={verifyEnvironment} 
              disabled={isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Run System Check"
              )}
            </Button>
          ) : (
            <Button 
              className="w-full bg-green-600 hover:bg-green-700 text-white" 
              onClick={handleStart}
            >
              <Play className="mr-2 h-4 w-4" />
              Start Test Now
            </Button>
          )}
          <p className="text-[10px] text-center text-muted-foreground">
            By starting the test, you agree to continuous monitoring of your camera, screen, and audio.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

const CheckItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  status: "pending" | "success" | "error";
  description: string;
}> = ({ icon, label, status, description }) => {
  const statusConfig = {
    pending: { color: "text-muted-foreground", icon: <div className="w-4 h-4 rounded-full border-2 border-muted" /> },
    success: { color: "text-green-500", icon: <CheckCircle2 className="w-5 h-5" /> },
    error: { color: "text-red-500", icon: <AlertCircle className="w-5 h-5" /> },
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-md bg-background border", statusConfig[status].color)}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium leading-none">{label}</p>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
      <div>
        {statusConfig[status].icon}
      </div>
    </div>
  );
};
