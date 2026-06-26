import {
  type RefCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

type InfiniteScrollOptions = {
  initialCount?: number;
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
};

function getVerticalRootMargin(rootMargin: string): {
  top: number;
  bottom: number;
} {
  const parts = rootMargin.trim().split(/\s+/);
  const [top, right = top, bottom = top, left = right] = parts;
  void left;

  const toPixels = (value: string | undefined) =>
    value?.endsWith("px") ? Number.parseFloat(value) : 0;

  return {
    top: toPixels(top),
    bottom: toPixels(bottom),
  };
}

export function useInfiniteScroll(
  total: number,
  pageSize: number,
  {
    initialCount = pageSize,
    root = null,
    rootMargin = "0px",
    threshold = 0,
  }: InfiniteScrollOptions = {}
): [number, RefCallback<Element>] {
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const nodeRef = useRef<Element | null>(null);
  const rootRef = useRef<Element | null>(root);
  const rootMarginRef = useRef(rootMargin);
  const thresholdRef = useRef(threshold);
  const totalRef = useRef(total);
  const pageSizeRef = useRef(pageSize);
  const sentinelRef = useRef<RefCallback<Element>>((node) => {
    nodeRef.current = node;

    if (observerRef.current) {
      observerRef.current?.disconnect();
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
      {
        root: rootRef.current,
        rootMargin: rootMarginRef.current,
        threshold: thresholdRef.current,
      }
    );
    observerRef.current.observe(node);
  }).current;

  useEffect(() => {
    totalRef.current = total;
    pageSizeRef.current = pageSize;
  });

  useEffect(() => {
    setVisibleCount((prev) => {
      if (prev > total) return Math.max(total, pageSize);
      if (prev < initialCount) return initialCount;
      if (pageSize !== pageSizeRef.current) return pageSize;
      return prev;
    });
  }, [initialCount, total, pageSize]);

  useEffect(() => {
    rootRef.current = root;
    rootMarginRef.current = rootMargin;
    thresholdRef.current = threshold;

    const node = nodeRef.current;
    if (!node) return;

    sentinelRef(null);
    sentinelRef(node);
  }, [root, rootMargin, sentinelRef, threshold]);

  useLayoutEffect(() => {
    const node = nodeRef.current;
    if (!node || visibleCount >= total) return;

    const nodeRect = node.getBoundingClientRect();
    const rootRect = rootRef.current?.getBoundingClientRect() ?? {
      top: 0,
      bottom: window.innerHeight,
    };
    const { top, bottom } = getVerticalRootMargin(rootMarginRef.current);
    const isVisible =
      nodeRect.bottom >= rootRect.top - top &&
      nodeRect.top <= rootRect.bottom + bottom;

    if (isVisible) {
      setVisibleCount((prev) =>
        Math.min(prev + pageSizeRef.current, totalRef.current)
      );
      return;
    }

    sentinelRef(null);
    sentinelRef(node);
  }, [sentinelRef, total, visibleCount]);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, []);

  return [visibleCount, sentinelRef];
}
