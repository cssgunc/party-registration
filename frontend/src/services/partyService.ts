import apiClient from "@/lib/network/apiClient";
import { AxiosInstance } from "axios";
import { format } from "date-fns";

export class PartyService {
  constructor(private client: AxiosInstance = apiClient) {}

  async downloadPartiesCsv(startDate: Date, endDate: Date): Promise<void> {
    try {
      const formattedStartDate = format(startDate, "yyyy-MM-dd");
      const formattedEndDate = format(endDate, "yyyy-MM-dd");

      const response = await this.client.get(
        `/parties/csv?start_date=${formattedStartDate}&end_date=${formattedEndDate}`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], { type: "text/csv" });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `parties_${formattedStartDate}_to_${formattedEndDate}.csv`;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download parties CSV:", error);
      throw new Error("Failed to download CSV. Please try again.");
    }
  }
}

export default PartyService;
