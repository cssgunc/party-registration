"use client";

import AddressSearch from "@/components/AddressSearch";
import DatePicker from "@/components/DatePicker";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
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
import { AutocompleteResult } from "@/lib/api/location/location.types";
import { ResidenceDto } from "@/lib/api/student/student.types";
import { addBusinessDays, isAfter, startOfDay } from "date-fns";
import { useState } from "react";
import * as z from "zod";

export const studentTableFormSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Second name is required"),
  email: z.email("Please enter a valid email").min(1, "Email is required"),
  phone_number: z
    .string()
    .min(1, "Phone number is required")
    .refine(
      (val) => val.replace(/\D/g, "").length >= 10,
      "Phone number must be at least 10 digits"
    )
    .transform((val) => val.replace(/\D/g, "")),
  contact_preference: z.enum(["call", "text"], {
    message: "Please select a contact preference",
  }),
  last_registered: z.date().nullable(),
  pid: z
    .string()
    .regex(/^\d{9}$/, { message: "Please input a valid PID" })
    .min(1, "PID is required"),
  onyen: z.string().min(1, "Onyen is required"),
  residence: z.custom<ResidenceDto | null>().default(null),
  residence_place_id: z.string().nullable().optional(),
});

const formatPhoneNumber = (value: string): string => {
  return value
    ? `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`
    : "—";
};

type StudentTableFormValues = z.infer<typeof studentTableFormSchema>;

interface StudentTableFormProps {
  onSubmit: (data: StudentTableFormValues) => void | Promise<void>;
  editData?: StudentTableFormValues;
  submissionError?: string | null;
  title?: string;
}

export default function StudentTableForm({
  onSubmit,
  editData,
  submissionError,
  title,
}: StudentTableFormProps) {
  const initialResidenceSelection: AutocompleteResult | null =
    editData?.residence
      ? {
          formatted_address: editData.residence.location.formatted_address,
          google_place_id: editData.residence.location.google_place_id,
        }
      : null;

  const [formData, setFormData] = useState<Partial<StudentTableFormValues>>({
    pid: editData?.pid ?? "",
    first_name: editData?.first_name ?? "",
    last_name: editData?.last_name ?? "",
    email: editData?.email ?? "",
    onyen: editData?.onyen ?? "",
    phone_number: editData?.phone_number ?? "",
    contact_preference: editData?.contact_preference ?? undefined,
    last_registered: editData?.last_registered ?? null,
    residence: editData?.residence ?? null,
    residence_place_id: editData?.residence_place_id ?? null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = studentTableFormSchema.safeParse(formData);

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

  const updateField = <K extends keyof StudentTableFormValues>(
    field: K,
    value: StudentTableFormValues[K]
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

  const isPIDEditMode = !!editData;
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
          <Field data-invalid={!!errors.pid}>
            <FieldLabel htmlFor="pid">PID</FieldLabel>
            <Input
              id="first-name"
              placeholder="123456789"
              value={formData.pid}
              onChange={(e) => updateField("pid", e.target.value)}
              aria-invalid={!!errors.pid}
              disabled={isPIDEditMode}
              title={
                isPIDEditMode ? "This field is managed by UNC SSO" : undefined
              }
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
              disabled={isPIDEditMode}
              title={
                isPIDEditMode ? "This field is managed by UNC SSO" : undefined
              }
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
              disabled={isPIDEditMode}
              title={
                isPIDEditMode ? "This field is managed by UNC SSO" : undefined
              }
            />
            {errors.last_name && <FieldError>{errors.last_name}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="student@unc.edu"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              aria-invalid={!!errors.email}
              disabled={isPIDEditMode}
              title={
                isPIDEditMode ? "This field is managed by UNC SSO" : undefined
              }
            />
            {errors.email && <FieldError>{errors.email}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.onyen}>
            <FieldLabel htmlFor="onyen">Onyen</FieldLabel>
            <Input
              id="onyen"
              placeholder="johndoe"
              value={formData.onyen}
              onChange={(e) => updateField("onyen", e.target.value)}
              aria-invalid={!!errors.onyen}
              disabled={isPIDEditMode}
              title={
                isPIDEditMode ? "This field is managed by UNC SSO" : undefined
              }
            />
            {errors.onyen && <FieldError>{errors.onyen}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.phone_number}>
            <FieldLabel htmlFor="phone-number">Phone Number</FieldLabel>
            <Input
              id="phone-number"
              placeholder="(123) 456-7890"
              value={formatPhoneNumber((formData.phone_number as string) || "")}
              onChange={(e) => updateField("phone_number", e.target.value)}
              aria-invalid={!!errors.phone_number}
            />
            {errors.phone_number && (
              <FieldError>{errors.phone_number}</FieldError>
            )}
          </Field>

          <Field data-invalid={!!errors.contact_preference}>
            <FieldLabel htmlFor="contact-preference">
              Contact Preference
            </FieldLabel>
            <Select
              value={formData.contact_preference}
              onValueChange={(value) =>
                updateField("contact_preference", value as "call" | "text")
              }
            >
              <SelectTrigger id="contact-two-preference">
                <SelectValue placeholder="Select preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="text">Text</SelectItem>
              </SelectContent>
            </Select>
            {errors.contact_preference && (
              <FieldError>{errors.contact_preference}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel>Residence Address</FieldLabel>
            <AddressSearch
              initialSelection={initialResidenceSelection}
              onSelect={(address) =>
                updateField(
                  "residence_place_id",
                  address?.google_place_id ?? null
                )
              }
              placeholder="Search for student's residence..."
            />
            <FieldDescription>
              Leave blank to remove the student&apos;s current residence.
            </FieldDescription>
          </Field>

          <Field data-invalid={!!errors.last_registered}>
            <FieldLabel htmlFor="party-date">Last registered</FieldLabel>
            <DatePicker
              id="last-registered"
              value={formData.last_registered}
              onChange={(date) => updateField("last_registered", date)}
              disabled={(date) =>
                isAfter(
                  startOfDay(date),
                  addBusinessDays(startOfDay(new Date()), 0)
                )
              }
              clearable
            />
            <FieldDescription>
              Leave blank if student is not registered.
            </FieldDescription>
            {errors.last_registered && (
              <FieldError>{errors.last_registered}</FieldError>
            )}
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
