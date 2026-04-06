"use client";

import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, AlertCircle, Check } from "lucide-react";

interface UploadZoneProps {
  onFileAccepted: (text: string, fileName: string) => void;
  isProcessing: boolean;
}

export function UploadZone({ onFileAccepted, isProcessing }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

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
          relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-all duration-200
          ${
            isDragOver
              ? "border-cm-red bg-cm-red/5"
              : "border-cm-gray-light/40 hover:border-cm-gray-light"
          }
          ${isProcessing ? "pointer-events-none opacity-60" : ""}
        `}
        onClick={() => document.getElementById("csv-input")?.click()}
      >
        <input
          id="csv-input"
          type="file"
          accept=".csv"
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-3">
          {isProcessing ? (
            <>
              <div className="w-10 h-10 border-3 border-cm-red border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-cm-gray-med font-medium">
                Processing {fileName}...
              </p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-cm-gray-bg/60 flex items-center justify-center">
                <Upload className="w-6 h-6 text-cm-gray-light" />
              </div>
              <div>
                <p className="text-sm font-semibold text-cm-charcoal">
                  Drop your MRP export CSV here
                </p>
                <p className="text-xs text-cm-gray-light mt-1">
                  or click to browse
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
