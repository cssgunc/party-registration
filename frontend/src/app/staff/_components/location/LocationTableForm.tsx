"use client";

import AddressSearch from "@/components/AddressSearch";
import DatePicker from "@/components/DatePicker";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { LocationService } from "@/lib/api/location/location.service";
import { AutocompleteResult } from "@/lib/api/location/location.types";
import { addBusinessDays, isAfter, startOfDay } from "date-fns";
import { useState } from "react";
import * as z from "zod";

export const locationTableFormSchema = z.object({
  address: z.string().min(1, "Address is required"),
  placeId: z
    .string()
    .min(1, "Please select an address from the search results"),
  holdExpiration: z.date().nullable(),
});

type LocationTableFormValues = z.infer<typeof locationTableFormSchema>;

interface LocationTableFormProps {
  onSubmit: (data: LocationTableFormValues) => void | Promise<void>;
  editData?: LocationTableFormValues;
  submissionError?: string | null;
}

export default function LocationTableForm({
  onSubmit,
  editData,
  submissionError,
}: LocationTableFormProps) {
  const locationService = new LocationService();
  const initialAddressSelection: AutocompleteResult | null =
    editData?.address && editData?.placeId
      ? {
          formatted_address: editData.address,
          google_place_id: editData.placeId,
        }
      : null;

  const [formData, setFormData] = useState<Partial<LocationTableFormValues>>({
    address: editData?.address ?? "",
    placeId: editData?.placeId ?? undefined,
    holdExpiration: editData?.holdExpiration ?? null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = locationTableFormSchema.safeParse(formData);

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

  const updateField = <K extends keyof LocationTableFormValues>(
    field: K,
    value: LocationTableFormValues[K]
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
      <FieldGroup>
        <FieldSet>
          <Field data-invalid={!!errors.address}>
            <FieldLabel htmlFor="address">Address</FieldLabel>
            <AddressSearch
              id="address"
              value={formData.address}
              initialSelection={initialAddressSelection}
              onSelect={handleAddressSelect}
              locationService={locationService}
              placeholder="Search for the location address..."
              className="w-full"
              error={errors.address}
              chapelHillOnly
            />
            {errors.address && <FieldError>{errors.address}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.holdExpiration}>
            <FieldLabel htmlFor="hold-expiration">Hold Expiration</FieldLabel>
            <DatePicker
              id="hold-expiration"
              value={formData.holdExpiration}
              onChange={(date) => updateField("holdExpiration", date)}
              disabled={(date) =>
                !isAfter(
                  startOfDay(date),
                  addBusinessDays(startOfDay(new Date()), 1)
                )
              }
              clearable
            />
            <FieldDescription>
              Leave blank if there is no hold on this location.
            </FieldDescription>
            {errors.holdExpiration && (
              <FieldError>{errors.holdExpiration}</FieldError>
            )}
          </Field>

          <Field orientation="vertical" className="space-y-3">
            {submissionError && (
              <div
                className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                role="alert"
              >
                {submissionError}
              </div>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Save Changes"}
            </Button>
          </Field>
        </FieldSet>
      </FieldGroup>
    </form>
  );
}
