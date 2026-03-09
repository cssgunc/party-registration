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
import { useUpdateStudent } from "@/lib/api/student/student.queries";
import { StudentDto } from "@/lib/api/student/student.types";
import { Pencil } from "lucide-react";
import { useState } from "react";
import * as z from "zod";

const studentInfoSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  phone_number: z
    .string()
    .min(1, "Phone number is required")
    .refine(
      (val) => val.replace(/\D/g, "").length >= 10,
      "Phone number must be at least 10 digits"
    ), // Ensures phone number is at least 10 digits regardless of format (ex: (123) 456-7890 or 1234567890)
  contact_preference: z.enum(["call", "text"], {
    message: "Please select a contact preference",
  }),
});

// Grab the type of the form data from the schema so we can use it in the component
type StudentInfoValues = z.infer<typeof studentInfoSchema>;

interface StudentInfoProps {
  initialData: StudentDto;
}

export default function StudentInfo({ initialData }: StudentInfoProps) {
  const updateStudentMutation = useUpdateStudent();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<StudentInfoValues>(initialData);
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
      await updateStudentMutation.mutateAsync({
        phone_number: result.data.phone_number,
        contact_preference: result.data.contact_preference,
        last_registered: initialData.last_registered,
      });

      // Update formData with the submitted values to reflect in display
      setFormData(result.data);

      setIsEditing(false);
    } catch (error) {
      // Handle API errors
      console.error("Failed to update student info:", error);

      // Check if it's an authentication error
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { response?: { status: number } };
        if (axiosError.response?.status === 401) {
          setErrors({
            submit:
              "Authentication required. Please log in to update your profile.",
          });
        } else {
          setErrors({
            submit: "Failed to update student information. Please try again.",
          });
        }
      } else {
        setErrors({
          submit:
            error instanceof Error
              ? error.message
              : "Failed to update student information",
        });
      }
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

  const displayData = {
    first_name: formData.first_name ?? initialData?.first_name ?? "",
    last_name: formData.last_name ?? initialData?.last_name ?? "",
    phone_number: formData.phone_number ?? initialData?.phone_number ?? "",
    contact_preference:
      formData.contact_preference ??
      initialData?.contact_preference ??
      undefined,
  };

  if (!isEditing) {
    return (
      <main className="bg-white rounded-lg py-6 px-6 sm:px-10 w-full flex flex-col">
        <div className="self-center gap-6 flex justify-between mb-4 sm:mb-7">
          <h1 className="page-title">
            Edit Profile Information
          </h1>
          <button
            onClick={() => setIsEditing(true)}
            className="hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Edit profile"
          >
            <Pencil className="w-6 h-6 text-[#09294E] cursor-pointer" />
          </button>
        </div>

        <section className="sm:grid sm:grid-cols-2">
          <div className="sm:mt-0 sm:border-b mr-6">
            <p className="subhead-content pb-1">
              First Name
            </p>
            <p className="content">
              {displayData.first_name}
            </p>
          </div>

          <div className="mt-3 sm:mt-0 sm:border-b mr-6">
            <p className="subhead-content pb-1">
              Last Name
            </p>
            <p className="content">
              {displayData.last_name}
            </p>
          </div>

          <div className="mt-3 sm:mt-6 sm:border-b mr-6">
            <p className="subhead-content pb-1">
              Phone Number
            </p>
            <p className="content">
              {displayData.phone_number}
            </p>
          </div>

          <div className="mt-3 sm:mt-6 sm:border-b mr-6">
            <p className="subhead-content pb-1">
              Contact Method
            </p>
            <p className="content">
              {displayData.contact_preference
                ? displayData.contact_preference.charAt(0).toUpperCase() +
                  displayData.contact_preference.slice(1)
                : "Not set"}
            </p>
          </div>

          <div className="mt-3 sm:mt-6 sm:border-b mr-6">
            <p className="subhead-content pb-1">
              2025-2026 Address
            </p>
            <p className="content"> {/* need to update */}
              Address
            </p>
          </div>
        </section>

        <section className="mt-2 flex justify-center">
          <Button variant="default">Log Out</Button>
        </section>
      </main>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg">
      <FieldGroup>
        <FieldSet className="rounded-lg py-4 px-6 w-full flex flex-col">
         
          <section className="sm:grid sm:grid-cols-2 sm:gap-x-12 sm:gap-y-8">
            <Field data-invalid={!!errors.first_name}>
              <FieldLabel
                htmlFor="first-name"
                className="subhead-content"
              >
                First Name
              </FieldLabel>
              <Input
                id="first-name"
                placeholder="John"
                value={formData.first_name}
                onChange={(e) => updateField("first_name", e.target.value)}
                aria-invalid={!!errors.first_name}
                className="content"
              />
              {errors.first_name && (
                <FieldError>{errors.first_name}</FieldError>
              )}
            </Field>

            <Field data-invalid={!!errors.last_name}>
              <FieldLabel
                htmlFor="last-name"
                className="subhead-content mt-3 sm:mt-0"
              >
                Last Name
              </FieldLabel>
              <Input
                id="last-name"
                placeholder="Doe"
                value={formData.last_name}
                onChange={(e) => updateField("last_name", e.target.value)}
                aria-invalid={!!errors.last_name}
                className="content"
              />
              {errors.last_name && <FieldError>{errors.last_name}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.phone_number}>
              <FieldLabel
                htmlFor="phone-number"
                className="subhead-content mt-3 sm:mt-0"
              >
                Phone Number
              </FieldLabel>
              <Input
                id="phone-number"
                placeholder="123-456-7890"
                value={formData.phone_number}
                onChange={(e) => updateField("phone_number", e.target.value)}
                aria-invalid={!!errors.phone_number}
                className="content"
              />
              {errors.phone_number && (
                <FieldError>{errors.phone_number}</FieldError>
              )}
            </Field>

            <Field data-invalid={!!errors.contact_preference}>
              <FieldLabel
                htmlFor="contact-preference"
                className="subhead-content mt-3 sm:mt-0"
              >
                Contact Method
              </FieldLabel>
              <Select
                value={formData.contact_preference}
                onValueChange={(value: "call" | "text") =>
                  updateField("contact_preference", value)
                }
              >
                <SelectTrigger id="contact-preference" className="content">
                  <SelectValue placeholder="Select your preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call" className="content">Call</SelectItem>
                  <SelectItem value="text" className="content">Text</SelectItem>
                </SelectContent>
              </Select>
              {errors.contact_preference && (
                <FieldError>{errors.contact_preference}</FieldError>
              )}
            </Field>
            <Field>
              <FieldLabel
                htmlFor="address"
                className="subhead-content mt-3 sm:mt-0"
              >
                2025-2026 Address
              </FieldLabel>
              <Input className="content"/>
          </Field>
        </section>
          

          {errors.submit && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg ">
              <FieldError className="text-red-600">{errors.submit}</FieldError>
            </div>
          )}

          <div className="flex justify-center gap-4">
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </FieldSet>
      </FieldGroup>
    </form>
  );
}
