"use client";

import AddressSearch from "@/components/AddressSearch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { LocationService } from "@/lib/api/location/location.service";
import { AutocompleteResult } from "@/lib/api/location/location.types";
import {
  useCurrentStudent,
  useUpdateResidence,
  useUpdateStudent,
} from "@/lib/api/student/student.queries";
import { StudentDto } from "@/lib/api/student/student.types";
import { clientEnv } from "@/lib/config/env.client";
import { getErrorMessage } from "@/lib/errors";
import {
  cn,
  formatPhoneNumber,
  formatPhoneNumberInput,
  getAcademicYearLabels,
  isFromThisSchoolYear,
  phoneNumberSchema,
} from "@/lib/utils";
import { ArrowLeft, Pencil, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
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

type StudentInfoValues = z.infer<typeof studentInfoSchema>;

const mapStudentToFormData = (student: StudentDto): StudentInfoValues => ({
  first_name: student.first_name,
  last_name: student.last_name,
  phone_number: student.phone_number ?? "",
  contact_preference: student.contact_preference ?? "text",
  address: student.residence?.location.formatted_address ?? "",
});

interface StudentInfoFormData extends StudentInfoValues {
  location_place_id?: string;
  formatted_address?: string;
}

function ProfileField({
  label,
  value,
  isLoading,
  className,
}: {
  label: string;
  value: React.ReactNode;
  isLoading: boolean;
  className?: string;
}) {
  return (
    <div className={cn(!isLoading && "border-b", className)}>
      <p className="subhead-content mb-2">{label}</p>
      {isLoading ? (
        <Skeleton className="h-6 w-full" />
      ) : (
        <p className="content">{value}</p>
      )}
    </div>
  );
}

function WarningNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-row gap-2">
      <TriangleAlert className="w-4 h-4 content" />
      <p className="content-sub italic flex-1">{children}</p>
    </div>
  );
}

function StudentInfo() {
  const { data: student, isLoading, error } = useCurrentStudent();
  const updateStudentMutation = useUpdateStudent();
  const updateResidenceMutation = useUpdateResidence();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<StudentInfoFormData>({
    first_name: "",
    last_name: "",
    phone_number: "",
    contact_preference: "text",
    address: "",
    location_place_id: "",
    formatted_address: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (student && !isEditing) {
      setFormData(mapStudentToFormData(student));
    }
  }, [student, isEditing]);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    const result = studentInfoSchema.safeParse(formData);

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
      if (!student) {
        throw new Error("Student data not loaded");
      }

      const studentFieldsChanged =
        formData.phone_number !== student.phone_number ||
        formData.contact_preference !== student.contact_preference;

      const residenceChanged = !!formData.location_place_id;

      if (studentFieldsChanged) {
        await updateStudentMutation.mutateAsync({
          phone_number: result.data.phone_number,
          contact_preference: result.data.contact_preference,
          last_registered: student.last_registered,
        });
      }

      if (residenceChanged && formData.location_place_id) {
        await updateResidenceMutation.mutateAsync({
          residence_place_id: formData.location_place_id,
          formatted_address: formData.formatted_address || "",
        });
      }

      setFormData((prev) => ({
        ...prev,
        location_place_id: "",
        formatted_address: prev.formatted_address,
      }));

      setIsEditing(false);
    } catch (error) {
      setErrors({ submit: getErrorMessage(error) });
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
    first_name: formData.first_name ?? student?.first_name ?? "",
    last_name: formData.last_name ?? student?.last_name ?? "",
    phone_number: formData.phone_number ?? student?.phone_number ?? "",
    contact_preference:
      formData.contact_preference ?? student?.contact_preference ?? undefined,
  };
  const { schoolYear, changeDate } = getAcademicYearLabels();

  const validAddress = isFromThisSchoolYear(
    student?.residence?.residence_chosen_date
  );

  if (!isEditing) {
    return (
      <div className="bg-card rounded-lg p-8 w-full flex flex-col">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="page-title">Profile</h1>
          {!error && (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-transparent"
              aria-label="Edit profile"
              disabled={isLoading || !student}
            >
              <Pencil className="content cursor-pointer" />
            </button>
          )}
        </div>

        {error && !student ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-destructive py-8">
            <p className="font-semibold mb-2">Error loading profile</p>
            <p className="text-sm">Please try again later.</p>
          </div>
        ) : (
          <section>
            <div className="flex flex-wrap gap-x-12 gap-y-6 mb-4">
              <ProfileField
                label="First Name"
                value={displayData.first_name}
                isLoading={isLoading}
                className="flex-1 min-w-50"
              />
              <ProfileField
                label="Last Name"
                value={displayData.last_name}
                isLoading={isLoading}
                className="flex-1 min-w-50"
              />
              <ProfileField
                label="Phone Number"
                value={formatPhoneNumber(displayData.phone_number) || "—"}
                isLoading={isLoading}
                className="flex-1 min-w-50"
              />
              <ProfileField
                label="Contact Method"
                value={
                  displayData.contact_preference
                    ? displayData.contact_preference.charAt(0).toUpperCase() +
                      displayData.contact_preference.slice(1)
                    : "—"
                }
                isLoading={isLoading}
                className="flex-1 min-w-50"
              />
            </div>
            <ProfileField
              label={`${schoolYear} Address`}
              value={student?.residence?.location.formatted_address ?? "None"}
              isLoading={isLoading}
              className="my-6"
            />
          </section>
        )}

        <section className="flex justify-center">
          <Button variant="default">Log Out</Button>
        </section>
      </div>
    );
  }

  const handleCancel = () => {
    setFormData({
      first_name: student?.first_name ?? "",
      last_name: student?.last_name ?? "",
      phone_number: student?.phone_number ?? "",
      contact_preference: student?.contact_preference ?? "call",
      address: student?.residence?.location.formatted_address ?? "",
      location_place_id: "",
      formatted_address: student?.residence?.location.formatted_address ?? "",
    });
    setErrors({});
    setIsEditing(false);
  };

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
    <form onSubmit={handleSubmit} className="bg-card rounded-lg w-full p-8">
      <div className="mb-6">
        <h1 className="page-title">Edit Profile Information</h1>
      </div>
      <FieldGroup>
        <FieldSet className="rounded-lg w-full flex flex-col">
          <section>
            <div className="mb-3">
              <div className="flex flex-wrap gap-x-12 gap-y-2">
                <div className="flex-1 min-w-50">
                  <p className="subhead-content mb-2">First Name</p>
                  <p className="content pb-2">{displayData.first_name}</p>
                </div>

                <div className="flex-1 min-w-50">
                  <p className="subhead-content mb-2">Last Name</p>
                  <p className="content pb-2">{displayData.last_name}</p>
                </div>
              </div>
              <WarningNote>Your name is associated with your Onyen</WarningNote>
            </div>

            <div className="flex flex-wrap gap-x-12 gap-y-4">
              <Field
                data-invalid={!!errors.phone_number}
                className="flex-1 min-w-50"
              >
                <FieldLabel htmlFor="phone-number" className="subhead-content">
                  Phone Number
                </FieldLabel>
                <Input
                  id="phone-number"
                  type="tel"
                  placeholder="(123) 456-7890"
                  value={formatPhoneNumberInput(formData.phone_number ?? "")}
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

              <Field
                data-invalid={!!errors.contact_preference}
                className="flex-1 min-w-50"
              >
                <FieldLabel
                  htmlFor="contact-preference"
                  className="subhead-content"
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
                <Field
                  data-invalid={!!errors.location_place_id}
                  className="basis-full"
                >
                  <FieldLabel htmlFor="address" className="subhead-content">
                    {schoolYear} Address
                  </FieldLabel>
                  <AddressSearch
                    onSelect={handleAddressSelect}
                    locationService={locationService}
                    placeholder="Search for the location address..."
                    className="w-full"
                    error={errors.location_place_id}
                    chapelHillOnly
                  />
                  {errors.location_place_id && (
                    <FieldError>{errors.location_place_id}</FieldError>
                  )}
                </Field>
              )}
            </div>

            {validAddress && (
              <div className="mt-6">
                <p className="subhead-content">{schoolYear} Address</p>
                <p className="content my-2">
                  {student?.residence?.location.formatted_address}
                </p>

                <WarningNote>
                  You cannot change your address until {changeDate}. For
                  extraneous circumstances, contact{" "}
                  <a
                    href={`mailto:${clientEnv.NEXT_PUBLIC_CONTACT_EMAIL}`}
                    className="underline"
                  >
                    {clientEnv.NEXT_PUBLIC_CONTACT_EMAIL}
                  </a>{" "}
                </WarningNote>
              </div>
            )}
          </section>

          {errors.submit && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-center">
              <FieldError className="text-red-600">{errors.submit}</FieldError>
            </div>
          )}

          <div className="flex justify-center gap-12">
            <Button type="button" onClick={handleCancel}>
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

export default function StudentProfilePage() {
  return (
    <div className="flex flex-col items-center h-full overflow-y-auto">
      <main className="w-5/6 mx-4 my-4 max-w-2xl flex flex-col">
        <nav className="flex items-center content pb-2">
          <ArrowLeft className="h-4" />
          <Link href="/">Back</Link>
        </nav>
        <Card className="max-w-4xl mt-2 w-full border">
          <StudentInfo />
        </Card>
      </main>
    </div>
  );
}
