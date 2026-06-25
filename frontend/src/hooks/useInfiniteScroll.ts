import { useEffect, useRef, useState } from "react";

export function useInfiniteScroll(
  total: number,
  pageSize: number
): [number, React.RefCallback<Element>] {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const totalRef = useRef(total);
  const pageSizeRef = useRef(pageSize);

  useEffect(() => {
    totalRef.current = total;
    pageSizeRef.current = pageSize;
  });

  useEffect(() => {
    setVisibleCount((prev) => {
      if (prev > total) return Math.max(total, pageSize);
      if (pageSize !== pageSizeRef.current) return pageSize;
      return prev;
    });
  }, [total, pageSize]);

  const sentinelRef = (node: Element | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!node) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((prev) =>
            Math.min(prev + pageSizeRef.current, totalRef.current)
          );
        }
      },
      { threshold: 0 }
    );
    observerRef.current.observe(node);
  };

  return [visibleCount, sentinelRef];
}
