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
import { useUpdateStudent } from "@/hooks/useStudent";
import { StudentDataRequest } from "@/services/studentService";
import { Pencil } from "lucide-react";
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
  initialData?: Partial<StudentInfoValues>;
}

export default function StudentInfo({ initialData }: StudentInfoProps) {
  const updateStudentMutation = useUpdateStudent();
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
      // Map form data to API format (camelCase to snake_case)
      const apiData: StudentDataRequest = {
        first_name: result.data.firstName,
        last_name: result.data.lastName,
        phone_number: result.data.phoneNumber,
        contact_preference: result.data.contactPreference,
      };

      await updateStudentMutation.mutateAsync(apiData);

      // Update formData with the submitted values to reflect in display
      setFormData(result.data);

      setIsEditing(false);
    } catch (error) {
      // Handle API errors
      console.error("Failed to update student info:", error);
      
      // Check if it's an authentication error
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status: number } };
        if (axiosError.response?.status === 401) {
          setErrors({
            submit: "Authentication required. Please log in to update your profile.",
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
    firstName: formData.firstName ?? initialData?.firstName ?? "",
    lastName: formData.lastName ?? initialData?.lastName ?? "",
    phoneNumber: formData.phoneNumber ?? initialData?.phoneNumber ?? "",
    contactPreference:
      formData.contactPreference ?? initialData?.contactPreference ?? undefined,
  };

  if (!isEditing) {
    return (
      <div className="bg-white rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <div className="text-[32px] font-semibold text-[#09294E]">
            Edit Profile Information
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Edit profile"
          >
            <Pencil className="w-6 h-6 text-[#09294E]" />
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-x-12 gap-y-8">
          <div>
            <div className="text-[#09294E] font-semibold text-lg mb-2">
              First Name
            </div>
            <div className="text-gray-600 text-base border-b border-gray-300 pb-2">
              {displayData.firstName || "Not set"}
            </div>
          </div>

          <div>
            <div className="text-[#09294E] font-semibold text-lg mb-2">
              Last Name
            </div>
            <div className="text-gray-600 text-base border-b border-gray-300 pb-2">
              {displayData.lastName || "Not set"}
            </div>
          </div>

          <div>
            <div className="text-[#09294E] font-semibold text-lg mb-2">
              Phone Number
            </div>
            <div className="text-gray-600 text-base border-b border-gray-300 pb-2">
              {displayData.phoneNumber || "Not set"}
            </div>
          </div>

          <div>
            <div className="text-[#09294E] font-semibold text-lg mb-2">
              Contact Method
            </div>
            <div className="text-gray-600 text-base border-b border-gray-300 pb-2">
              {displayData.contactPreference 
                ? displayData.contactPreference.charAt(0).toUpperCase() + displayData.contactPreference.slice(1)
                : "Not set"}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <Button 
            className="bg-[#09294E] text-white px-8 py-2 rounded-lg hover:bg-[#0a1f38]"
          >
            Log Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg">
      <FieldGroup>
        <FieldSet>
          <div className="grid grid-cols-2 gap-x-12 gap-y-6">
            <Field data-invalid={!!errors.firstName}>
              <FieldLabel htmlFor="first-name" className="text-[#09294E] font-semibold text-lg">
                First Name
              </FieldLabel>
              <Input
                id="first-name"
                placeholder="John"
                value={formData.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                aria-invalid={!!errors.firstName}
                className="border-gray-300"
              />
              {errors.firstName && <FieldError>{errors.firstName}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.lastName}>
              <FieldLabel htmlFor="last-name" className="text-[#09294E] font-semibold text-lg">
                Last Name
              </FieldLabel>
              <Input
                id="last-name"
                placeholder="Doe"
                value={formData.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
                aria-invalid={!!errors.lastName}
                className="border-gray-300"
              />
              {errors.lastName && <FieldError>{errors.lastName}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.phoneNumber}>
              <FieldLabel htmlFor="phone-number" className="text-[#09294E] font-semibold text-lg">
                Phone Number
              </FieldLabel>
              <Input
                id="phone-number"
                placeholder="123-456-7890"
                value={formData.phoneNumber}
                onChange={(e) => updateField("phoneNumber", e.target.value)}
                aria-invalid={!!errors.phoneNumber}
                className="border-gray-300"
              />
              {errors.phoneNumber && (
                <FieldError>{errors.phoneNumber}</FieldError>
              )}
            </Field>

            <Field data-invalid={!!errors.contactPreference}>
              <FieldLabel htmlFor="contact-preference" className="text-[#09294E] font-semibold text-lg">
                Contact Method
              </FieldLabel>
              <Select
                value={formData.contactPreference}
                onValueChange={(value: "call" | "text") =>
                  updateField("contactPreference", value)
                }
              >
                <SelectTrigger id="contact-preference" className="border-gray-300">
                  <SelectValue placeholder="Select your preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
              {errors.contactPreference && (
                <FieldError>{errors.contactPreference}</FieldError>
              )}
            </Field>
          </div>

          {errors.submit && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <FieldError className="text-red-600">{errors.submit}</FieldError>
            </div>
          )}

          <div className="mt-8 flex justify-center gap-4">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-[#09294E] text-white px-8 py-2 rounded-lg hover:bg-[#0a1f38]"
            >
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </FieldSet>
      </FieldGroup>
    </form>
  );
}
