// src/components/ui/QuestionImage.tsx
// Safe, resilient image component for question diagrams and MCQ options with
// automatic error suppression, backend proxying, loading skeletons, and interactive zoom lightbox.

import { useState, useEffect } from "react";
import { resolveImageUrl } from "@/lib/image-utils";
import { apiClient } from "@/lib/api-client";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ZoomIn, ZoomOut, RotateCcw, X, ImageOff, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionImageProps {
  /** Raw image URL, storage path, or base64 string */
  src?: string | null;
  /** Alt text for accessibility */
  alt?: string;
  /** Additional CSS classes for the <img> element */
  className?: string;
  /** Additional CSS classes for the wrapper container */
  containerClassName?: string;
  /** Enables click-to-expand lightbox dialog (recommended for tree/network diagrams) */
  enableZoom?: boolean;
  /** Fallback mode when image fails to load: 'hidden' (default, completely clean) or 'badge' */
  fallback?: "hidden" | "badge";
  /** Optional custom click handler */
  onClick?: () => void;
}

export function QuestionImage({
  src,
  alt = "Question diagram",
  className = "",
  containerClassName = "",
  enableZoom = true,
  fallback = "hidden",
  onClick,
}: QuestionImageProps) {
  const resolvedSrc = resolveImageUrl(src);
  const [blobSrc, setBlobSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

  // Fetch via apiClient / blob if it's an API proxy URL to ensure auth headers are passed
  useEffect(() => {
    let isMounted = true;
    let createdBlobUrl: string | null = null;

    setHasError(false);
    setIsLoading(true);

    if (!resolvedSrc) {
      setIsLoading(false);
      return;
    }

    // Direct data URI or blob URL
    if (resolvedSrc.startsWith("data:") || resolvedSrc.startsWith("blob:")) {
      setBlobSrc(resolvedSrc);
      setIsLoading(false);
      return;
    }

    // Attempt authenticated blob fetch for proxy or backend routes
    const fetchBlob = async () => {
      try {
        const apiPath = resolvedSrc.startsWith("/api") ? resolvedSrc.replace(/^\/api/, "") : resolvedSrc;
        const response = await apiClient.get(apiPath, { responseType: "blob" });
        if (isMounted && response.data && response.data.size > 0) {
          createdBlobUrl = URL.createObjectURL(response.data);
          setBlobSrc(createdBlobUrl);
          setIsLoading(false);
          setHasError(false);
          return;
        }
      } catch {
        // If apiClient blob fetch fails, fallback to direct resolvedSrc
      }

      if (isMounted) {
        setBlobSrc(resolvedSrc);
      }
    };

    fetchBlob();

    return () => {
      isMounted = false;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [resolvedSrc]);

  // If no valid URL, handle fallback
  if (!resolvedSrc) {
    if (fallback === "badge" && src) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
          <ImageOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Image asset not found</span>
        </div>
      );
    }
    return null;
  }

  // If image failed to load
  if (hasError) {
    if (fallback === "badge") {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
          <ImageOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Image preview unavailable</span>
        </div>
      );
    }
    // Clean suppression: never render broken browser icon or alt text box
    return null;
  }

  const handleImageClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (enableZoom) {
      setZoomScale(1);
      setIsZoomOpen(true);
    }
  };

  const finalSrc = blobSrc || resolvedSrc;

  return (
    <>
      <div
        className={cn(
          "relative inline-block group max-w-full rounded-lg overflow-hidden border border-slate-200/80 bg-white transition-all",
          enableZoom && "cursor-zoom-in hover:border-[#4353a4]/50 hover:shadow-sm",
          containerClassName
        )}
        onClick={handleImageClick}
      >
        {/* Loading placeholder skeleton */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-100 animate-pulse flex items-center justify-center min-h-[100px] min-w-[160px]">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-[#4353a4] rounded-full animate-spin" />
          </div>
        )}

        <img
          src={finalSrc}
          alt={alt}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          className={cn(
            "block max-w-full object-contain transition-opacity duration-200",
            isLoading ? "opacity-0" : "opacity-100",
            className
          )}
        />

        {/* Hover zoom indicator for diagrams */}
        {enableZoom && !isLoading && !hasError && (
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/75 backdrop-blur-xs text-white text-[11px] font-medium px-2 py-1 rounded flex items-center gap-1 shadow-sm pointer-events-none">
            <Maximize2 className="w-3 h-3" />
            <span>Click to zoom</span>
          </div>
        )}
      </div>

      {/* Lightbox Dialog Modal */}
      {enableZoom && (
        <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden bg-slate-950 border-slate-800 text-slate-100 flex flex-col">
            <DialogTitle className="sr-only">Diagram Preview</DialogTitle>
            <DialogDescription className="sr-only">High resolution view of the question diagram</DialogDescription>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Diagram View
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {Math.round(zoomScale * 100)}%
                </span>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setZoomScale((s) => Math.min(s + 0.25, 3))}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale((s) => Math.max(s - 0.25, 0.5))}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(1)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-4 bg-slate-800 mx-1" />
                <button
                  type="button"
                  onClick={() => setIsZoomOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body / Image Stage */}
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-slate-950/50 min-h-[360px]">
              <img
                src={finalSrc}
                alt={alt}
                style={{
                  transform: `scale(${zoomScale})`,
                  transformOrigin: "center center",
                  transition: "transform 0.15s ease-out",
                }}
                className="max-w-full max-h-[70vh] object-contain rounded-md shadow-2xl select-none"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
