"use client";

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
import apiClient from "@/lib/network/apiClient";
import { useState } from "react";
import * as z from "zod";

const studentInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z
    .string()
    .min(1, "Phone number is required")
    .refine(
      (val) => val.replace(/\D/g, "").length >= 10,
      "Phone number must be at least 10 digits"
    ), // Ensures phone number is at least 10 digits regardless of format (ex: (123) 456-7890 or 1234567890)
  contactPreference: z.enum(["call", "text"], {
    message: "Please select a contact preference",
  }),
});

// Grab the type of the form data from the schema so we can use it in the component
type StudentInfoValues = z.infer<typeof studentInfoSchema>;

interface StudentInfoProps {
  id?: number;
  initialData?: Partial<StudentInfoValues>;
}

export default function StudentInfo({ id, initialData }: StudentInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<StudentInfoValues>>({
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    phoneNumber: initialData?.phoneNumber || "",
    contactPreference: initialData?.contactPreference,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = studentInfoSchema.safeParse(formData);

    // Add errors to the form if the data is invalid
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

    // Safely handle submission
    setIsSubmitting(true);
    try {
      if (id) {
        // Map form data to API format (camelCase to snake_case)
        const apiData = {
          first_name: result.data.firstName,
          last_name: result.data.lastName,
          phone_number: result.data.phoneNumber,
          contact_preference: result.data.contactPreference,
        };

        await apiClient.put(`/students/${id}`, apiData);

        // Update formData with the submitted values to reflect in display
        setFormData(result.data);
      }

      setIsEditing(false);
    } catch (error) {
      // Handle API errors
      console.error("Failed to update student info:", error);
      setErrors({
        submit:
          error instanceof Error
            ? error.message
            : "Failed to update student information",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update the form data when the user changes a field while handling errors
  const updateField = <K extends keyof StudentInfoValues>(
    field: K,
    value: StudentInfoValues[K]
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

  // Reset the form data to the initial data
  const handleCancel = () => {
    setFormData({
      firstName: initialData?.firstName || "",
      lastName: initialData?.lastName || "",
      phoneNumber: initialData?.phoneNumber || "",
      contactPreference: initialData?.contactPreference,
    });
    setErrors({});
    setIsEditing(false);
  };

  const displayData = {
    firstName: formData.firstName ?? initialData?.firstName ?? "",
    lastName: formData.lastName ?? initialData?.lastName ?? "",
    phoneNumber: formData.phoneNumber ?? initialData?.phoneNumber ?? "",
    contactPreference:
      formData.contactPreference ?? initialData?.contactPreference ?? undefined,
  };

  if (!isEditing) {
    return (
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Student Information</h2>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Name: </span>
              <span>
                {displayData.firstName || "Not set"}{" "}
                {displayData.lastName || ""}
              </span>
            </div>
            <div>
              <span className="font-medium">Phone Number: </span>
              <span>{displayData.phoneNumber || "Not set"}</span>
            </div>
            <div>
              <span className="font-medium">Contact Preference: </span>
              <span>{displayData.contactPreference || "Not set"}</span>
            </div>
          </div>
        </div>
        <Button onClick={() => setIsEditing(true)} variant="outline">
          Edit
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <FieldSet>
          <Field data-invalid={!!errors.firstName}>
            <FieldLabel htmlFor="first-name">First Name</FieldLabel>
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
            <FieldLabel htmlFor="last-name">Last Name</FieldLabel>
            <Input
              id="last-name"
              placeholder="Doe"
              value={formData.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
              aria-invalid={!!errors.lastName}
            />
            {errors.lastName && <FieldError>{errors.lastName}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.phoneNumber}>
            <FieldLabel htmlFor="phone-number">Phone Number</FieldLabel>
            <Input
              id="phone-number"
              placeholder="(123) 456-7890"
              value={formData.phoneNumber}
              onChange={(e) => updateField("phoneNumber", e.target.value)}
              aria-invalid={!!errors.phoneNumber}
            />
            <FieldDescription>We will use this to contact you</FieldDescription>
            {errors.phoneNumber && (
              <FieldError>{errors.phoneNumber}</FieldError>
            )}
          </Field>

          <Field data-invalid={!!errors.contactPreference}>
            <FieldLabel htmlFor="contact-preference">
              Contact Preference
            </FieldLabel>
            <Select
              value={formData.contactPreference}
              onValueChange={(value: "call" | "text") =>
                updateField("contactPreference", value)
              }
            >
              <SelectTrigger id="contact-preference">
                <SelectValue placeholder="Select your preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="text">Text</SelectItem>
              </SelectContent>
            </Select>
            <FieldDescription>How should we contact you?</FieldDescription>
            {errors.contactPreference && (
              <FieldError>{errors.contactPreference}</FieldError>
            )}
          </Field>

          {errors.submit && (
            <Field>
              <FieldError>{errors.submit}</FieldError>
            </Field>
          )}

          <Field orientation="horizontal">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </Field>
        </FieldSet>
      </FieldGroup>
    </form>
  );
}
