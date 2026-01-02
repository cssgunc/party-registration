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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import * as z from "zod";

export const accountTableFormSchema = z.object({
  pid: z.string().length(9, "Please input a valid PID"),
  email: z.email({ pattern: z.regexes.html5Email }).min(1, "Email is required"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Second name is required"),
  role: z.string().min(1, "Role is required"),
});

type AccountTableFormValues = z.infer<typeof accountTableFormSchema>;

interface AccountTableFormProps {
  onSubmit: (data: AccountTableFormValues) => void | Promise<void>;
  editData?: AccountTableFormValues;
  submissionError?: string | null;
  title?: string;
}

export default function AccountTableForm({
  onSubmit,
  editData,
  submissionError,
  title,
}: AccountTableFormProps) {
  const [formData, setFormData] = useState<Partial<AccountTableFormValues>>({
    email: editData?.email ?? "",
    first_name: editData?.first_name ?? "",
    last_name: editData?.last_name ?? "",
    role: editData?.role ?? "",
    pid: editData?.pid ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = accountTableFormSchema.safeParse(formData);

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

  const updateField = <K extends keyof AccountTableFormValues>(
    field: K,
    value: AccountTableFormValues[K]
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
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="student@unc.edu"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              aria-invalid={!!errors.email}
            />
            {errors.email && <FieldError>{errors.email}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.pid}>
            <FieldLabel htmlFor="pid">PID</FieldLabel>
            <Input
              id="first-name"
              placeholder="123456789"
              value={formData.pid}
              onChange={(e) => updateField("pid", e.target.value)}
              aria-invalid={!!errors.pid}
            />
            {errors.pid && <FieldError>{errors.pid}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.first_name}>
            <FieldLabel htmlFor="first-name">First name</FieldLabel>
            <Input
              id="first-name"
              placeholder="John"
              value={formData.first_name}
              onChange={(e) => updateField("first_name", e.target.value)}
              aria-invalid={!!errors.first_name}
            />
            {errors.first_name && <FieldError>{errors.first_name}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.last_name}>
            <FieldLabel htmlFor="last-name">Last name</FieldLabel>
            <Input
              id="last-name"
              placeholder="Doe"
              value={formData.last_name}
              onChange={(e) => updateField("last_name", e.target.value)}
              aria-invalid={!!errors.last_name}
            />
            {errors.last_name && <FieldError>{errors.last_name}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.role}>
            <FieldLabel htmlFor="role">Role</FieldLabel>
            <Select
              value={formData.role}
              onValueChange={(value) =>
                updateField("role", value as "staff" | "admin")
              }
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && <FieldError>{errors.role}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Save"}
            </Button>
          </Field>
        </FieldSet>
      </FieldGroup>
    </form>
  );
}
