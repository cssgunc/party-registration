"use client";

import { RefObject, useLayoutEffect, useState } from "react";

type UseMeasuredFillerRowsArgs = {
  visibleRowCount: number;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  tableHeaderRef: RefObject<HTMLTableSectionElement | null>;
  sampleRowRef: RefObject<HTMLTableRowElement | null>;
};

type UseMeasuredFillerRowsResult = {
  fillerRowCount: number;
  partialFillerRowHeight: number;
};

/**
 * Calculate the number of blank filler rows needed to fill the table's visible height.
 *
 * Measures the scroll container, table header, and a sample data row via a
 * `ResizeObserver`, then computes how many full rows plus a partial row
 * (fractional remainder) are required to prevent the table body from
 * collapsing when fewer rows than the page size are present.
 *
 * @param visibleRowCount - Number of data rows currently rendered.
 * @param scrollContainerRef - Ref to the table's scrollable wrapper div.
 * @param tableHeaderRef - Ref to the `<thead>` element.
 * @param sampleRowRef - Ref attached to the first data row, used to measure row height.
 * @returns The number of full filler rows and the height of an optional partial filler row.
 */
export function useMeasuredFillerRows({
  visibleRowCount,
  scrollContainerRef,
  tableHeaderRef,
  sampleRowRef,
}: UseMeasuredFillerRowsArgs): UseMeasuredFillerRowsResult {
  const [fillerMetrics, setFillerMetrics] = useState({
    fullRows: 0,
    partialRowHeight: 0,
  });

  useLayoutEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const tableHeader = tableHeaderRef.current;

    if (!scrollContainer || !tableHeader) return;

    const updateVisibleRowCapacity = () => {
      const availableBodyHeight =
        scrollContainer.clientHeight -
        tableHeader.getBoundingClientRect().height;
      const measuredRowHeight =
        sampleRowRef.current?.getBoundingClientRect().height ?? 49;

      if (availableBodyHeight <= 0 || measuredRowHeight <= 0) {
        setFillerMetrics({ fullRows: 0, partialRowHeight: 0 });
        return;
      }

      const remainingHeight = Math.max(
        availableBodyHeight - visibleRowCount * measuredRowHeight,
        0
      );
      const fullRows = Math.floor(remainingHeight / measuredRowHeight);
      const partialRowHeight = remainingHeight - fullRows * measuredRowHeight;

      setFillerMetrics({
        fullRows,
        partialRowHeight: partialRowHeight > 1 ? partialRowHeight : 0,
      });
    };

    updateVisibleRowCapacity();

    const resizeObserver = new ResizeObserver(updateVisibleRowCapacity);
    resizeObserver.observe(scrollContainer);
    resizeObserver.observe(tableHeader);
    if (sampleRowRef.current) {
      resizeObserver.observe(sampleRowRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [visibleRowCount, scrollContainerRef, tableHeaderRef, sampleRowRef]);

  return {
    fillerRowCount: visibleRowCount > 0 ? fillerMetrics.fullRows : 0,
    partialFillerRowHeight:
      visibleRowCount > 0 ? fillerMetrics.partialRowHeight : 0,
  };
}
