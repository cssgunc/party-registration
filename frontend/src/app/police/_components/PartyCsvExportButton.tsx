"use client";

import { Button } from "@/components/ui/button";
import { useDownloadPartiesCsv } from "@/lib/api/party/party.queries";
import { endOfDay } from "date-fns";
import { Download, Loader2 } from "lucide-react";

interface PartyCsvExportButtonProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
}

export default function PartyCsvExportButton({
  startDate,
  endDate,
}: PartyCsvExportButtonProps) {
  const { mutate: downloadCsv, isPending, error } = useDownloadPartiesCsv();

  const handleDownload = () => {
    if (!startDate || !endDate) return;

    downloadCsv({
      page_number: 1,
      filters: {
        party_datetime_gte: startDate.toISOString(),
        party_datetime_lte: endOfDay(endDate).toISOString(),
      },
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        onClick={handleDownload}
        disabled={!startDate || !endDate || isPending}
        variant="default"
        size="icon-sm"
        aria-label="Download CSV"
        title="Download CSV"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
      </Button>
      {error && (
        <p className="content text-destructive" role="alert">
          Failed to download CSV. Please try again.
        </p>
      )}
    </div>
  );
}
