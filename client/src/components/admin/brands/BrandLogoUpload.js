"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import Image from "next/image";
import { FaCloudUploadAlt, FaTimes, FaImage, FaSyncAlt } from "react-icons/fa";

export default function BrandLogoUpload({
  currentLogoUrl,
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

  const displayLogo = localPreview || currentLogoUrl;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold tracking-wider text-gray-700 dark:text-gray-300 uppercase">
          Brand Logo
        </label>
        <span className="text-xs text-gray-400 dark:text-gray-500">JPG, PNG, or WebP up to 5MB</span>
      </div>

      {displayLogo ? (
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 flex items-center gap-4 group">
          {/* Logo Box (Square 72x72) */}
          <div className="relative h-18 w-18 shrink-0 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xs">
            <Image
              src={displayLogo}
              alt="Brand logo preview"
              fill
              className="object-cover"
              sizes="72px"
              unoptimized={Boolean(localPreview)}
            />
          </div>

          {/* Details & Actions */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 truncate">
              <FaImage className="text-gray-400 dark:text-gray-500 shrink-0 h-3.5 w-3.5" />
              <p className="truncate text-xs font-medium text-gray-700 dark:text-gray-200">
                {selectedFile
                  ? `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(0)} KB)`
                  : "Current brand logo"}
              </p>
            </div>
            {selectedFile && currentLogoUrl && (
              <span className="inline-block mt-1 font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded text-[11px]">
                Will replace current logo
              </span>
            )}
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <FaSyncAlt className="h-2.5 w-2.5" />
                Change Logo
              </button>
              {selectedFile && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="flex items-center gap-1 rounded-full border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3 py-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors cursor-pointer"
                >
                  <FaTimes className="h-2.5 w-2.5" />
                  Remove
                </button>
              )}
            </div>
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
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FBF0F0] dark:bg-pink-950/60 text-[#9B4F5E] dark:text-pink-300 mb-3 shadow-inner">
            <FaCloudUploadAlt className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Click to upload logo <span className="font-normal text-gray-500 dark:text-gray-400">or drag and drop</span>
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Square or high-resolution brand badge (5MB max)</p>
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

