"use client";

import { Button } from "@/components/ui/button";
import { PartyService } from "@/lib/api/party/party.service";
import getMockClient from "@/lib/network/mockClient";
import { Download } from "lucide-react";
import { useState } from "react";

interface PartyCsvExportButtonProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  compact?: boolean;
}

export default function PartyCsvExportButton({
  startDate,
  endDate,
  compact = false,
}: PartyCsvExportButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (!startDate || !endDate) {
      if (!compact) setError("Please select both start and end dates");
      return;
    }
    setIsDownloading(true);
    setError(null);
    try {
      const partyService = new PartyService(getMockClient("admin"));
      await partyService.downloadPartiesCsv(startDate, endDate);
    } catch (err) {
      console.error("Failed to download CSV:", err);
      if (!compact) setError("Failed to download CSV. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const isDisabled = !startDate || !endDate || isDownloading;

  if (compact) {
    return (
      <Button
        onClick={handleDownload}
        disabled={isDisabled}
        className="bg-secondary text-primary-foreground hover:bg-secondary/90 h-8 w-8 p-0"
        size="sm"
        title={isDownloading ? "Downloading..." : "Download CSV"}
      >
        <Download className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleDownload}
        disabled={isDisabled}
        className="w-full sm:w-auto"
      >
        <Download className="mr-2 h-4 w-4" />
        {isDownloading ? "Downloading..." : "Download CSV"}
      </Button>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
