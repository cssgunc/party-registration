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
