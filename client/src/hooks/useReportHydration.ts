import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useReportStore } from "@/store/useReportStore";
import { useAuth } from "@/_core/hooks/useAuth";
import type { ReportType, UploadedFile } from "../../../shared/types/reports";
import { nanoid } from "nanoid";

/**
 * Hydrates the Zustand report store from the database on login.
 * Runs once per authenticated session. Without this, reports vanish on
 * page refresh or logout because the Zustand store is in-memory only.
 */
export function useReportHydration() {
  const { isAuthenticated } = useAuth();
  const setReport = useReportStore(s => s.setReport);
  const uploadedFiles = useReportStore(s => s.uploadedFiles);
  const hydrated = useRef(false);

  // Always call the query hook — just disable it when not needed
  const { data: savedReports } = trpc.reports.list.useQuery(
    { clientSlug: "cauls" },
    {
      enabled: isAuthenticated && !hydrated.current && uploadedFiles.length === 0,
      staleTime: 60_000,
      retry: 1,
    }
  );

  useEffect(() => {
    if (!savedReports || hydrated.current || uploadedFiles.length > 0) return;

    for (const report of savedReports) {
      if (!report.parsedData || !report.reportType) continue;

      const uploadedFile: UploadedFile = {
        id: nanoid(),
        filename: report.filename ?? 'unknown',
        reportType: report.reportType as ReportType,
        uploadedAt: report.uploadedAt != null ? report.uploadedAt.toString() : new Date().toISOString(),
        parsedData: report.parsedData,
        dbId: report.id,
      };

      setReport(
        report.reportType as ReportType,
        report.parsedData,
        uploadedFile
      );
    }

    hydrated.current = true;
  }, [savedReports, setReport, uploadedFiles.length]);
}
