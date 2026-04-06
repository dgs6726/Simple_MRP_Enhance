"use client";

import { useCallback, useState, useId } from "react";
import { Upload, AlertCircle } from "lucide-react";

interface UploadZoneProps {
  onFileAccepted: (text: string, fileName: string) => void;
  isProcessing: boolean;
  compact?: boolean;
  label?: string;
}

export function UploadZone({
  onFileAccepted,
  isProcessing,
  compact = false,
  label = "Drop your CSV file here",
}: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputId = useId();

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      if (!file.name.endsWith(".csv")) {
        setError("Please upload a CSV file.");
        return;
      }
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text || text.length < 10) {
          setError("File appears to be empty.");
          return;
        }
        onFileAccepted(text, file.name);
      };
      reader.onerror = () => setError("Failed to read file.");
      reader.readAsText(file);
    },
    [onFileAccepted]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg text-center cursor-pointer
          transition-all duration-200
          ${compact ? "px-6 py-5" : "p-12"}
          ${
            isDragOver
              ? "border-cm-red bg-cm-red/5"
              : "border-cm-gray-light/40 hover:border-cm-gray-light"
          }
          ${isProcessing ? "pointer-events-none opacity-60" : ""}
        `}
        onClick={() => document.getElementById(inputId)?.click()}
      >
        <input
          id={inputId}
          type="file"
          accept=".csv"
          onChange={handleInputChange}
          className="hidden"
        />

        <div className={`flex items-center gap-3 ${compact ? "" : "flex-col"}`}>
          {isProcessing ? (
            <>
              <div className="w-6 h-6 border-2 border-cm-red border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-cm-gray-med font-medium">
                Processing {fileName}...
              </p>
            </>
          ) : (
            <>
              <div
                className={`rounded-full bg-cm-gray-bg/60 flex items-center justify-center ${compact ? "w-8 h-8" : "w-14 h-14"}`}
              >
                <Upload
                  className={`text-cm-gray-light ${compact ? "w-4 h-4" : "w-6 h-6"}`}
                />
              </div>
              <div>
                <p
                  className={`font-semibold text-cm-charcoal ${compact ? "text-xs" : "text-sm"}`}
                >
                  {label}
                </p>
                <p
                  className={`text-cm-gray-light mt-0.5 ${compact ? "text-[10px]" : "text-xs"}`}
                >
                  or click to browse
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
