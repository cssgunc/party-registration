"use client";

import AddressSearch from "@/components/AddressSearch";
import DatePicker from "@/components/DatePicker";
import StudentSearch from "@/components/StudentSearch";
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
import { PartyDto } from "@/lib/api/party/party.types";
import { AdminStudentService } from "@/lib/api/student/admin-student.service";
import { StudentSuggestionDto } from "@/lib/api/student/student.types";
import { formatPhoneNumberInput, phoneNumberSchema } from "@/lib/utils";
import { addBusinessDays, format, isAfter, startOfDay } from "date-fns";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import * as z from "zod";

export const createPartyTableFormSchema = (isAdmin: boolean) => {
  const partyDateSchema = isAdmin
    ? z.date({
        message: "Party date is required",
      })
    : z
        .date({
          message: "Party date is required",
        })
        .refine(
          (date) =>
            isAfter(
              startOfDay(date),
              addBusinessDays(startOfDay(new Date()), 1)
            ),
          "Party must be at least 2 business days in the future"
        );

  return z.object({
    address: z.string().min(1, "Address is required"),
    placeId: z
      .string()
      .min(1, "Please select an address from the search results"),
    partyDate: partyDateSchema,
    partyTime: z.string().min(1, "Party time is required"),
    contactOneStudentId: z
      .number({ message: "Please select a student" })
      .positive("Please select a student"),
    contactTwoEmail: z
      .email({ pattern: z.regexes.html5Email })
      .min(1, "Contact email is required"),
    contactTwoFirstName: z.string().min(1, "First name is required"),
    contactTwoLastName: z.string().min(1, "Last name is required"),
    contactTwoPhoneNumber: phoneNumberSchema,
    contactTwoPreference: z.enum(["call", "text"], {
      message: "Please select a contact preference",
    }),
  });
};

type PartyTableFormValues = z.infer<
  ReturnType<typeof createPartyTableFormSchema>
>;

interface PartyTableFormProps {
  onSubmit: (data: PartyTableFormValues) => void | Promise<void>;
  editData?: PartyDto;
  submissionError?: string | null;
  title?: string;
}

export default function PartyTableForm({
  onSubmit,
  editData,
  submissionError,
  title,
}: PartyTableFormProps) {
  const { data: session } = useSession();
  const isAdmin = session?.role === "admin";
  const locationService = useMemo(() => new LocationService(), []);
  const adminStudentService = useMemo(() => new AdminStudentService(), []);

  const partyTableFormSchema = createPartyTableFormSchema(isAdmin);

  const [formData, setFormData] = useState<Partial<PartyTableFormValues>>({
    address: editData?.location.formatted_address ?? "",
    placeId: editData?.location.google_place_id ?? undefined,
    partyDate: editData?.party_datetime ?? undefined,
    partyTime: editData?.party_datetime
      ? format(editData.party_datetime, "HH:mm")
      : "",
    contactOneStudentId: editData?.contact_one.id ?? undefined,
    contactTwoEmail: editData?.contact_two.email ?? "",
    contactTwoFirstName: editData?.contact_two.first_name ?? "",
    contactTwoLastName: editData?.contact_two.last_name ?? "",
    contactTwoPhoneNumber: editData?.contact_two.phone_number ?? "",
    contactTwoPreference: editData?.contact_two.contact_preference ?? undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = partyTableFormSchema.safeParse(formData);

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

  const handleStudentSelect = (student: StudentSuggestionDto | null) => {
    setFormData((prev) => ({
      ...prev,
      contactOneStudentId: student?.student_id ?? undefined,
    }));
    if (errors.contactOneStudentId) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.contactOneStudentId;
        return newErrors;
      });
    }
  };

  const handleAddressSelect = (address: AutocompleteResult | null) => {
    setFormData((prev) => ({
      ...prev,
      address: address?.formatted_address || "",
      placeId: address?.google_place_id || undefined,
    }));
    if (errors.address) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.address;
        return newErrors;
      });
    }
  };

  const updateField = <K extends keyof PartyTableFormValues>(
    field: K,
    value: PartyTableFormValues[K]
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
          <Field data-invalid={!!errors.address}>
            <FieldLabel htmlFor="party-address">Party Address</FieldLabel>
            <AddressSearch
              value={formData.address}
              initialSelection={
                editData?.location
                  ? {
                      formatted_address: editData.location.formatted_address,
                      google_place_id: editData.location.google_place_id,
                    }
                  : null
              }
              onSelect={handleAddressSelect}
              locationService={locationService}
              placeholder="Search for the party address..."
              className="w-full"
              error={errors.address}
              chapelHillOnly
            />
            {errors.address && <FieldError>{errors.address}</FieldError>}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field data-invalid={!!errors.partyDate}>
              <FieldLabel htmlFor="party-date">Party Date</FieldLabel>
              <DatePicker
                id="party-date"
                dateFormat="MM/dd/yy"
                value={formData.partyDate ?? null}
                onChange={(date) => updateField("partyDate", date as Date)}
                disabled={
                  isAdmin
                    ? undefined
                    : (date) =>
                        !isAfter(
                          startOfDay(date),
                          addBusinessDays(startOfDay(new Date()), 1)
                        )
                }
              />
              {errors.partyDate && <FieldError>{errors.partyDate}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.partyTime}>
              <FieldLabel htmlFor="party-time">Party Time</FieldLabel>
              <Input
                id="party-time"
                type="time"
                value={formData.partyTime}
                onChange={(e) => updateField("partyTime", e.target.value)}
                aria-invalid={!!errors.partyTime}
              />
              {errors.partyTime && <FieldError>{errors.partyTime}</FieldError>}
            </Field>
          </div>

          <Field data-invalid={!!errors.contactOneStudentId}>
            <FieldLabel htmlFor="contact-one-student">First Contact</FieldLabel>
            <StudentSearch
              initialSelection={
                editData?.contact_one
                  ? {
                      student_id: editData.contact_one.id,
                      first_name: editData.contact_one.first_name,
                      last_name: editData.contact_one.last_name,
                      matched_field_name: "email",
                      matched_field_value: editData.contact_one.email,
                    }
                  : null
              }
              onSelect={handleStudentSelect}
              adminStudentService={adminStudentService}
              placeholder="Search by PID, email, onyen, or phone..."
              className="w-full"
              error={errors.contactOneStudentId}
            />
            {errors.contactOneStudentId && (
              <FieldError>{errors.contactOneStudentId}</FieldError>
            )}
          </Field>

          <p className="font-bold">Second Contact Information </p>

          <Field data-invalid={!!errors.contactTwoEmail}>
            <FieldLabel htmlFor="contact-two-email">Contact Email</FieldLabel>
            <Input
              id="contact-two-email"
              type="email"
              placeholder="student@unc.edu"
              value={formData.contactTwoEmail}
              onChange={(e) => updateField("contactTwoEmail", e.target.value)}
              aria-invalid={!!errors.contactTwoEmail}
            />
            {errors.contactTwoEmail && (
              <FieldError>{errors.contactTwoEmail}</FieldError>
            )}
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field data-invalid={!!errors.contactTwoFirstName}>
              <FieldLabel htmlFor="contact-two-first-name">
                First Name
              </FieldLabel>
              <Input
                id="contact-two-first-name"
                type="text"
                placeholder="John"
                value={formData.contactTwoFirstName}
                onChange={(e) =>
                  updateField("contactTwoFirstName", e.target.value)
                }
                aria-invalid={!!errors.contactTwoFirstName}
              />
              {errors.contactTwoFirstName && (
                <FieldError>{errors.contactTwoFirstName}</FieldError>
              )}
            </Field>

            <Field data-invalid={!!errors.contactTwoLastName}>
              <FieldLabel htmlFor="contact-two-last-name">Last Name</FieldLabel>
              <Input
                id="contact-two-last-name"
                type="text"
                placeholder="Doe"
                value={formData.contactTwoLastName}
                onChange={(e) =>
                  updateField("contactTwoLastName", e.target.value)
                }
                aria-invalid={!!errors.contactTwoLastName}
              />
              {errors.contactTwoLastName && (
                <FieldError>{errors.contactTwoLastName}</FieldError>
              )}
            </Field>
          </div>

          <Field data-invalid={!!errors.contactTwoPhoneNumber}>
            <FieldLabel htmlFor="contact-two-phone-number">
              {" "}
              Phone Number
            </FieldLabel>
            <Input
              id="contact-two-phone-number"
              type="tel"
              placeholder="(123) 456-7890"
              value={formatPhoneNumberInput(
                formData.contactTwoPhoneNumber || ""
              )}
              onChange={(e) => {
                const digitsOnly = e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 10);
                updateField("contactTwoPhoneNumber", digitsOnly);
              }}
              aria-invalid={!!errors.contactTwoPhoneNumber}
              maxLength={14}
            />
            {errors.contactTwoPhoneNumber && (
              <FieldError>{errors.contactTwoPhoneNumber}</FieldError>
            )}
          </Field>

          <Field data-invalid={!!errors.contactTwoPreference}>
            <FieldLabel htmlFor="contact-two-preference">
              Contact Preference
            </FieldLabel>
            <Select
              value={formData.contactTwoPreference}
              onValueChange={(value) =>
                updateField("contactTwoPreference", value as "call" | "text")
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
            {errors.contactTwoPreference && (
              <FieldError>{errors.contactTwoPreference}</FieldError>
            )}
          </Field>

          <Field orientation="vertical">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Save Changes"}
            </Button>
          </Field>
        </FieldSet>
      </FieldGroup>
    </form>
  );
}
