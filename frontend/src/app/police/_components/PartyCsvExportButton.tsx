"use client";

import { Button } from "@/components/ui/button";
import { PartyService } from "@/lib/api/party/party.service";
import { Download } from "lucide-react";
import { useState } from "react";

interface PartyCsvExportButtonProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
}

export default function PartyCsvExportButton({
  startDate,
  endDate,
}: PartyCsvExportButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates");
      return;
    }

    setIsDownloading(true);
    setError(null);

    try {
      const partyService = new PartyService();
      await partyService.downloadPartiesCsv(startDate, endDate);
    } catch (err) {
      console.error("Failed to download CSV:", err);
      setError("Failed to download CSV. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        onClick={handleDownload}
        disabled={!startDate || !endDate || isDownloading}
        variant="outline"
        size="icon-sm"
        aria-label="Download CSV"
        title="Download CSV"
      >
        <Download className="size-4" />
      </Button>
      {error && (
        <p className="content text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
