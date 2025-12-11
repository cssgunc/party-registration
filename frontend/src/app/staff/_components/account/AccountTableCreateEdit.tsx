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

export const AccountCreateEditValues = z.object({
  pid: z.string().length(9, "Please input a valid PID"),
  email: z.email({ pattern: z.regexes.html5Email }).min(1, "Email is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Second name is required"),
  role: z.string().min(1, "Role is required"),
});

type AccountCreateEditValues = z.infer<typeof AccountCreateEditValues>;

interface AccountRegistrationFormProps {
  onSubmit: (data: AccountCreateEditValues) => void | Promise<void>;
  editData?: AccountCreateEditValues;
  submissionError?: string | null;
  title?: string;
}

export default function AccountTableCreateEditForm({
  onSubmit,
  editData,
  submissionError,
  title,
}: AccountRegistrationFormProps) {
  const [formData, setFormData] = useState<Partial<AccountCreateEditValues>>({
    email: editData?.email ?? "",
    firstName: editData?.firstName ?? "",
    lastName: editData?.lastName ?? "",
    role: editData?.role ?? "",
    pid: editData?.pid ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = AccountCreateEditValues.safeParse(formData);

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

  const updateField = <K extends keyof AccountCreateEditValues>(
    field: K,
    value: AccountCreateEditValues[K]
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

          <Field data-invalid={!!errors.firstName}>
            <FieldLabel htmlFor="first-name">First name</FieldLabel>
            <Input
              id="first-name"
              placeholder="John"
              value={formData.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
              aria-invalid={!!errors.firstName}
            />
            {errors.firstName && <FieldError>{errors.firstName}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.lastName}>
            <FieldLabel htmlFor="last-name">Last name</FieldLabel>
            <Input
              id="last-name"
              placeholder="Doe"
              value={formData.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
              aria-invalid={!!errors.lastName}
            />
            {errors.lastName && <FieldError>{errors.lastName}</FieldError>}
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
