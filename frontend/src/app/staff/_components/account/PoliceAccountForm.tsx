"use client";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import * as z from "zod";

export const policeAccountFormSchema = z.object({
  email: z.email({ pattern: z.regexes.html5Email }).min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

export type PoliceAccountFormValues = z.infer<typeof policeAccountFormSchema>;

interface PoliceAccountFormProps {
  onSubmit: (data: PoliceAccountFormValues) => void | Promise<void>;
  editData?: { email: string };
  submissionError?: string | null;
  title?: string;
}

export default function PoliceAccountForm({
  onSubmit,
  editData,
  submissionError,
  title,
}: PoliceAccountFormProps) {
  const [formData, setFormData] = useState<Partial<PoliceAccountFormValues>>({
    email: editData?.email ?? "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = policeAccountFormSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(result.data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = <K extends keyof PoliceAccountFormValues>(
    field: K,
    value: PoliceAccountFormValues[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {title && <h2 className="text-xl font-semibold mb-4">{title}</h2>}
      {submissionError && (
        <div
          className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {submissionError}
        </div>
      )}
      <FieldGroup>
        <FieldSet>
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="police-email">Email</FieldLabel>
            <Input
              id="police-email"
              type="email"
              placeholder="officer@department.gov"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              aria-invalid={!!errors.email}
              autoComplete="off"
            />
            {errors.email && <FieldError>{errors.email}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="police-password">Password</FieldLabel>
            <Input
              id="police-password"
              type="password"
              placeholder="Enter new password"
              value={formData.password}
              onChange={(e) => updateField("password", e.target.value)}
              aria-invalid={!!errors.password}
              autoComplete="off"
            />
            {errors.password && <FieldError>{errors.password}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Save Changes"}
            </Button>
          </Field>
        </FieldSet>
      </FieldGroup>
    </form>
  );
}
