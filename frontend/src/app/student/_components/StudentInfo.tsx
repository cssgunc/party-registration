"use client";
import AddressSearch from "@/components/AddressSearch";
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
import { LocationService } from "@/lib/api/location/location.service";
import { AutocompleteResult } from "@/lib/api/location/location.types";
import {
  useUpdateResidence,
  useUpdateStudent,
} from "@/lib/api/student/student.queries";
import { StudentDto } from "@/lib/api/student/student.types";
import {
  formatPhoneNumber,
  formatPhoneNumberInput,
  isFromThisSchoolYear,
  phoneNumberSchema,
} from "@/lib/utils";
import { ArrowLeft, Pencil, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import * as z from "zod";

const locationService = new LocationService();

const studentInfoSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  phone_number: phoneNumberSchema,
  contact_preference: z.enum(["call", "text"], {
    message: "Please select a contact preference",
  }),
  address: z.string().optional(),
});

// Grab the type of the form data from the schema so we can use it in the component
type StudentInfoValues = z.infer<typeof studentInfoSchema>;

interface StudentInfoFormData extends StudentInfoValues {
  location_place_id?: string;
  formatted_address?: string;
}

interface StudentInfoProps {
  initialData: StudentDto;
}

export default function StudentInfo({ initialData }: StudentInfoProps) {
  const updateStudentMutation = useUpdateStudent();
  const updateResidenceMutation = useUpdateResidence();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<StudentInfoFormData>({
    first_name: initialData.first_name,
    last_name: initialData.last_name,
    phone_number: initialData.phone_number,
    contact_preference: initialData.contact_preference,
    address: initialData.residence?.location.formatted_address ?? "",
    location_place_id: "",
    formatted_address: initialData.residence?.location.formatted_address ?? "",
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
      const studentFieldsChanged =
        formData.phone_number !== initialData.phone_number ||
        formData.contact_preference !== initialData.contact_preference;

      const residenceChanged = !!formData.location_place_id;

      if (studentFieldsChanged) {
        await updateStudentMutation.mutateAsync({
          phone_number: result.data.phone_number,
          contact_preference: result.data.contact_preference,
          last_registered: initialData.last_registered,
        });
      }

      if (residenceChanged && formData.location_place_id) {
        await updateResidenceMutation.mutateAsync({
          residence_place_id: formData.location_place_id,
          formatted_address: formData.formatted_address || "",
        });
      }

      // Update formData with the submitted values to reflect in display
      setFormData((prev) => ({
        ...prev,
        location_place_id: "",
        formatted_address: prev.formatted_address,
      }));

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

  const updateField = <K extends keyof StudentInfoFormData>(
    field: K,
    value: StudentInfoFormData[K]
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

  const currentDate = new Date();
  let school_year = "";
  let change_date = "";
  if (currentDate < new Date("08-01")) {
    school_year =
      currentDate.getFullYear() + "-" + (currentDate.getFullYear() + 1);
    change_date = "August 1, " + (currentDate.getFullYear() + 1);
  } else {
    school_year =
      currentDate.getFullYear() - 1 + "-" + currentDate.getFullYear();
    change_date = "August 1, " + currentDate.getFullYear();
  }

  const validAddress = isFromThisSchoolYear(
    initialData.residence?.residence_chosen_date
  );
  if (!isEditing) {
    return (
      <div className="bg-card rounded-lg p-6 sm:px-10 sm:py-8 w-full flex flex-col">
        <div className="relative flex justify-center mb-6">
          <div className="absolute left-0 flex items-center gap-2">
            <ArrowLeft className="h-4" />
            <Link href="/student">Back</Link>
          </div>
          <h1 className="page-title">Profile</h1>
          <button
            onClick={() => setIsEditing(true)}
            className="absolute right-0 bg-transparent"
            aria-label="Edit profile"
          >
            <Pencil className=" content cursor-pointer" />
          </button>
        </div>

        <section>
          <div className="my-4 sm:my-8 sm:grid sm:grid-cols-2 sm:gap-y-2 sm:gap-x-12">
            <div className="sm:mt-0">
              <p className="subhead-content mb-2">First Name</p>
              <p className="content">{displayData.first_name}</p>
            </div>

            <div className="mt-3 sm:mt-0 ">
              <p className="subhead-content mb-2">Last Name</p>
              <p className="content">{displayData.last_name}</p>
            </div>

            <div className="mt-3 sm:mt-6 ">
              <p className="subhead-content mb-2">Phone Number</p>
              <p className="content">
                {formatPhoneNumber(displayData.phone_number)}
              </p>
            </div>

            <div className="mt-3 sm:mt-6 ">
              <p className="subhead-content mb-2">Contact Method</p>
              <p className="content">
                {displayData.contact_preference
                  ? displayData.contact_preference.charAt(0).toUpperCase() +
                    displayData.contact_preference.slice(1)
                  : "Not set"}
              </p>
            </div>
          </div>
          <div className="mt-3 mb-4 sm:mt-6 ">
            <p className="subhead-content mb-2">{school_year} Address</p>
            <p className="content">
              {initialData.residence?.location.formatted_address ?? "None"}
            </p>
          </div>
        </section>

        <section className="sm:mb-4 pt-8 flex justify-center">
          <Button variant="default">Log Out</Button>
        </section>
      </div>
    );
  }

  const handleAddressSelect = (address: AutocompleteResult | null) => {
    setFormData((prev) => ({
      ...prev,
      location_place_id: address?.google_place_id || "",
      formatted_address: address?.formatted_address || "",
    }));
    if (errors.location_place_id) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.location_place_id;
        return newErrors;
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card rounded-lg w-full p-6 sm:p-10"
    >
      <div className="relative flex justify-center mb-6">
        <div className="absolute left-0 flex items-center gap-2">
          <ArrowLeft className="h-4" />
          <Link href="/student">Back</Link>
        </div>
        <h1 className="page-title">Edit Profile Information</h1>
      </div>
      <FieldGroup>
        <FieldSet className="rounded-lg w-full flex flex-col sm:py-4">
          <section>
            <div className="mb-2 sm:mb-3 sm:mt-1.5">
              <div className="grid grid-cols-2 gap-12">
                <div>
                  <p className="subhead-content mb-2">First Name</p>
                  <p className="content pb-2">{displayData.first_name}</p>
                </div>

                <div>
                  <p className="subhead-content mb-2">Last Name</p>
                  <p className="content pb-2">{displayData.last_name}</p>
                </div>
              </div>
              <div className="flex flex-row gap-2">
                <TriangleAlert className="w-4 h-4 content" />
                <p className="content-sub italic flex-1">
                  Your name is associated with your Onyen
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12">
              <Field data-invalid={!!errors.phone_number} className="">
                <FieldLabel htmlFor="phone-number" className="subhead-content">
                  Phone Number
                </FieldLabel>
                <Input
                  id="phone-number"
                  type="tel"
                  placeholder="(123) 456-7890"
                  value={formatPhoneNumberInput(formData.phone_number)}
                  onChange={(e) =>
                    updateField(
                      "phone_number",
                      e.target.value.replace(/\D/g, "").slice(0, 10)
                    )
                  }
                  aria-invalid={!!errors.phone_number}
                  className="content"
                />
                {errors.phone_number && (
                  <FieldError>{errors.phone_number}</FieldError>
                )}
              </Field>

              <Field data-invalid={!!errors.contact_preference} className="">
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
                    <SelectItem value="call" className="content">
                      Call
                    </SelectItem>
                    <SelectItem value="text" className="content">
                      Text
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.contact_preference && (
                  <FieldError>{errors.contact_preference}</FieldError>
                )}
              </Field>
              {!validAddress && (
                <Field data-invalid={!!errors.address} className="mb-2">
                  <FieldLabel htmlFor="address" className="subhead-content">
                    {school_year} Address
                  </FieldLabel>
                  <AddressSearch
                    onSelect={handleAddressSelect}
                    locationService={locationService}
                    placeholder="Search for the location address..."
                    className="w-full"
                    error={errors.location_place_id}
                    chapelHillOnly
                  />
                  {errors.address && <FieldError>{errors.address}</FieldError>}
                </Field>
              )}
            </div>

            {validAddress && (
              <div className="col-span-2 mt-6">
                <p className="subhead-content mt-3 sm:mt-0">
                  {school_year} Address
                </p>
                <p className="content my-2">
                  {initialData.residence?.location.formatted_address}
                </p>

                <div className="flex flex-row mt-3 gap-2">
                  <TriangleAlert className="w-4 h-4 content" />
                  <p className="content-sub italic flex-1">
                    You cannot change your address until {change_date}. If you
                    are experiencing hardship, contact [email] for changes
                  </p>
                </div>
              </div>
            )}
          </section>

          {errors.submit && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-center">
              <FieldError className="text-red-600">{errors.submit}</FieldError>
            </div>
          )}

          <div className="flex justify-center gap-12">
            <Button type="reset" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </FieldSet>
      </FieldGroup>
    </form>
  );
}
