"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import Image from "next/image";
import { FaCloudUploadAlt, FaTimes, FaImage, FaSyncAlt } from "react-icons/fa";

export default function CollectionImageUpload({
  currentImageUrl,
  selectedFile,
  onFileSelect,
  onFileRemove,
  error,
}) {
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState(null);
  const fileInputRef = useRef(null);

  // Compute local object URL synchronously via useMemo; clean up on unmount/change
  const localPreview = useMemo(() => {
    if (!selectedFile) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  const validateAndSetFile = (file) => {
    setFileError(null);

    if (!file) return;

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setFileError("Please upload a valid image file (JPEG, PNG, or WebP).");
      return;
    }

    // Validate size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setFileError(
        `Image is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Maximum allowed size is 5 MB.`
      );
      return;
    }

    onFileSelect(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onFileRemove();
  };

  const displayImage = localPreview || currentImageUrl;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold tracking-wider text-gray-700 dark:text-gray-300 uppercase">
          Collection Image
        </label>
        <span className="text-xs text-gray-400 dark:text-gray-500">JPG, PNG, or WebP up to 5MB</span>
      </div>

      {displayImage ? (
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shadow-inner group">
          <div className="relative aspect-video w-full overflow-hidden bg-black/5 dark:bg-black/40">
            <Image
              src={displayImage}
              alt="Collection preview"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 500px"
              unoptimized={Boolean(localPreview)}
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-full bg-white/90 dark:bg-gray-800/90 px-3.5 py-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200 shadow-md backdrop-blur-xs hover:bg-white dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <FaSyncAlt className="h-3 w-3" />
                Change Image
              </button>
              {selectedFile && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="flex items-center gap-1.5 rounded-full bg-red-600/90 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md backdrop-blur-xs hover:bg-red-600 transition-colors cursor-pointer"
                >
                  <FaTimes className="h-3 w-3" />
                  Remove
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between px-3.5 py-2.5 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 text-xs">
            <div className="flex items-center gap-2 truncate">
              <FaImage className="text-gray-400 dark:text-gray-500 shrink-0" />
              <span className="truncate text-gray-600 dark:text-gray-300 font-medium">
                {selectedFile
                  ? `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(0)} KB)`
                  : "Current Cloudinary image"}
              </span>
            </div>
            {selectedFile && currentImageUrl && (
              <span className="shrink-0 font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md text-[11px]">
                Will replace current
              </span>
            )}
          </div>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200 ${
            dragActive
              ? "border-[#9B4F5E] dark:border-pink-500 bg-[#FBF0F0]/50 dark:bg-pink-950/30"
              : "border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 hover:border-[#9B4F5E]/60 dark:hover:border-pink-500/60 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FBF0F0] dark:bg-pink-950/60 text-[#9B4F5E] dark:text-pink-300 mb-3">
            <FaCloudUploadAlt className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Click to upload <span className="font-normal text-gray-500 dark:text-gray-400">or drag and drop</span>
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">High-resolution banner or feature image (5MB max)</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        className="hidden"
      />

      {(fileError || error) && (
        <p className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5 mt-1">
          <span>•</span> {fileError || error}
        </p>
      )}
    </div>
  );
}
