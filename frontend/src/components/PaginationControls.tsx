"use client";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";
import { type MouseEvent } from "react";

type PaginationControlsProps = {
  currentPage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions: readonly number[];
  totalCount: number;
  isLoading?: boolean;
  maxVisiblePages?: number;
  className?: string;
};

export default function PaginationControls({
  currentPage,
  pageCount,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions,
  totalCount,
  isLoading = false,
  maxVisiblePages = 3,
  className,
}: PaginationControlsProps) {
  const pageStart = Math.max(
    0,
    Math.min(
      currentPage - Math.floor(maxVisiblePages / 2),
      pageCount - maxVisiblePages
    )
  );
  const pageEnd = Math.min(pageStart + maxVisiblePages, pageCount);
  const pageIndexes = Array.from(
    { length: Math.max(pageEnd - pageStart, 0) },
    (_, i) => pageStart + i
  );

  const canPrev = currentPage > 0;
  const canNext = currentPage < pageCount - 1;

  const rangeStart = totalCount === 0 ? 0 : currentPage * pageSize + 1;
  const rangeEnd = Math.min((currentPage + 1) * pageSize, totalCount);

  return (
    <div
      className={cn(
        "@container flex items-center justify-between gap-2",
        className
      )}
    >
      <div className="hidden @lg:flex items-center justify-start min-w-0">
        {isLoading ? (
          <Skeleton className="h-4 w-36" />
        ) : (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Results {rangeStart} - {rangeEnd} of {totalCount}
          </span>
        )}
      </div>

      <div className="flex min-w-0 justify-center text-sm">
        <Pagination className="w-max">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e: MouseEvent<HTMLAnchorElement>) => {
                  e.preventDefault();
                  if (isLoading || !canPrev) return;
                  onPageChange(currentPage - 1);
                }}
                className={cn(
                  isLoading || !canPrev
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                )}
              />
            </PaginationItem>
            {isLoading ? (
              <PaginationItem className="flex items-center gap-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <Skeleton key={index} className="h-8 w-8 rounded-md" />
                ))}
              </PaginationItem>
            ) : (
              <>
                {pageStart > 0 && (
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
                        e.preventDefault();
                        onPageChange(0);
                      }}
                      className="cursor-pointer"
                      aria-label="Go to first page"
                    >
                      <MoreHorizontal />
                    </PaginationLink>
                  </PaginationItem>
                )}
                {pageIndexes.map((pageIndex) => (
                  <PaginationItem key={pageIndex}>
                    <PaginationLink
                      href="#"
                      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
                        e.preventDefault();
                        onPageChange(pageIndex);
                      }}
                      isActive={currentPage === pageIndex}
                      className="cursor-pointer"
                    >
                      {pageIndex + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                {pageEnd < pageCount && (
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
                        e.preventDefault();
                        onPageChange(pageCount - 1);
                      }}
                      className="cursor-pointer"
                      aria-label="Go to last page"
                    >
                      <MoreHorizontal />
                    </PaginationLink>
                  </PaginationItem>
                )}
              </>
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e: MouseEvent<HTMLAnchorElement>) => {
                  e.preventDefault();
                  if (isLoading || !canNext) return;
                  onPageChange(currentPage + 1);
                }}
                className={cn(
                  isLoading || !canNext
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <div className="flex items-center justify-end gap-2">
        <span className="hidden @md:inline text-sm text-muted-foreground whitespace-nowrap">
          Rows per page:
        </span>
        {isLoading ? (
          <Skeleton className="h-8 w-20 rounded-md" />
        ) : (
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              onPageSizeChange(Number(value));
              onPageChange(0);
            }}
          >
            <SelectTrigger className="bg-card w-20">
              <SelectValue placeholder="Rows" />
            </SelectTrigger>
            <SelectContent className="max-h-40 overflow-y-auto">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
