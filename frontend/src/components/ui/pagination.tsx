import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react";
import * as React from "react";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("gap-0.5 flex items-center", className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"a">;

function PaginationLink({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) {
  return (
    <Button
      asChild
      variant={isActive ? "outline" : "ghost"}
      size={size}
      className={cn(isActive && "card-shadow", className)}
    >
      <a
        aria-current={isActive ? "page" : undefined}
        data-slot="pagination-link"
        data-active={isActive}
        {...props}
      />
    </Button>
  );
}

function PaginationFirst({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to first page"
      size="icon"
      className={cn(className)}
      {...props}
    >
      <ChevronFirstIcon className="cn-rtl-flip" />
    </PaginationLink>
  );
}

function PaginationLast({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to last page"
      size="icon"
      className={cn(className)}
      {...props}
    >
      <ChevronLastIcon className="cn-rtl-flip" />
    </PaginationLink>
  );
}

function PaginationPrevious({
  className,
  text = "Previous",
  showLabel,
  labelClassName,
  ...props
}: React.ComponentProps<typeof PaginationLink> & {
  text?: string;
  showLabel?: boolean;
  labelClassName?: string;
}) {
  const labelClass =
    labelClassName ??
    (showLabel === undefined
      ? "hidden sm:block"
      : showLabel
        ? undefined
        : "hidden");
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size={showLabel === false ? "icon" : "default"}
      className={cn(showLabel !== false && "pl-1.5!", className)}
      {...props}
    >
      <ChevronLeftIcon data-icon="inline-start" className="cn-rtl-flip" />
      <span className={labelClass}>{text}</span>
    </PaginationLink>
  );
}

function PaginationNext({
  className,
  text = "Next",
  showLabel,
  labelClassName,
  ...props
}: React.ComponentProps<typeof PaginationLink> & {
  text?: string;
  showLabel?: boolean;
  labelClassName?: string;
}) {
  const labelClass =
    labelClassName ??
    (showLabel === undefined
      ? "hidden sm:block"
      : showLabel
        ? undefined
        : "hidden");
  return (
    <PaginationLink
      aria-label="Go to next page"
      size={showLabel === false ? "icon" : "default"}
      className={cn(showLabel !== false && "pr-1.5!", className)}
      {...props}
    >
      <span className={labelClass}>{text}</span>
      <ChevronRightIcon data-icon="inline-end" className="cn-rtl-flip" />
    </PaginationLink>
  );
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn(
        "size-8 [&_svg:not([class*='size-'])]:size-4 flex items-center justify-center",
        className
      )}
      {...props}
    >
      <MoreHorizontalIcon />
      <span className="sr-only">More pages</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationFirst,
  PaginationItem,
  PaginationLast,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
