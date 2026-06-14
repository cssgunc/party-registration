"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type SubmitButtonProps = React.ComponentProps<typeof Button> & {
  /** Whether a submit is in progress (disables + swaps the label). */
  pending?: boolean;
  label: React.ReactNode;
  pendingLabel?: React.ReactNode;
};

/**
 * A submit button that swaps its label and disables itself while a submit is in
 * progress. `pending` is passed explicitly so it works both with
 * react-hook-form's `formState.isSubmitting` and with externally-owned mutation
 * state (e.g. a parent's `mutation.isPending`). Sizing/alignment is the
 * caller's job via `className`.
 */
export function SubmitButton({
  pending = false,
  label,
  pendingLabel = "Submitting...",
  disabled,
  className,
  ...props
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      {...props}
      // Override the base `transition-all`: animating width on a `w-fit` button
      // makes it briefly blow out to the container width on the pending swap.
      className={cn("transition-colors", className)}
      disabled={pending || disabled}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  );
}
