"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addBusinessDays, format, isAfter, startOfDay } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import * as z from "zod";

export const studentTableFormSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Second name is required"),
  email: z.email("Please enter a valid email").min(1, "Email is required"),
  phone_number: z
    .string()
    .regex(/^\+?1?\d{9,15}$/, { message: "Please input a valid phone number" })
    .min(1, "Phone number is required"),
  contact_preference: z.enum(["call", "text"], {
    message: "Please select a contact preference",
  }),
  last_registered: z.date().nullable(),
  pid: z
    .string()
    .length(9, "Please input a valid PID")
    .min(1, "PID is required"),
});

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
  const [formData, setFormData] = useState<Partial<StudentTableFormValues>>({
    pid: editData?.pid ?? "",
    first_name: editData?.first_name ?? "",
    last_name: editData?.last_name ?? "",
    email: editData?.email ?? "",
    phone_number: editData?.phone_number ?? "",
    contact_preference: editData?.contact_preference ?? undefined,
    last_registered: editData?.last_registered ?? null,
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
            />
            {errors.email && <FieldError>{errors.email}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.phone_number}>
            <FieldLabel htmlFor="phone-number">Phone Number</FieldLabel>
            <Input
              id="phone-number"
              placeholder="(123) 456-7890"
              value={formData.phone_number}
              onChange={(e) => updateField("phone_number", e.target.value)}
              aria-invalid={!!errors.phone_number}
            />
            {errors.phone_number && (
              <FieldError>{errors.phone_number}</FieldError>
            )}
          </Field>

          <Field data-invalid={!!errors.last_registered}>
            <FieldLabel htmlFor="party-date">Last registered</FieldLabel>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="party-date"
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${
                    !formData.last_registered && "text-muted-foreground"
                  }`}
                >
                  {formData.last_registered ? (
                    format(formData.last_registered, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.last_registered || undefined}
                  onSelect={(date) =>
                    updateField("last_registered", date ?? null)
                  }
                  disabled={(date) =>
                    isAfter(
                      startOfDay(date),
                      addBusinessDays(startOfDay(new Date()), 0)
                    )
                  }
                />
              </PopoverContent>
            </Popover>
            <FieldDescription>
              Leave blank if student is not registered.
            </FieldDescription>
            {errors.last_registered && (
              <FieldError>{errors.last_registered}</FieldError>
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
