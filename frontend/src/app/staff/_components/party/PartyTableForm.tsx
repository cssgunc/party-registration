"use client";

import AddressSearch from "@/components/AddressSearch";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { addBusinessDays, format, isAfter, startOfDay } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import * as z from "zod";

export const partyTableFormSchema = z.object({
  address: z.string().min(1, "Address is required"),
  placeId: z
    .string()
    .min(1, "Please select an address from the search results"),
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
  contactOneEmail: z
    .email({ pattern: z.regexes.html5Email })
    .min(1, "Contact email is required"),
  contactTwoEmail: z
    .email({ pattern: z.regexes.html5Email })
    .min(1, "Contact email is required"),
  contactTwoFirstName: z.string().min(1, "First name is required"),
  contactTwoLastName: z.string().min(1, "Last name is required"),
  contactTwoPhoneNumber: z
    .string()
    .min(1, "Phone number is required")
    .refine(
      (val) => val.replace(/\D/g, "").length >= 10,
      "Phone number must be at least 10 digits"
    )
    .transform((val) => val.replace(/\D/g, "")),
  contactTwoPreference: z.enum(["call", "text"], {
    message: "Please select a contact preference",
  }),
});

type PartyTableFormValues = z.infer<typeof partyTableFormSchema>;

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
  const locationService = new LocationService();

  const [formData, setFormData] = useState<Partial<PartyTableFormValues>>({
    address: editData?.location.formatted_address ?? "",
    placeId: editData?.location.google_place_id ?? undefined,
    partyDate: editData?.party_datetime ?? undefined,
    partyTime: format(editData?.party_datetime ?? "", "HH:mm"),
    contactOneEmail: editData?.contact_one.email ?? "",
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
            />
            {errors.address && <FieldError>{errors.address}</FieldError>}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field data-invalid={!!errors.partyDate}>
              <FieldLabel htmlFor="party-date">Party Date</FieldLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="party-date"
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${
                      !formData.partyDate && "text-muted-foreground"
                    }`}
                  >
                    {formData.partyDate ? (
                      format(formData.partyDate, "MM/dd/yy")
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.partyDate}
                    onSelect={(date) => updateField("partyDate", date as Date)}
                    disabled={(date) =>
                      !isAfter(
                        startOfDay(date),
                        addBusinessDays(startOfDay(new Date()), 1)
                      )
                    }
                  />
                </PopoverContent>
              </Popover>
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

          <Field data-invalid={!!errors.contactOneEmail}>
            <FieldLabel htmlFor="contact-one-email">
              First Contact Email
            </FieldLabel>
            <Input
              id="contact-one-email"
              type="email"
              placeholder="student@unc.edu"
              value={formData.contactOneEmail}
              onChange={(e) => updateField("contactOneEmail", e.target.value)}
              aria-invalid={!!errors.contactOneEmail}
            />
            {errors.contactOneEmail && (
              <FieldError>{errors.contactOneEmail}</FieldError>
            )}
          </Field>

          <div className="font-bold">Second contact information </div>

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

          <Field data-invalid={!!errors.contactTwoFirstName}>
            <FieldLabel htmlFor="contact-two-first-name">First Name</FieldLabel>
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

          <Field data-invalid={!!errors.contactTwoPhoneNumber}>
            <FieldLabel htmlFor="contact-two-phone-number">
              {" "}
              Phone Number
            </FieldLabel>
            <Input
              id="contact-two-phone-number"
              placeholder="(123) 456-7890"
              value={formData.contactTwoPhoneNumber}
              onChange={(e) =>
                updateField("contactTwoPhoneNumber", e.target.value)
              }
              aria-invalid={!!errors.contactTwoPhoneNumber}
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
              {isSubmitting ? "Submitting..." : "Save"}
            </Button>
          </Field>
        </FieldSet>
      </FieldGroup>
    </form>
  );
}
