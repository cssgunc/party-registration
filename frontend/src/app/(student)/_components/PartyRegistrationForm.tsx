"use client";

import AddressSearch from "@/components/AddressSearch";
import DatePicker from "@/components/DatePicker";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { PARTY_RULE_MESSAGES } from "@/lib/api/party/party.types";
import { StudentDto } from "@/lib/api/student/student.types";
import { clientEnv } from "@/lib/config/env.client";
import {
  formatPhoneNumberInput,
  getAcademicYearLabels,
  isFromThisSchoolYear,
  phoneNumberSchema,
} from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { addBusinessDays, isAfter, startOfDay } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const partyFormSchema = z.object({
  address: z.string().min(1, "Address is required"),
  partyDate: z
    .date({
      message: "Party date is required",
    })
    .refine(
      (date) =>
        isAfter(startOfDay(date), addBusinessDays(startOfDay(new Date()), 1)),
      PARTY_RULE_MESSAGES.PARTY_DATE_TOO_SOON
    ),
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
  studentPhoneNumber: phoneNumberSchema.optional(),
  studentContactPreference: z.enum(["call", "text"]).optional(),
});

type PartyFormValues = z.infer<typeof partyFormSchema>;

export { partyFormSchema };
export type { PartyFormValues };

/**
 * Initial values that can be passed to prefill the form
 */
export interface PartyFormInitialValues {
  address?: string;
  placeId?: string;
  partyDate?: Date;
  partyTime?: string;
  secondContactFirstName?: string;
  secondContactLastName?: string;
  phoneNumber?: string;
  contactPreference?: "call" | "text";
  contactTwoEmail?: string;
}

interface PartyRegistrationFormProps {
  onSubmit: (data: PartyFormValues, placeId: string) => void | Promise<void>;
  locationService?: LocationService;
  initialValues?: PartyFormInitialValues;
  /** The authenticated student */
  student?: StudentDto | null;
  /** Whether this form is used for creating or editing a party */
  mode?: "create" | "edit";
  /** Server-side validation message to surface as a banner above the submit button. */
  submissionError?: string | null;
}

// Default party time (e.g., 8:00 PM)
const DEFAULT_PARTY_TIME = "20:00";
// Default contact preference
const DEFAULT_CONTACT_PREFERENCE: "call" | "text" = "text";

export default function PartyRegistrationForm({
  onSubmit,
  locationService = new LocationService(),
  initialValues,
  student,
  submissionError,
}: PartyRegistrationFormProps) {
  const form = useForm<PartyFormValues>({
    resolver: zodResolver(partyFormSchema),
    defaultValues: {
      address: initialValues?.address ?? "",
      partyDate: initialValues?.partyDate ?? undefined,
      partyTime: initialValues?.partyTime ?? DEFAULT_PARTY_TIME,
      phoneNumber: initialValues?.phoneNumber ?? "",
      secondContactFirstName: initialValues?.secondContactFirstName ?? "",
      secondContactLastName: initialValues?.secondContactLastName ?? "",
      contactPreference:
        initialValues?.contactPreference ?? DEFAULT_CONTACT_PREFERENCE,
      contactTwoEmail: initialValues?.contactTwoEmail ?? "",
      studentPhoneNumber: undefined,
      studentContactPreference: undefined,
    },
  });

  const [placeId, setPlaceId] = useState<string>(
    initialValues?.placeId ?? student?.residence?.location.google_place_id ?? ""
  );

  // If the student fixture loads after the first render, sync placeId from
  // their residence so the form's internal state stays honest with what'll
  // be sent on submit.
  useEffect(() => {
    if (initialValues?.placeId || placeId) return;
    const residencePlaceId = student?.residence?.location.google_place_id;
    if (residencePlaceId) setPlaceId(residencePlaceId);
  }, [student, initialValues?.placeId, placeId]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddressConfirmation, setShowAddressConfirmation] = useState(false);
  const pendingSubmitRef = useRef<{
    data: PartyFormValues;
    placeId: string;
  } | null>(null);

  const handleValid = async (data: PartyFormValues) => {
    // If student hasn't provided contact info yet, validate inline fields
    if (!student?.phone_number) {
      let hasStudentInfoError = false;
      // STUDENT_INFO_NOT_PROVIDED — banner-style: show same message twice
      // so it appears beneath whichever field the user is missing.
      if (!data.studentPhoneNumber) {
        form.setError("studentPhoneNumber", {
          message: PARTY_RULE_MESSAGES.STUDENT_INFO_NOT_PROVIDED,
        });
        hasStudentInfoError = true;
      }
      if (!data.studentContactPreference) {
        form.setError("studentContactPreference", {
          message: PARTY_RULE_MESSAGES.STUDENT_INFO_NOT_PROVIDED,
        });
        hasStudentInfoError = true;
      }
      if (hasStudentInfoError) return;
    }

    // Validate contact two differs from contact one (the student)
    let hasContactTwoError = false;
    if (
      student?.email &&
      data.contactTwoEmail.trim().toLowerCase() ===
        student.email.trim().toLowerCase()
    ) {
      form.setError("contactTwoEmail", {
        message: PARTY_RULE_MESSAGES.CONTACT_TWO_EMAIL_MATCHES_CONTACT_ONE,
      });
      hasContactTwoError = true;
    }
    const studentPhone = student?.phone_number ?? data.studentPhoneNumber;
    if (studentPhone) {
      const c1Digits = studentPhone.replace(/\D/g, "");
      const c2Digits = data.phoneNumber;
      if (c1Digits === c2Digits) {
        form.setError("phoneNumber", {
          message: PARTY_RULE_MESSAGES.CONTACT_TWO_PHONE_MATCHES_CONTACT_ONE,
        });
        hasContactTwoError = true;
      }
    }
    if (hasContactTwoError) return;

    if (!placeId) {
      form.setError("address", {
        message: "Please select an address from the dropdown",
      });
      return;
    }

    const addressChanged =
      !initialValues?.address || data.address !== initialValues.address;

    if (addressChanged) {
      pendingSubmitRef.current = { data, placeId };
      setShowAddressConfirmation(true);
      return;
    }

    // Proceed with submission if address didn't change
    setIsSubmitting(true);
    try {
      await onSubmit(data, placeId);
    } finally {
      setIsSubmitting(false);
    }
  };

  const { schoolYear, changeDate } = getAcademicYearLabels();

  const handleAddressSelect = (address: AutocompleteResult | null) => {
    form.setValue("address", address?.formatted_address || "", {
      shouldValidate: true,
    });
    setPlaceId(address?.google_place_id || "");
  };

  // Build initial address object for AddressSearch if we have prefilled values
  const initialAddress: AutocompleteResult | undefined =
    initialValues?.address && initialValues?.placeId
      ? {
          formatted_address: initialValues.address,
          google_place_id: initialValues.placeId,
        }
      : undefined;

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
                <FormField
                  control={form.control}
                  name="partyDate"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="content-bold">Party Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value ?? null}
                          onChange={field.onChange}
                          disabled={(date) =>
                            !isAfter(
                              startOfDay(date),
                              addBusinessDays(startOfDay(new Date()), 1)
                            )
                          }
                          forwardDate={true}
                          aria-invalid={fieldState.invalid}
                          inputClassName="content"
                        />
                      </FormControl>
                      <FormDescription>
                        Must be at least 2 business days from today
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="partyTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="content-bold">Party Time</FormLabel>
                      <FormControl>
                        <Input {...field} type="time" className="content" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {isStudentLoading ? (
                <Field>
                  <FieldLabel className="content-bold">
                    Party Address
                  </FieldLabel>
                  <Skeleton className="h-10 w-full" />
                </Field>
              ) : !validResidence ? (
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="content-bold">
                        Party Address
                      </FormLabel>
                      <FormControl>
                        <AddressSearch
                          value={field.value}
                          onSelect={handleAddressSelect}
                          locationService={locationService}
                          placeholder="Search for the party address..."
                          className="w-full"
                          error={fieldState.error?.message}
                          initialSelection={initialAddress}
                        />
                      </FormControl>
                      <FormDescription className="content-sub italic">
                        This will be added to your profile as your {schoolYear}{" "}
                        location. You may change it after {changeDate}.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <Field className="col-span-2 gap-1">
                  <FieldLabel className="content-bold">
                    Party Address
                  </FieldLabel>
                  <p className="content">
                    {student?.residence?.location.formatted_address}
                  </p>
                  <p className="content-sub italic">
                    You cannot change your address until {changeDate}. If you
                    are experiencing hardship, contact{" "}
                    <a
                      href={`mailto:${clientEnv.NEXT_PUBLIC_CONTACT_EMAIL}`}
                      className="underline"
                    >
                      {clientEnv.NEXT_PUBLIC_CONTACT_EMAIL}
                    </a>{" "}
                    for changes
                  </p>
                </Field>
              )}
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
                <Field className="gap-1">
                  <FieldLabel className="content-bold">First Name</FieldLabel>
                  {isStudentLoading ? (
                    <Skeleton className="h-6 w-full" />
                  ) : (
                    <p className="content">{student?.first_name}</p>
                  )}
                </Field>
                <Field className="gap-1">
                  <FieldLabel className="content-bold">Last Name</FieldLabel>
                  {isStudentLoading ? (
                    <Skeleton className="h-6 w-full" />
                  ) : (
                    <p className="content">{student?.last_name}</p>
                  )}
                </Field>
                {isStudentLoading ? (
                  <Field className="gap-1">
                    <FieldLabel className="content-bold">
                      Phone Number
                    </FieldLabel>
                    <Skeleton className="h-6 w-full" />
                  </Field>
                ) : student?.phone_number != null ? (
                  <Field className="gap-1">
                    <FieldLabel className="content-bold">
                      Phone Number
                    </FieldLabel>
                    <p className="content">
                      {formatPhoneNumberInput(student.phone_number)}
                    </p>
                  </Field>
                ) : (
                  <FormField
                    control={form.control}
                    name="studentPhoneNumber"
                    render={({ field }) => (
                      <FormItem className="gap-1">
                        <FormLabel className="content-bold">
                          Phone Number
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="tel"
                            placeholder="(123) 456-7890"
                            value={formatPhoneNumberInput(field.value ?? "")}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value.replace(/\D/g, "").slice(0, 10)
                              )
                            }
                            className="content"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {isStudentLoading ? (
                  <Field className="gap-1">
                    <FieldLabel className="content-bold">
                      Contact Preference
                    </FieldLabel>
                    <Skeleton className="h-6 w-full" />
                  </Field>
                ) : student?.phone_number != null ? (
                  <Field className="gap-1">
                    <FieldLabel className="content-bold">
                      Contact Preference
                    </FieldLabel>
                    <p className="content capitalize">
                      {student.contact_preference}
                    </p>
                  </Field>
                ) : (
                  <FormField
                    control={form.control}
                    name="studentContactPreference"
                    render={({ field }) => (
                      <FormItem className="gap-1">
                        <FormLabel className="content-bold">
                          Contact Preference
                        </FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="content">
                              <SelectValue placeholder="Select your preference" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="call" className="content">
                              Call
                            </SelectItem>
                            <SelectItem value="text" className="content">
                              Text
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <Field className="gap-1">
                  <FieldLabel className="content-bold">Email</FieldLabel>
                  {isStudentLoading ? (
                    <Skeleton className="h-6 w-full" />
                  ) : (
                    <p className="content">{student?.email}</p>
                  )}
                </Field>
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:gap-6">
              <h2 className="subhead-content">Second Contact Information</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                <FormField
                  control={form.control}
                  name="secondContactFirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="content-bold">First Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="" className="content" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="secondContactLastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="content-bold">Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="" className="content" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="content-bold">
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="tel"
                          placeholder="(123) 456-7890"
                          value={formatPhoneNumberInput(field.value ?? "")}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value.replace(/\D/g, "").slice(0, 10)
                            )
                          }
                          className="content"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPreference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="content-bold">
                        Contact Preference
                      </FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="content">
                            <SelectValue placeholder="Select your preference" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="call" className="content">
                            Call
                          </SelectItem>
                          <SelectItem value="text" className="content">
                            Text
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="contactTwoEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="content-bold">
                      Contact Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="student@unc.edu"
                        className="content"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
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
              <Button type="submit" disabled={isSubmitting} className="w-fit!">
                {isSubmitting ? "Submitting..." : "Submit Event"}
              </Button>
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
            <p className="text-sm">
              <span className="font-semibold">New Address:</span>
              <br />
              {pendingSubmitRef.current?.data.address}
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
                  const { data, placeId: submitPlaceId } =
                    pendingSubmitRef.current!;
                  await onSubmit(data, submitPlaceId);
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
