"use client";

import { useState } from "react";
import { useUploadThing } from "@/lib/uploadthing";
import { Button } from "./button";

interface UploadButtonProps {
  onUploadComplete?: (url: string) => void;
  onUploadError?: (error: Error) => void;
}

export function UploadButton({ onUploadComplete, onUploadError }: UploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { startUpload } = useUploadThing("logoUploader", {
    onClientUploadComplete: (res: { url: string }[]) => {
      setIsUploading(false);
      if (res?.[0]?.url && onUploadComplete) {
        onUploadComplete(res[0].url);
      }
    },
    onUploadError: (error: Error) => {
      setIsUploading(false);
      if (onUploadError) {
        onUploadError(error);
      }
      console.error("Upload error:", error);
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    await startUpload([file]);
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        disabled={isUploading}
        className="relative w-full h-12 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        onClick={() => document.getElementById("logo-upload")?.click()}
      >
        {isUploading ? (
          <>
            <span className="opacity-0">Upload Logo</span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-white" />
            </div>
          </>
        ) : (
          "Upload Logo"
        )}
      </Button>
      <input
        id="logo-upload"
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
      <div className="text-xs text-gray-500">Max file size: 4MB • PNG, JPG, WEBP</div>
    </div>
  );
} 