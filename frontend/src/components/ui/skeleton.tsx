import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-md bg-[var(--muted-background)]",
        className
      )}
      {...props}
    />
  );
}

function SkeletonAvatar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex w-fit items-center gap-4", className)} {...props}>
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="grid gap-2">
        <Skeleton className="h-4 w-[150px]" />
        <Skeleton className="h-4 w-[100px]" />
      </div>
    </div>
  );
}

function SkeletonCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <Card className={cn("w-full border-none bg-card", className)} {...props}>
      <CardHeader className="flex justify-center items-center">
        <Skeleton className="h-8 w-1/2 m-10" />
        <SkeletonIcon />
      </CardHeader>
      <CardContent className="mx-15 mb-10 flex flex-col items-center gap-6">
        <Skeleton className="aspect-video w-full" />
        <Skeleton className="h-12 w-1/4" />
      </CardContent>
    </Card>
  );
}

function SkeletonText({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex w-full max-w-xs flex-col gap-3", className)}
      {...props}
    >
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

function SkeletonForm({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex w-full max-w-xs flex-col gap-7", className)}
      {...props}
    >
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-full" />
      </div>
      <Skeleton className="h-8 w-24" />
    </div>
  );
}

function SkeletonTable({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex w-full flex-col gap-2", className)} {...props}>
      {Array.from({ length: 5 }).map((_, index) => (
        <div className="flex gap-6" key={index}>
          <Skeleton className="h-6 w-76" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

function SkeletonIcon({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex w-fit items-center", className)} {...props}>
      <Skeleton className="size-10 shrink-0 rounded-full" />
    </div>
  );
}

export {
  Skeleton,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonForm,
  SkeletonIcon,
  SkeletonTable,
  SkeletonText,
};
