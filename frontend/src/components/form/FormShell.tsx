"use client";

import { SubmitButton } from "@/components/form/SubmitButton";
import { FieldGroup, FieldSet } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import type {
  FieldValues,
  SubmitHandler,
  UseFormReturn,
} from "react-hook-form";

type FormShellProps<
  TFieldValues extends FieldValues,
  TContext,
  TTransformed extends FieldValues,
> = {
  form: UseFormReturn<TFieldValues, TContext, TTransformed>;
  onSubmit: SubmitHandler<TTransformed>;
  children: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  /** Server-side error banner rendered above the submit button when set. */
  submissionError?: string | null;
  /** Override the in-progress flag (defaults to form.formState.isSubmitting). */
  pending?: boolean;
  /**
   * className for the submit button. Defaults to full width (the submit row is a
   * flex column, so the button stretches). Pass e.g. "self-center" for a
   * natural-width, centered button.
   */
  submitClassName?: string;
};

/**
 * Standard shell for the staff table forms (and any form with the same chrome):
 * the Form provider, the <form> element wired to handleSubmit, the
 * FieldGroup/FieldSet layout wrapper, an optional error banner, and a submit
 * button. Fields are passed as children; layout within them stays in the form.
 */
export function FormShell<
  TFieldValues extends FieldValues,
  TContext,
  TTransformed extends FieldValues,
>({
  form,
  onSubmit,
  children,
  submitLabel,
  pendingLabel,
  submissionError,
  pending,
  submitClassName,
}: FormShellProps<TFieldValues, TContext, TTransformed>) {
  const isPending = pending ?? form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <FieldSet>
            {children}

            <div className="flex flex-col gap-3">
              {submissionError && (
                <div
                  className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                  role="alert"
                >
                  {submissionError}
                </div>
              )}
              <SubmitButton
                pending={isPending}
                label={submitLabel}
                pendingLabel={pendingLabel}
                className={submitClassName}
              />
            </div>
          </FieldSet>
        </FieldGroup>
      </form>
    </Form>
  );
}
