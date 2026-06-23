"use client";

import { SubmitButton } from "@/components/form/SubmitButton";
import {
  AddressField,
  DateField,
  PhoneField,
  SelectField,
  TextField,
} from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { AutocompleteResult } from "@/lib/api/location/location.types";
import {
  PARTY_RULE_MESSAGES,
  StudentCreatePartyDto,
} from "@/lib/api/party/party.types";
import { StudentSelfDto } from "@/lib/api/student/student.types";
import { clientEnv } from "@/lib/config/env.client";
import {
  cn,
  formatContactPreference,
  formatPhoneNumberInput,
  getAcademicYearLabels,
  isFromThisSchoolYear,
  phoneNumberSchema,
} from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, addHours, isAfter, set, startOfDay } from "date-fns";
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const partyDateNotTooFar = (date: Date) =>
  !isAfter(
    startOfDay(date),
    addDays(startOfDay(new Date()), clientEnv.NEXT_PUBLIC_PARTY_MAX_LEAD_DAYS)
  );

const partyFormBaseSchema = z.object({
  location: z.object(
    {
      formatted_address: z.string(),
      google_place_id: z.string(),
    },
    { message: "Please select an address from the dropdown" }
  ),
  partyDate: z
    .date({ message: "Party date is required" })
    .refine(partyDateNotTooFar, PARTY_RULE_MESSAGES.PARTY_DATE_TOO_FAR),
  partyTime: z.string().min(1, "Party time is required"),
  secondContactFirstName: z.string().min(1, "First name is required"),
  secondContactLastName: z.string().min(1, "Last name is required"),
  phoneNumber: phoneNumberSchema,
  contactPreference: z.enum(["call", "text"], {
    message: "Please select a contact preference",
  }),
  contactTwoEmail: z
    .email({ pattern: z.regexes.html5Email })
    .min(1, "Contact email is required")
    .refine((v) => v.toLowerCase().endsWith("@unc.edu"), {
      message: "Contact two email must be a UNC email address (@unc.edu)",
    }),
  studentPhoneNumber: phoneNumberSchema,
  studentContactPreference: z.enum(["call", "text"], {
    message: "Please select a contact preference",
  }),
  studentEmail: z.string(),
});

type PartyFormValues = z.infer<typeof partyFormBaseSchema>;

const refinePartyDatetimeNotTooSoon = (
  data: PartyFormValues,
  ctx: z.RefinementCtx
) => {
  if (!data.partyDate || !data.partyTime) return;
  const [hours, minutes] = data.partyTime.split(":").map(Number);
  const partyDatetime = set(data.partyDate, {
    hours,
    minutes,
    seconds: 0,
    milliseconds: 0,
  });
  if (
    !isAfter(
      partyDatetime,
      addHours(new Date(), clientEnv.NEXT_PUBLIC_PARTY_MIN_LEAD_HOURS)
    )
  ) {
    ctx.addIssue({
      code: "custom",
      message: PARTY_RULE_MESSAGES.PARTY_DATE_TOO_SOON,
      path: ["partyTime"],
    });
  }
};

const refineContactTwoEmailDiffers = (
  data: PartyFormValues,
  ctx: z.RefinementCtx
) => {
  if (!data.studentEmail) return;
  if (
    data.contactTwoEmail.trim().toLowerCase() ===
    data.studentEmail.trim().toLowerCase()
  ) {
    ctx.addIssue({
      code: "custom",
      message: PARTY_RULE_MESSAGES.CONTACT_TWO_EMAIL_MATCHES_CONTACT_ONE,
      path: ["contactTwoEmail"],
    });
  }
};

const refineContactTwoPhoneDiffers = (
  data: PartyFormValues,
  ctx: z.RefinementCtx
) => {
  if (!data.studentPhoneNumber || !data.phoneNumber) return;
  if (data.studentPhoneNumber === data.phoneNumber) {
    ctx.addIssue({
      code: "custom",
      message: PARTY_RULE_MESSAGES.CONTACT_TWO_PHONE_MATCHES_CONTACT_ONE,
      path: ["phoneNumber"],
    });
  }
};

const partyFormSchema = partyFormBaseSchema
  .superRefine(refinePartyDatetimeNotTooSoon)
  .superRefine(refineContactTwoEmailDiffers)
  .superRefine(refineContactTwoPhoneDiffers);

export { partyFormSchema };
export type { PartyFormValues };

/**
 * Convert validated party form values into the `StudentCreatePartyDto` shape
 * expected by the backend, combining the date and time fields into a single
 * `party_datetime`.
 */
export const partyFormValuesToDto = (
  values: PartyFormValues
): StudentCreatePartyDto => {
  const [hours, minutes] = values.partyTime.split(":");
  const partyDateTime = new Date(values.partyDate);
  partyDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  return {
    type: "student",
    party_datetime: partyDateTime,
    google_place_id: values.location.google_place_id,
    contact_two: {
      email: values.contactTwoEmail,
      first_name: values.secondContactFirstName,
      last_name: values.secondContactLastName,
      phone_number: values.phoneNumber,
      contact_preference: values.contactPreference,
    },
  };
};

/**
 * Initial values that can be passed to prefill the form
 */
export interface PartyFormInitialValues {
  location?: AutocompleteResult;
  partyDate?: Date;
  partyTime?: string;
  secondContactFirstName?: string;
  secondContactLastName?: string;
  phoneNumber?: string;
  contactPreference?: "call" | "text";
  contactTwoEmail?: string;
}

interface PartyRegistrationFormProps {
  onSubmit: (data: PartyFormValues) => void | Promise<void>;
  initialValues?: PartyFormInitialValues;
  /** The authenticated student */
  student?: StudentSelfDto | null;
  /** Whether this form is used for creating or editing a party */
  mode?: "create" | "edit";
  /** Server-side validation message to surface as a banner above the submit button. */
  submissionError?: string | null;
}

// Default party time (e.g., 8:00 PM)
const DEFAULT_PARTY_TIME = "20:00";
const DEFAULT_CONTACT_PREFERENCE: "call" | "text" = "text";

/**
 * The main party registration form used by students to register or edit a
 * party, collecting the event date/time, address, student contact info, and a
 * required second contact.
 *
 * The address field is pre-filled with the student's current-year residence
 * (checked via `isFromThisSchoolYear`) and locked with a confirmation dialog
 * when the student tries to change it, since updating the address also updates
 * their on-file residence for the academic year.
 */
export default function PartyRegistrationForm({
  onSubmit,
  initialValues,
  student,
  submissionError,
}: PartyRegistrationFormProps) {
  const form = useForm<PartyFormValues>({
    resolver: zodResolver(partyFormSchema),
    mode: "onBlur",
    defaultValues: {
      location:
        initialValues?.location ??
        (student?.residence &&
        isFromThisSchoolYear(student.residence.residence_chosen_date)
          ? {
              formatted_address: student.residence.location.formatted_address,
              google_place_id: student.residence.location.google_place_id,
            }
          : undefined),
      partyDate: initialValues?.partyDate ?? undefined,
      partyTime: initialValues?.partyTime ?? DEFAULT_PARTY_TIME,
      phoneNumber: initialValues?.phoneNumber ?? "",
      secondContactFirstName: initialValues?.secondContactFirstName ?? "",
      secondContactLastName: initialValues?.secondContactLastName ?? "",
      contactPreference:
        initialValues?.contactPreference ?? DEFAULT_CONTACT_PREFERENCE,
      contactTwoEmail: initialValues?.contactTwoEmail ?? "",
      studentPhoneNumber: student?.phone_number ?? "",
      studentContactPreference: student?.contact_preference ?? undefined,
      studentEmail: student?.email ?? "",
    },
  });

  // When student data arrives after the first render, sync their existing
  // contact info and residence into the form so Zod validation passes naturally.
  useEffect(() => {
    if (!student) return;

    const residence = student.residence;
    const residenceLocation =
      !initialValues?.location &&
      residence &&
      isFromThisSchoolYear(residence.residence_chosen_date)
        ? {
            formatted_address: residence.location.formatted_address,
            google_place_id: residence.location.google_place_id,
          }
        : undefined;

    form.reset(
      (values) => ({
        ...values,
        studentPhoneNumber:
          values.studentPhoneNumber || student.phone_number || "",
        studentContactPreference:
          values.studentContactPreference ??
          student.contact_preference ??
          undefined,
        studentEmail: values.studentEmail || student.email || "",
        location: values.location ?? residenceLocation,
      }),
      { keepErrors: true, keepDirty: true, keepTouched: true }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student, initialValues?.location?.google_place_id]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddressConfirmation, setShowAddressConfirmation] = useState(false);

  const pendingSubmitRef = useRef<PartyFormValues | null>(null);

  const handleValid = async (data: PartyFormValues) => {
    const baselineGooglePlaceId =
      initialValues?.location?.google_place_id ??
      (validResidence ? student?.residence?.location.google_place_id : null);
    const locationChanged =
      !baselineGooglePlaceId ||
      data.location.google_place_id !== baselineGooglePlaceId;

    if (locationChanged) {
      pendingSubmitRef.current = data;
      setShowAddressConfirmation(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const { schoolYear, changeDate } = getAcademicYearLabels();

  const validResidence = isFromThisSchoolYear(
    student?.residence?.residence_chosen_date
  );
  const isStudentLoading = student === undefined;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleValid)}>
        <FieldGroup>
          <FieldSet>
            <div className="flex flex-col gap-4 lg:gap-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:gap-8">
                <DateField
                  control={form.control}
                  name="partyDate"
                  label="Party Date"
                  labelClassName="content-bold"
                  inputClassName="content"
                  forwardDate={true}
                  description={`Must be at least ${clientEnv.NEXT_PUBLIC_PARTY_MIN_LEAD_HOURS} hours in advance, and no more than ${clientEnv.NEXT_PUBLIC_PARTY_MAX_LEAD_DAYS} days out`}
                  disabled={(date) =>
                    !isAfter(startOfDay(date), startOfDay(new Date())) ||
                    !partyDateNotTooFar(date)
                  }
                />

                <TextField
                  control={form.control}
                  name="partyTime"
                  label="Party Time"
                  labelClassName="content-bold"
                  inputClassName="content"
                  type="time"
                />
              </div>

              <StudentInfoField
                label="Party Address"
                value={
                  validResidence
                    ? student?.residence?.location.formatted_address
                    : undefined
                }
                isLoading={isStudentLoading}
                fieldClassName="col-span-2"
                skeletonClassName="h-10 w-full"
                description={
                  validResidence ? (
                    <p className="content-sub italic">
                      You cannot change your address until {changeDate}. For
                      extraneous circumstances, contact{" "}
                      <a
                        href={`mailto:${clientEnv.NEXT_PUBLIC_CONTACT_EMAIL}`}
                        className="underline"
                      >
                        {clientEnv.NEXT_PUBLIC_CONTACT_EMAIL}
                      </a>{" "}
                    </p>
                  ) : undefined
                }
                editField={
                  <AddressField
                    control={form.control}
                    name="location"
                    label="Party Address"
                    labelClassName="content-bold"
                    inputClassName="content"
                    placeholder="Search for the party address..."
                    initialSelection={initialValues?.location}
                    value={form.watch("location")?.formatted_address}
                    getStoredValue={(address) => address ?? undefined}
                    chapelHillOnly
                    descriptionClassName="content-sub italic ml-1 -mt-2"
                    description={
                      <>
                        This will be added to your profile as your {schoolYear}{" "}
                        location. You may change it after {changeDate}.
                      </>
                    }
                  />
                }
              />
            </div>

            <div className="flex flex-col gap-4 lg:gap-6">
              <div className="flex flex-col gap-1">
                <h2 className="subhead-content">Your Contact Information</h2>
                <p className="content-sub italic">
                  {student?.phone_number != null
                    ? "You can edit preferences in your Profile Information."
                    : "Please provide your contact information to complete registration."}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                <StudentInfoField
                  label="First Name"
                  value={student?.first_name}
                  isLoading={isStudentLoading}
                />
                <StudentInfoField
                  label="Last Name"
                  value={student?.last_name}
                  isLoading={isStudentLoading}
                />
                <StudentInfoField
                  label="Phone Number"
                  value={
                    student?.phone_number != null
                      ? formatPhoneNumberInput(student.phone_number)
                      : undefined
                  }
                  isLoading={isStudentLoading}
                  editField={
                    <PhoneField
                      control={form.control}
                      name="studentPhoneNumber"
                      label="Phone Number"
                      labelClassName="content-bold"
                      inputClassName="content"
                    />
                  }
                />
                <StudentInfoField
                  label="Contact Preference"
                  value={
                    student?.phone_number != null
                      ? formatContactPreference(student.contact_preference)
                      : undefined
                  }
                  isLoading={isStudentLoading}
                  editField={
                    <SelectField
                      control={form.control}
                      name="studentContactPreference"
                      label="Contact Preference"
                      labelClassName="content-bold"
                      triggerClassName="content"
                      itemClassName="content"
                      placeholder="Select your preference"
                      options={[
                        { value: "call", label: "Call" },
                        { value: "text", label: "Text" },
                      ]}
                    />
                  }
                />
                <StudentInfoField
                  label="Email"
                  value={student?.email}
                  isLoading={isStudentLoading}
                />
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:gap-6">
              <h2 className="subhead-content">Second Contact Information</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                <TextField
                  control={form.control}
                  name="secondContactFirstName"
                  label="First Name"
                  labelClassName="content-bold"
                  inputClassName="content"
                  placeholder=""
                  autoComplete="section-contact-two field-1"
                />

                <TextField
                  control={form.control}
                  name="secondContactLastName"
                  label="Last Name"
                  labelClassName="content-bold"
                  inputClassName="content"
                  placeholder=""
                  autoComplete="section-contact-two field-2"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                <PhoneField
                  control={form.control}
                  name="phoneNumber"
                  label="Phone Number"
                  labelClassName="content-bold"
                  inputClassName="content"
                  autoComplete="section-contact-two field-3"
                />

                <SelectField
                  control={form.control}
                  name="contactPreference"
                  label="Contact Preference"
                  labelClassName="content-bold"
                  triggerClassName="content"
                  itemClassName="content"
                  placeholder="Select your preference"
                  options={[
                    { value: "call", label: "Call" },
                    { value: "text", label: "Text" },
                  ]}
                />
              </div>

              <TextField
                control={form.control}
                name="contactTwoEmail"
                label="Contact Email"
                labelClassName="content-bold"
                inputClassName="content"
                type="email"
                placeholder="student@unc.edu"
                autoComplete="section-contact-two field-4"
              />
            </div>

            <Field className="flex flex-col items-center">
              <p className="content text-center my-2 lg:my-4">
                Please ensure all information provided is correct before
                submitting
              </p>
              {submissionError && (
                <div
                  className="w-full rounded-md bg-destructive/10 p-3 text-sm text-destructive mb-2"
                  role="alert"
                >
                  {submissionError}
                </div>
              )}
              <SubmitButton
                pending={isSubmitting}
                label="Submit Event"
                className="w-fit!"
              />
            </Field>
          </FieldSet>
        </FieldGroup>
      </form>

      <Dialog
        open={showAddressConfirmation}
        onOpenChange={setShowAddressConfirmation}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Address Change</DialogTitle>
            <DialogDescription>
              You are changing your registered address. This will update your{" "}
              {schoolYear} residence on file. You will not be able to change it
              again until {changeDate}.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <p className="text-base">
              <span className="font-semibold">New Address:</span>
              <br />
              {pendingSubmitRef.current?.location.formatted_address}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddressConfirmation(false);
                pendingSubmitRef.current = null;
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                setShowAddressConfirmation(false);
                setIsSubmitting(true);
                try {
                  await onSubmit(pendingSubmitRef.current!);
                } finally {
                  setIsSubmitting(false);
                  pendingSubmitRef.current = null;
                }
              }}
            >
              Confirm Address Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}

function StudentInfoField({
  label,
  value,
  isLoading,
  editField,
  fieldClassName,
  skeletonClassName,
  description,
}: {
  label: string;
  value?: React.ReactNode;
  isLoading: boolean;
  editField?: React.ReactNode;
  fieldClassName?: string;
  skeletonClassName?: string;
  description?: React.ReactNode;
}) {
  if (value == null && !isLoading && editField != null) {
    return <>{editField}</>;
  }
  return (
    <Field className={cn("gap-1", fieldClassName)}>
      <FieldLabel className="content-bold">{label}</FieldLabel>
      {isLoading ? (
        <Skeleton className={skeletonClassName ?? "h-6 w-full"} />
      ) : (
        <>
          <p className="content">{value}</p>
          {description}
        </>
      )}
    </Field>
  );
}
