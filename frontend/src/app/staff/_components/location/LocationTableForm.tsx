"use client";

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
import { LocationService } from "@/lib/api/location/location.service";
import { AutocompleteResult } from "@/lib/api/location/location.types";
import { addBusinessDays, format, isAfter, startOfDay } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import * as z from "zod";

export const locationTableFormSchema = z.object({
  address: z.string().min(1, "Address is required"),
  placeId: z
    .string()
    .min(1, "Please select an address from the search results"),
  holdExpiration: z.date().nullable(),
  warning_count: z.number(),
  citation_count: z.number(),
});

type LocationTableFormValues = z.infer<typeof locationTableFormSchema>;

interface LocationTableFormProps {
  onSubmit: (data: LocationTableFormValues) => void | Promise<void>;
  editData?: LocationTableFormValues;
  submissionError?: string | null;
  title?: string;
}

export default function LocationTableForm({
  onSubmit,
  editData,
  submissionError,
  title,
}: LocationTableFormProps) {
  const locationService = new LocationService();

  const [formData, setFormData] = useState<Partial<LocationTableFormValues>>({
    address: editData?.address ?? "",
    placeId: editData?.placeId ?? undefined,
    holdExpiration: editData?.holdExpiration ?? null,
    warning_count: editData?.warning_count ?? 0,
    citation_count: editData?.citation_count ?? 0,
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
              onSelect={handleAddressSelect}
              locationService={locationService}
              placeholder="Search for the location address..."
              className="w-full"
              error={errors.address}
            />
            {errors.address && <FieldError>{errors.address}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.holdExpiration}>
            <FieldLabel htmlFor="hold-expiration">Hold Expiration</FieldLabel>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="hold-expiration"
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${
                    !formData.holdExpiration && "text-muted-foreground"
                  }`}
                >
                  {formData.holdExpiration ? (
                    format(formData.holdExpiration, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.holdExpiration || undefined}
                  onSelect={(date) =>
                    updateField("holdExpiration", date as Date)
                  }
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
              Leave blank if there is no hold on this location.
            </FieldDescription>
            {errors.holdExpiration && (
              <FieldError>{errors.holdExpiration}</FieldError>
            )}
          </Field>

          <Field data-invalid={!!errors.warning_count}>
            <FieldLabel htmlFor="warning-count">Warning count</FieldLabel>
            <Input
              value={formData.warning_count}
              onChange={(e) =>
                updateField("warning_count", Number(e.target.value))
              }
              id="warning-count"
              type="number"
              min={0}
              step={1}
            />
            {errors.warning_count && (
              <FieldError>{errors.warning_count}</FieldError>
            )}
          </Field>

          <Field data-invalid={!!errors.citation_count}>
            <FieldLabel htmlFor="citation-count">Citation count</FieldLabel>
            <Input
              value={formData.citation_count}
              onChange={(e) =>
                updateField("citation_count", Number(e.target.value))
              }
              id="warning-count"
              type="number"
              min={0}
              step={1}
            />
            {errors.citation_count && (
              <FieldError>{errors.citation_count}</FieldError>
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
