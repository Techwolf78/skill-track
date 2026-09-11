// src/components/ui/ImageUploadButton.tsx
// Reusable image upload input — user picks a local file, it's uploaded to S3 via
// POST /questions/assets/upload, and the returned public URL is passed to onUploaded.

import { useRef, useState, useEffect } from "react";
import { Upload, Loader2, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { testService } from "@/lib/test-service";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadButtonProps {
  /** Current image URL (controlled) */
  value?: string;
  /** Called with the new public URL after upload, or "" when cleared */
  onUploaded: (url: string) => void;
  /** Optional label shown on the button */
  label?: string;
  /** Optional CSS class for the container */
  className?: string;
}

export function ImageUploadButton({
  value,
  onUploaded,
  label = "Upload Image",
  className = "",
}: ImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localBlobUrl, setLocalBlobUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setImgError(false);
  }, [value, localBlobUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic type guard
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Image must be under 5 MB.", variant: "destructive" });
      return;
    }

    // Immediate local preview so the user sees their chosen image right away
    const blobUrl = URL.createObjectURL(file);
    setLocalBlobUrl(blobUrl);
    setUploading(true);
    setImgError(false);

    try {
      const url = await testService.uploadQuestionAsset(file);
      onUploaded(url);
    } catch (err) {
      console.error("Image upload failed:", err);
      toast({ title: "Upload failed", description: "Could not upload image. Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    if (localBlobUrl) {
      URL.revokeObjectURL(localBlobUrl);
      setLocalBlobUrl(null);
    }
    setImgError(false);
    onUploaded("");
  };

  const displaySrc = localBlobUrl || value;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="h-8 px-3 text-xs bg-white hover:bg-slate-50 border-slate-200"
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-primary" />
          ) : (
            <Upload className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
          )}
          {uploading ? "Uploading to Cloud..." : label}
        </Button>

        {displaySrc && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            onClick={handleRemove}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Remove
          </Button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {displaySrc && !imgError && (
        <div className="relative inline-block max-w-sm rounded-lg border border-slate-200 p-1 bg-slate-50/50 shadow-xs overflow-hidden group">
          <img
            src={displaySrc}
            alt="Asset Preview"
            onError={() => setImgError(true)}
            className="max-h-36 max-w-full rounded object-contain block"
          />
        </div>
      )}

      {displaySrc && imgError && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded max-w-sm">
          <ImageIcon className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Image preview unavailable from current network.</span>
        </div>
      )}
    </div>
  );
}
