"use client";

import { addBusinessDays, format, isAfter, startOfDay } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import * as z from "zod";

import AddressSearch from "@/components/AddressSearch";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  phoneNumber: z
    .string()
    .min(1, "Phone number is required")
    .refine(
      (val) => val.replace(/\D/g, "").length >= 10,
      "Phone number must be at least 10 digits"
    ),
  contactPreference: z.enum(["call", "text"], {
    message: "Please select a contact preference",
  }),
  contactTwoEmail: z
    .email({ pattern: z.regexes.html5Email })
    .min(1, "Contact email is required"),
});

type PartyFormValues = z.infer<typeof partyFormSchema>;

export type { PartyFormValues };

interface PartyRegistrationFormProps {
  onSubmit: (data: PartyFormValues, placeId: string) => void | Promise<void>;
  locationService?: LocationService;
}

export default function PartyRegistrationForm({
  onSubmit,
  locationService = new LocationService(),
}: PartyRegistrationFormProps) {
  const [formData, setFormData] = useState<Partial<PartyFormValues>>({
    address: "",
    partyDate: undefined,
    partyTime: "",
    phoneNumber: "",
    contactPreference: undefined,
    contactTwoEmail: "",
  });

  const [placeId, setPlaceId] = useState<string>(""); // ⭐ NEW

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    if (!placeId) {
      setErrors((prev) => ({
        ...prev,
        address: "Please select an address from the dropdown",
      }));
      return;
    }

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

  /** ⭐ AddressSearch now sets BOTH address + placeId */
  const handleAddressSelect = (address: AutocompleteResult | null) => {
    updateField("address", address?.formatted_address || "");
    setPlaceId(address?.google_place_id || ""); // ⭐ new required field
  };

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <FieldSet>
          <Field data-invalid={!!errors.address}>
            <FieldLabel htmlFor="party-address">Party Address</FieldLabel>
            <AddressSearch
              value={formData.address}
              onSelect={handleAddressSelect}
              locationService={locationService}
              placeholder="Search for the party address..."
              className="w-full"
              error={errors.address}
            />
            <FieldDescription>
              Search and select the address where the party will be held. The
              address will be locked after selection.
            </FieldDescription>
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
                      format(formData.partyDate, "PPP")
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
              <FieldDescription>
                Must be at least 2 business days from today
              </FieldDescription>
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
              <FieldDescription>Select the start time</FieldDescription>
              {errors.partyTime && <FieldError>{errors.partyTime}</FieldError>}
            </Field>
          </div>
          <div className="font-semibold text-lg">
            Second Contact Information
          </div>
          <div className="flex flex-row gap-6">
            <Field data-invalid={!!errors.secondContactFirstName}>
              <FieldLabel htmlFor="second-contact-first-name">
                First Name
              </FieldLabel>
              <Input
                id="second-contact-first-name"
                placeholder=""
                value={formData.secondContactFirstName}
                onChange={(e) =>
                  updateField("secondContactFirstName", e.target.value)
                }
                aria-invalid={!!errors.secondFirstContactName}
              />
              {errors.secondContactFirstName && (
                <FieldError>{errors.secondContactFirstName}</FieldError>
              )}
            </Field>

            <Field data-invalid={!!errors.secondContactLastName}>
              <FieldLabel htmlFor="second-contact-last-name">
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
              />
              {errors.secondContactLastName && (
                <FieldError>{errors.secondContactLastName}</FieldError>
              )}
            </Field>
          </div>
          <Field data-invalid={!!errors.phone_number}>
            <FieldLabel htmlFor="phone-number">Phone Number</FieldLabel>
            <Input
              id="phone-number"
              placeholder="(123) 456-7890"
              value={formData.phoneNumber}
              onChange={(e) => updateField("phoneNumber", e.target.value)}
              aria-invalid={!!errors.phoneNumber}
            />
            <FieldDescription>
              We will use this to contact Contact two about the party
            </FieldDescription>
            {errors.phoneNumber && (
              <FieldError>{errors.phoneNumber}</FieldError>
            )}
          </Field>

          <Field data-invalid={!!errors.contactPreference}>
            <FieldLabel htmlFor="contact-preference">
              Contact Preference
            </FieldLabel>
            <Select
              value={formData.contactPreference}
              onValueChange={(value) =>
                updateField("contactPreference", value as "call" | "text")
              }
            >
              <SelectTrigger id="contact-preference">
                <SelectValue placeholder="Select your preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="text">Text</SelectItem>
              </SelectContent>
            </Select>
            <FieldDescription>
              How should we contact the second contact?
            </FieldDescription>
            {errors.contact_preference && (
              <FieldError>{errors.contact_preference}</FieldError>
            )}
          </Field>

          <Field data-invalid={!!errors.contactTwoEmail}>
            <FieldLabel htmlFor="contact-email">Contact Email</FieldLabel>
            <Input
              id="contact-email"
              type="email"
              placeholder="student@unc.edu"
              value={formData.contactTwoEmail}
              onChange={(e) => updateField("contactTwoEmail", e.target.value)}
              aria-invalid={!!errors.contactTwoEmail}
            />
            <FieldDescription>
              Email address of the second contact person
            </FieldDescription>
            {errors.contactTwoEmail && (
              <FieldError>{errors.contactTwoEmail}</FieldError>
            )}
          </Field>

          <Field orientation="horizontal">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Register Party"}
            </Button>
          </Field>
        </FieldSet>
      </FieldGroup>
    </form>
  );
}
