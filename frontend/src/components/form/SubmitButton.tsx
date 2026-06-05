"use client";

import { Button } from "@/components/ui/button";

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
  ...props
}: SubmitButtonProps) {
  return (
    <Button type="submit" {...props} disabled={pending || disabled}>
      {pending ? pendingLabel : label}
    </Button>
  );
}
