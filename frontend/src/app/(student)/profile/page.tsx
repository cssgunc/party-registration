"use client";

import AddressSearch from "@/components/AddressSearch";
import { SubmitButton } from "@/components/form/SubmitButton";
import { PhoneField, SelectField } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldGroup, FieldSet } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useSnackbar } from "@/contexts/SnackbarContext";
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
  getAcademicYearLabels,
  isFromThisSchoolYear,
  phoneNumberSchema,
} from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Pencil, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

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

function ProfileField({
  label,
  value,
  isLoading,
  className = "flex-1 min-w-50",
}: {
  label: string;
  value: React.ReactNode;
  isLoading: boolean;
  className?: string;
}) {
  return (
    <div className={cn(!isLoading && "", className)}>
      <p className="subhead-content mb-1">{label}</p>
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
      <TriangleAlert className="w-4 h-4 content-sub translate-y-0.5" />
      <p className="content-sub italic flex-1">{children}</p>
    </div>
  );
}

function StudentInfo() {
  const { data: student, isLoading, error } = useCurrentStudent();
  const updateStudentMutation = useUpdateStudent();
  const updateResidenceMutation = useUpdateResidence();
  const { openSnackbar } = useSnackbar();
  const [isEditing, setIsEditing] = useState(false);
  const [locationPlaceId, setLocationPlaceId] = useState("");
  const [formattedAddress, setFormattedAddress] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<StudentInfoValues>({
    resolver: zodResolver(studentInfoSchema),
    mode: "onBlur",
    defaultValues: {
      first_name: "",
      last_name: "",
      phone_number: "",
      contact_preference: "text",
      address: "",
    },
  });
  const isSubmitting = form.formState.isSubmitting;

  const startEditing = () => {
    if (student) form.reset(mapStudentToFormData(student));
    setLocationPlaceId("");
    setFormattedAddress("");
    setSubmitError(null);
    setIsEditing(true);
  };

  const handleValid = async (data: StudentInfoValues) => {
    setSubmitError(null);
    if (!student) {
      setSubmitError("Student data not loaded");
      return;
    }

    const studentFieldsChanged =
      data.phone_number !== student.phone_number ||
      data.contact_preference !== student.contact_preference;

    const residenceChanged = !!locationPlaceId;

    try {
      if (studentFieldsChanged) {
        await updateStudentMutation.mutateAsync({
          phone_number: data.phone_number,
          contact_preference: data.contact_preference,
          last_registered: student.last_registered,
        });
      }

      if (residenceChanged && locationPlaceId) {
        await updateResidenceMutation.mutateAsync({
          residence_place_id: locationPlaceId,
          formatted_address: formattedAddress || "",
        });
      }

      openSnackbar("Profile updated successfully", "success");
      setLocationPlaceId("");
      setIsEditing(false);
    } catch (error) {
      setSubmitError(
        getErrorMessage(error, {
          status: {
            409: "That phone number is already in use.",
            400: "You've already set your residence for this academic year.",
          },
          fallback: "Failed to update your profile. Please try again.",
        })
      );
    }
  };

  const displayData = {
    first_name: student?.first_name ?? "",
    last_name: student?.last_name ?? "",
    phone_number: student?.phone_number ?? "",
    contact_preference: student?.contact_preference ?? undefined,
  };
  const { schoolYear, changeDate } = getAcademicYearLabels();

  const validAddress = isFromThisSchoolYear(
    student?.residence?.residence_chosen_date
  );

  if (!isEditing) {
    return (
      <div className="bg-card rounded-lg p-8 w-full flex flex-col">
        <div className="flex justify-between items-center">
          <h1 className="page-title">Profile</h1>
          {!error && (
            <Button
              variant="ghost"
              size="icon"
              onClick={startEditing}
              aria-label="Edit profile"
              disabled={isLoading || !student}
            >
              <Pencil className="size-5" />
            </Button>
          )}
        </div>

        {error && !student ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-destructive py-8">
            <p className="font-semibold mb-2">Error loading profile</p>
            <p className="text-sm">Please try again later.</p>
          </div>
        ) : (
          <div className="mt-6 mb-8">
            <div className="flex flex-wrap gap-x-12 gap-y-6 mb-4">
              <ProfileField
                label="First Name"
                value={displayData.first_name}
                isLoading={isLoading}
              />
              <ProfileField
                label="Last Name"
                value={displayData.last_name}
                isLoading={isLoading}
              />
              <ProfileField
                label="Phone Number"
                value={formatPhoneNumber(displayData.phone_number) || "—"}
                isLoading={isLoading}
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
              />
            </div>
            <ProfileField
              label={`${schoolYear} Address`}
              value={student?.residence?.location.formatted_address ?? "None"}
              isLoading={isLoading}
              className="mt-6"
            />
          </div>
        )}

        <div className="flex justify-center">
          <Button variant="default">Log Out</Button>
        </div>
      </div>
    );
  }

  const handleCancel = () => {
    if (student) form.reset(mapStudentToFormData(student));
    setLocationPlaceId("");
    setFormattedAddress("");
    setSubmitError(null);
    setIsEditing(false);
  };

  const handleAddressSelect = (address: AutocompleteResult | null) => {
    setLocationPlaceId(address?.google_place_id || "");
    setFormattedAddress(address?.formatted_address || "");
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleValid)}
        className="bg-card rounded-lg w-full p-8"
      >
        <div className="mb-6">
          <h1 className="page-title">Edit Profile Information</h1>
        </div>
        <FieldGroup>
          <FieldSet className="rounded-lg w-full flex flex-col">
            <div>
              <div className="mb-6">
                <div className="flex flex-wrap gap-x-12 gap-y-2 mb-2">
                  <ProfileField
                    label="First Name"
                    value={displayData.first_name}
                    isLoading={false}
                  />

                  <ProfileField
                    label="Last Name"
                    value={displayData.last_name}
                    isLoading={false}
                  />
                </div>
                <WarningNote>
                  Your name is associated with your Onyen
                </WarningNote>
              </div>

              <div className="flex flex-wrap gap-x-12 gap-y-4">
                <PhoneField
                  control={form.control}
                  name="phone_number"
                  label="Phone Number"
                  labelClassName="subhead-content"
                  inputClassName="content"
                  className="flex-1 min-w-50"
                />

                <SelectField
                  control={form.control}
                  name="contact_preference"
                  label="Contact Method"
                  labelClassName="subhead-content"
                  triggerClassName="content"
                  itemClassName="content"
                  placeholder="Select your preference"
                  className="flex-1 min-w-50"
                  options={[
                    { value: "call", label: "Call" },
                    { value: "text", label: "Text" },
                  ]}
                />
                {!validAddress && (
                  <div className="basis-full flex flex-col gap-2">
                    <p className="subhead-content">{schoolYear} Address</p>
                    <AddressSearch
                      onSelect={handleAddressSelect}
                      placeholder="Search for the location address..."
                      className="w-full"
                      chapelHillOnly
                    />
                  </div>
                )}
              </div>

              {validAddress && (
                <div className="mt-6">
                  <p className="subhead-content mb-1">{schoolYear} Address</p>
                  <p className="content mb-2">
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
            </div>

            {submitError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md text-center">
                <p className="text-sm text-red-600">{submitError}</p>
              </div>
            )}

            <div className="flex justify-center gap-12">
              <Button type="button" onClick={handleCancel}>
                Cancel
              </Button>
              <SubmitButton
                pending={isSubmitting}
                label="Save"
                pendingLabel="Saving..."
              />
            </div>
          </FieldSet>
        </FieldGroup>
      </form>
    </Form>
  );
}

export default function StudentProfilePage() {
  return (
    <div className="flex flex-col items-center h-full overflow-y-auto">
      <div className="w-5/6 mx-4 my-4 max-w-2xl flex flex-col">
        <nav className="flex items-center content pb-2">
          <ArrowLeft className="h-4" />
          <Link href="/">Back</Link>
        </nav>
        <Card className="max-w-4xl mt-2 w-full border">
          <StudentInfo />
        </Card>
      </div>
    </div>
  );
}
