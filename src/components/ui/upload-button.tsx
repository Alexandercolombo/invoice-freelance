"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UploadCloud, Loader2 } from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing";

interface UploadButtonProps {
  onUploadComplete: (url: string) => void;
  onUploadError: (error: Error) => void;
}

export function UploadButton({
  onUploadComplete,
  onUploadError,
}: UploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { startUpload } = useUploadThing("logoUploader", {
    onClientUploadComplete: (res) => {
      setIsUploading(false);
      if (res?.[0]?.url) {
        onUploadComplete(res[0].url);
      }
    },
    onUploadError: (error) => {
      setIsUploading(false);
      onUploadError(error);
    },
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    await startUpload([file]);
    // Reset the input
    event.target.value = "";
  };

  return (
    <div className="relative">
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        disabled={isUploading}
        aria-label="Upload file"
      />
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={isUploading}
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <UploadCloud className="mr-2 h-4 w-4" />
            Upload Logo
          </>
        )}
      </Button>
      <p className="mt-1 text-xs text-gray-500">
        Max file size: 4MB • PNG, JPG, WEBP
      </p>
    </div>
  );
} 