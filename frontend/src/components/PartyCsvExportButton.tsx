"use client";

import { format } from "date-fns";
import { Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
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
      const mockClient = getMockClient("admin");
      
      // Format dates to YYYY-MM-DD format
      const formattedStartDate = format(startDate, "yyyy-MM-dd");
      const formattedEndDate = format(endDate, "yyyy-MM-dd");

      // Make GET request to CSV endpoint
      const response = await mockClient.get(
        `/parties/csv?start_date=${formattedStartDate}&end_date=${formattedEndDate}`,
        {
          responseType: "blob",
        }
      );

      // Create blob from response
      const blob = new Blob([response.data], { type: "text/csv" });
      
      // Create download link and trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `parties_${formattedStartDate}_to_${formattedEndDate}.csv`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
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

