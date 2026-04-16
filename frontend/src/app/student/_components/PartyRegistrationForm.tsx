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
import { LocationService } from "@/lib/api/location/location.service";
import { AutocompleteResult } from "@/lib/api/location/location.types";
import { StudentDto } from "@/lib/api/student/student.types";
import {
  formatPhoneNumberInput,
  isFromThisSchoolYear,
  phoneNumberSchema,
} from "@/lib/utils";
import { addBusinessDays, isAfter, startOfDay } from "date-fns";
import { useRef, useState } from "react";
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
      "Party must be at least 2 business days in the future"
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
    .min(1, "Contact email is required"),
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
}: PartyRegistrationFormProps) {
  const [formData, setFormData] = useState<Partial<PartyFormValues>>({
    address: initialValues?.address ?? "",
    partyDate: initialValues?.partyDate ?? undefined,
    partyTime: initialValues?.partyTime ?? DEFAULT_PARTY_TIME,
    phoneNumber: initialValues?.phoneNumber ?? "",
    secondContactFirstName: initialValues?.secondContactFirstName ?? "",
    secondContactLastName: initialValues?.secondContactLastName ?? "",
    contactPreference:
      initialValues?.contactPreference ?? DEFAULT_CONTACT_PREFERENCE,
    contactTwoEmail: initialValues?.contactTwoEmail ?? "",
  });

  const [placeId, setPlaceId] = useState<string>(initialValues?.placeId ?? "");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddressConfirmation, setShowAddressConfirmation] = useState(false);
  const pendingSubmitRef = useRef<{
    data: PartyFormValues;
    placeId: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = partyFormSchema.safeParse(formData);

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

    // If student hasn't provided contact info yet, validate inline fields
    if (!student?.phone_number) {
      const studentInfoErrors: Record<string, string> = {};
      if (!result.data.studentPhoneNumber) {
        studentInfoErrors.studentPhoneNumber = "Phone number is required";
      }
      if (!result.data.studentContactPreference) {
        studentInfoErrors.studentContactPreference =
          "Contact preference is required";
      }
      if (Object.keys(studentInfoErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...studentInfoErrors }));
        return;
      }
    }

    // Validate contact two differs from contact one (the student)
    const contactTwoErrors: Record<string, string> = {};
    if (
      student?.email &&
      result.data.contactTwoEmail.trim().toLowerCase() ===
        student.email.trim().toLowerCase()
    ) {
      contactTwoErrors.contactTwoEmail =
        "Contact two email must be different from your email";
    }
    const studentPhone =
      student?.phone_number ?? result.data.studentPhoneNumber;
    if (studentPhone) {
      const c1Digits = studentPhone.replace(/\D/g, "");
      const c2Digits = result.data.phoneNumber;
      if (c1Digits === c2Digits) {
        contactTwoErrors.phoneNumber =
          "Contact two phone number must be different from your phone number";
      }
    }
    if (Object.keys(contactTwoErrors).length > 0) {
      setErrors(contactTwoErrors);
      return;
    }

    // Only set the address error if it wasn't already set by Zod
    if (!placeId) {
      setErrors((prev) => ({
        ...prev,
        address: prev.address || "Please select an address from the dropdown",
      }));
      return;
    }

    const addressChanged =
      !initialValues?.address || result.data.address !== initialValues.address;

    if (addressChanged) {
      pendingSubmitRef.current = { data: result.data, placeId };
      setShowAddressConfirmation(true);
      return;
    }

    // Proceed with submission if address didn't change
    setIsSubmitting(true);
    try {
      await onSubmit(result.data, placeId); // ⭐ now sends placeId too
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = <K extends keyof PartyFormValues>(
    field: K,
    value: PartyFormValues[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const currentDate = new Date();
  let school_year = "";
  let change_date = "";
  if (currentDate > new Date(currentDate.getFullYear(), 7, 1)) {
    school_year =
      currentDate.getFullYear() + "-" + (currentDate.getFullYear() + 1);
    change_date = "August 1, " + (currentDate.getFullYear() + 1);
  } else {
    school_year =
      currentDate.getFullYear() - 1 + "-" + currentDate.getFullYear();
    change_date = "August 1, " + currentDate.getFullYear();
  }

  /** ⭐ AddressSearch now sets BOTH address + placeId */
  const handleAddressSelect = (address: AutocompleteResult | null) => {
    updateField("address", address?.formatted_address || "");
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

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <FieldSet>
          <div className="flex flex-col gap-4 lg:gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:gap-8">
              <Field data-invalid={!!errors.partyDate}>
                <FieldLabel htmlFor="party-date" className="content-bold">
                  Event Date
                </FieldLabel>
                <DatePicker
                  id="party-date"
                  value={formData.partyDate ?? null}
                  onChange={(date) => updateField("partyDate", date as Date)}
                  disabled={(date) =>
                    !isAfter(
                      startOfDay(date),
                      addBusinessDays(startOfDay(new Date()), 1)
                    )
                  }
                  aria-invalid={!!errors.partyDate}
                />
                <FieldDescription>
                  Must be at least 2 business days from today
                </FieldDescription>
                {errors.partyDate && (
                  <FieldError>{errors.partyDate}</FieldError>
                )}
              </Field>

              <Field data-invalid={!!errors.partyTime}>
                <FieldLabel htmlFor="party-time" className="content-bold">
                  Event Time
                </FieldLabel>
                <Input
                  id="party-time"
                  type="time"
                  value={formData.partyTime}
                  onChange={(e) => updateField("partyTime", e.target.value)}
                  aria-invalid={!!errors.partyTime}
                  className="w-full content bg-white input-shadow"
                />
                {errors.partyTime && (
                  <FieldError>{errors.partyTime}</FieldError>
                )}
              </Field>
            </div>

            {!validResidence && (
              <Field data-invalid={!!errors.address}>
                <FieldLabel htmlFor="party-address" className="content-bold">
                  Party Address
                </FieldLabel>
                <AddressSearch
                  value={formData.address}
                  onSelect={handleAddressSelect}
                  locationService={locationService}
                  placeholder="Search for the party address..."
                  className="w-full"
                  error={errors.address}
                  initialSelection={initialAddress}
                />
                <FieldDescription className="content-sub italic">
                  This will be added to your profile as your {school_year}{" "}
                  location. You may change it after {change_date}.
                </FieldDescription>
                {errors.address && <FieldError>{errors.address}</FieldError>}
              </Field>
            )}
            {validResidence && (
              <div className="col-span-2">
                <p className="content-bold mb-2">Party Address</p>
                <p className="content pb-3">
                  {student?.residence?.location.formatted_address}
                </p>

                <div className="flex flex-row gap-4">
                  <p className="content-sub italic">
                    You cannot change your address until {change_date}. If you
                    are experiencing hardship, contact [email] for changes
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 lg:gap-6">
            <h2 className="subhead-content">Your Contact Information</h2>
            <p className="content-sub italic">
              {student?.phone_number != null
                ? "You can edit preferences in your Account Settings."
                : "Please provide your contact information to complete registration."}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
              <Field>
                <FieldLabel className="content-bold">First Name</FieldLabel>
                <p className="content">{student?.first_name}</p>
              </Field>
              <Field>
                <FieldLabel className="content-bold">Last Name</FieldLabel>
                <p className="content">{student?.last_name}</p>
              </Field>
              <Field data-invalid={!!errors.studentPhoneNumber}>
                <FieldLabel className="content-bold">Phone Number</FieldLabel>
                {student?.phone_number != null ? (
                  <p className="content">
                    {formatPhoneNumberInput(student.phone_number)}
                  </p>
                ) : (
                  <>
                    <Input
                      id="student-phone-number"
                      type="tel"
                      placeholder="(123) 456-7890"
                      value={formatPhoneNumberInput(
                        formData.studentPhoneNumber ?? ""
                      )}
                      onChange={(e) =>
                        updateField(
                          "studentPhoneNumber",
                          e.target.value.replace(/\D/g, "").slice(0, 10)
                        )
                      }
                      aria-invalid={!!errors.studentPhoneNumber}
                      className="content"
                    />
                    {errors.studentPhoneNumber && (
                      <FieldError>{errors.studentPhoneNumber}</FieldError>
                    )}
                  </>
                )}
              </Field>
              <Field data-invalid={!!errors.studentContactPreference}>
                <FieldLabel className="content-bold">
                  Contact Preference
                </FieldLabel>
                {student?.phone_number != null ? (
                  <p className="content capitalize">
                    {student.contact_preference}
                  </p>
                ) : (
                  <>
                    <Select
                      value={formData.studentContactPreference}
                      onValueChange={(value: "call" | "text") =>
                        updateField("studentContactPreference", value)
                      }
                    >
                      <SelectTrigger
                        aria-invalid={!!errors.studentContactPreference}
                        className="content"
                      >
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
                    {errors.studentContactPreference && (
                      <FieldError>{errors.studentContactPreference}</FieldError>
                    )}
                  </>
                )}
              </Field>
              <Field>
                <FieldLabel className="content-bold">Email</FieldLabel>
                <p className="content">{student?.email}</p>
              </Field>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:gap-6">
            <h2 className="subhead-content">Second Contact Information</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
              <Field data-invalid={!!errors.secondContactFirstName}>
                <FieldLabel
                  htmlFor="second-contact-first-name"
                  className="content-bold"
                >
                  First Name
                </FieldLabel>
                <Input
                  id="second-contact-first-name"
                  placeholder=""
                  value={formData.secondContactFirstName}
                  onChange={(e) =>
                    updateField("secondContactFirstName", e.target.value)
                  }
                  aria-invalid={!!errors.secondContactFirstName}
                  className="content"
                />
                {errors.secondContactFirstName && (
                  <FieldError>{errors.secondContactFirstName}</FieldError>
                )}
              </Field>

              <Field data-invalid={!!errors.secondContactLastName}>
                <FieldLabel
                  htmlFor="second-contact-last-name"
                  className="content-bold"
                >
                  Last Name
                </FieldLabel>
                <Input
                  id="second-contact-last-name"
                  placeholder=""
                  value={formData.secondContactLastName}
                  onChange={(e) =>
                    updateField("secondContactLastName", e.target.value)
                  }
                  aria-invalid={!!errors.secondContactLastName}
                  className="content"
                />
                {errors.secondContactLastName && (
                  <FieldError>{errors.secondContactLastName}</FieldError>
                )}
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
              <Field data-invalid={!!errors.phoneNumber}>
                <FieldLabel htmlFor="phone-number" className="content-bold">
                  Phone Number
                </FieldLabel>
                <Input
                  id="phone-number"
                  type="tel"
                  placeholder="(123) 456-7890"
                  value={formatPhoneNumberInput(formData.phoneNumber ?? "")}
                  onChange={(e) =>
                    updateField(
                      "phoneNumber",
                      e.target.value.replace(/\D/g, "").slice(0, 10)
                    )
                  }
                  aria-invalid={!!errors.phoneNumber}
                  className="content"
                />
                {errors.phoneNumber && (
                  <FieldError>{errors.phoneNumber}</FieldError>
                )}
              </Field>

              <Field data-invalid={!!errors.contactPreference}>
                <FieldLabel
                  htmlFor="contact-preference"
                  className="content-bold"
                >
                  Contact Preference
                </FieldLabel>
                <Select
                  value={formData.contactPreference}
                  onValueChange={(value) =>
                    updateField("contactPreference", value as "call" | "text")
                  }
                >
                  <SelectTrigger
                    id="contact-preference"
                    aria-invalid={!!errors.contactPreference}
                    className="content"
                  >
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
                {errors.contactPreference && (
                  <FieldError>{errors.contactPreference}</FieldError>
                )}
              </Field>
            </div>

            <Field data-invalid={!!errors.contactTwoEmail}>
              <FieldLabel htmlFor="contact-email" className="content-bold">
                Contact Email
              </FieldLabel>
              <Input
                id="contact-email"
                type="email"
                placeholder="student@unc.edu"
                value={formData.contactTwoEmail}
                onChange={(e) => updateField("contactTwoEmail", e.target.value)}
                aria-invalid={!!errors.contactTwoEmail}
                className="content"
              />
              {errors.contactTwoEmail && (
                <FieldError>{errors.contactTwoEmail}</FieldError>
              )}
            </Field>
          </div>

          <Field className="flex flex-col items-center">
            <p className="content text-center my-2 lg:my-4">
              Please ensure all information provided is correct before
              submitting. After submitting, all contacts will receive email
              confirmation for your event
            </p>
            <Button type="submit" disabled={isSubmitting} className="!w-fit">
              {isSubmitting ? "Submitting..." : "Submit Event"}
            </Button>
          </Field>
        </FieldSet>
      </FieldGroup>

      <Dialog
        open={showAddressConfirmation}
        onOpenChange={setShowAddressConfirmation}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Address Change</DialogTitle>
            <DialogDescription>
              You are changing your registered address. This will update your{" "}
              {school_year} residence on file. You will not be able to change it
              again until {change_date}.
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
    </form>
  );
}
