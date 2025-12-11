"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { PartyService } from "@/lib/api/party/party.service";
import getMockClient from "@/lib/network/mockClient";

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
      const partyService = new PartyService(getMockClient("admin"));
      await partyService.downloadPartiesCsv(startDate, endDate);
    } catch (err) {
      console.error("Failed to download CSV:", err);
      setError("Failed to download CSV. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const isDisabled = !startDate || !endDate || isDownloading;

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
