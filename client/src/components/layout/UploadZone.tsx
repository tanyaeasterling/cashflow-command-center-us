import { useCallback, useState } from "react";
import { Upload, X, CheckCircle, AlertCircle, Loader2, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useReportStore } from "@/store/useReportStore";
import { useUIStore } from "@/store/useUIStore";
import { toast } from "sonner";
import type { ReportType, UploadedFile } from "../../../../shared/types/reports";
import { nanoid } from "nanoid";

const ACCEPTED_TYPES = ".csv,.xlsx,.xls,.pdf,.docx";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

interface UploadState {
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  reportType?: ReportType;
  error?: string;
}

export function UploadZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const { setReport, duplicateBanner, clearDuplicateBanner } = useReportStore();
  const { setUploading } = useUIStore();

  const uploadMutation = trpc.reports.upload.useMutation();

  const processFile = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`${file.name} exceeds 20MB limit`);
      return;
    }

    setUploads(prev => [...prev, { file, status: 'uploading' }]);
    setUploading(true);

    try {
      // Convert to base64
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const result = await uploadMutation.mutateAsync({
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64Data,
        clientSlug: 'cauls',
      });

      const uploadedFile: UploadedFile = {
        id: nanoid(),
        filename: file.name,
        reportType: result.reportType as ReportType,
        uploadedAt: new Date().toISOString(),
        parsedData: result.parsedData,
        dbId: result.id,
      };

      setReport(result.reportType as ReportType, result.parsedData, uploadedFile);

      setUploads(prev =>
        prev.map(u => u.file === file
          ? { ...u, status: 'done', reportType: result.reportType as ReportType }
          : u
        )
      );

      toast.success(`${file.name} uploaded — detected as ${result.reportType}`);
    } catch (err) {
      setUploads(prev =>
        prev.map(u => u.file === file
          ? { ...u, status: 'error', error: 'Upload failed' }
          : u
        )
      );
      toast.error(`Failed to upload ${file.name}`);
    } finally {
      setUploading(false);
    }
  }, [uploadMutation, setReport, setUploading]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    Array.from(files).forEach(processFile);
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = '';
  };

  const removeUpload = (file: File) => {
    setUploads(prev => prev.filter(u => u.file !== file));
  };

  const pendingCount = uploads.filter(u => u.status === 'uploading').length;

  return (
    <div className="space-y-3">
      {/* Duplicate detection banner */}
      {duplicateBanner && (
        <div
          className="flex items-center justify-between px-4 py-2.5 rounded-lg text-sm"
          style={{
            background: "oklch(96% 0.04 65)",
            border: "1px solid oklch(85% 0.08 65)",
            color: "oklch(35% 0.12 65)",
          }}
        >
          <span>
            <strong>Duplicate detected:</strong> {duplicateBanner.reportType} already loaded from{" "}
            <em>{duplicateBanner.oldFilename}</em>. New file replaces it.
          </span>
          <button onClick={clearDuplicateBanner} className="ml-2 hover:opacity-70">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className="relative rounded-xl border-2 border-dashed transition-all cursor-pointer"
        style={{
          borderColor: isDragging ? "var(--tec-gold)" : "oklch(80% 0.05 300)",
          background: isDragging ? "oklch(97% 0.03 75 / 0.3)" : "oklch(99% 0.002 300)",
          padding: "1.5rem",
        }}
      >
        <input
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center gap-2 text-center pointer-events-none">
          {pendingCount > 0 ? (
            <Loader2 size={28} className="animate-spin" style={{ color: "var(--tec-purple)" }} />
          ) : (
            <Upload size={28} style={{ color: isDragging ? "var(--tec-gold)" : "var(--tec-purple-light)" }} />
          )}
          <div>
            <p className="font-medium text-sm" style={{ color: "var(--tec-purple-deep)" }}>
              {pendingCount > 0 ? `Uploading ${pendingCount} file${pendingCount > 1 ? 's' : ''}…` : "Drop files here or click to browse"}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "oklch(55% 0.06 300)" }}>
              CSV, XLSX, XLS, PDF, DOCX — QuickBooks exports auto-detected
            </p>
          </div>
        </div>
      </div>

      {/* Upload status list */}
      {uploads.length > 0 && (
        <div className="space-y-1.5">
          {uploads.map((u, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
              style={{
                background: u.status === 'error' ? "oklch(96% 0.03 25)" : "oklch(99% 0.002 300)",
                border: "1px solid oklch(90% 0.005 300)",
              }}
            >
              <FileText size={13} style={{ color: "var(--tec-purple-light)", flexShrink: 0 }} />
              <span className="flex-1 truncate font-medium" style={{ color: "var(--tec-purple-deep)" }}>
                {u.file.name}
              </span>
              {u.reportType && (
                <span
                  className="px-1.5 py-0.5 rounded text-xs font-medium shrink-0"
                  style={{ background: "oklch(93% 0.04 310)", color: "var(--tec-purple)" }}
                >
                  {u.reportType}
                </span>
              )}
              {u.status === 'uploading' && <Loader2 size={13} className="animate-spin shrink-0" style={{ color: "var(--tec-purple)" }} />}
              {u.status === 'done' && <CheckCircle size={13} className="shrink-0" style={{ color: "var(--tec-green)" }} />}
              {u.status === 'error' && <AlertCircle size={13} className="shrink-0" style={{ color: "var(--tec-red)" }} />}
              <button onClick={() => removeUpload(u.file)} className="shrink-0 hover:opacity-70 ml-1">
                <X size={12} style={{ color: "oklch(60% 0.05 300)" }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
