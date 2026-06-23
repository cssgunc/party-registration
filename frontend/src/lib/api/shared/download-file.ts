import { AxiosResponse } from "axios";

const EXCEL_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Parse the `Content-Disposition` header to extract the download filename.
 *
 * Prefers the RFC 5987 `filename*=UTF-8''...` form (handles non-ASCII names)
 * then falls back to the plain `filename="..."` form. Returns `fallbackFileName`
 * when the header is absent or neither pattern matches.
 */
function getFileNameFromContentDisposition(
  contentDisposition?: string,
  fallbackFileName: string = "download.xlsx"
): string {
  if (!contentDisposition) return fallbackFileName;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const asciiMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  if (asciiMatch?.[1]) {
    return asciiMatch[1];
  }

  return fallbackFileName;
}

/**
 * Trigger a browser file download from an Axios blob response.
 *
 * Derives the filename from the `Content-Disposition` header when available,
 * falling back to `fallbackFileName`. Creates a temporary `<a>` element to
 * initiate the download and immediately revokes the object URL afterwards.
 */
export function downloadExcelFile(
  response: AxiosResponse<BlobPart>,
  fallbackFileName?: string
): void {
  const blob = new Blob([response.data], {
    type: EXCEL_MIME_TYPE,
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const fileName = getFileNameFromContentDisposition(
    response.headers["content-disposition"],
    fallbackFileName
  );

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
