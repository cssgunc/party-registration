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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IncidentCreateDto,
  IncidentDto,
  IncidentSeverity,
} from "@/lib/api/incident/incident.types";
import { LocationService } from "@/lib/api/location/location.service";
import { AutocompleteResult } from "@/lib/api/location/location.types";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import * as z from "zod";

const incidentSeverityValues: IncidentSeverity[] = [
  "remote_warning",
  "in_person_warning",
  "citation",
];

const incidentTableFormSchema = z.object({
  location_id: z.number().int().positive("Location is required"),
  incident_date: z.date({
    message: "Incident date is required",
  }),
  incident_time: z.string().min(1, "Incident time is required"),
  severity: z.enum(incidentSeverityValues),
  description: z.string(),
  reference_id: z.string().nullable().optional(),
});

type IncidentTableFormValues = z.infer<typeof incidentTableFormSchema>;

type LocationOption = {
  id: number;
  label: string;
};

interface IncidentTableFormProps {
  onSubmit: (data: IncidentCreateDto) => void | Promise<void>;
  locations: LocationOption[];
  editData?: IncidentDto;
  submissionError?: string | null;
  title?: string;
}

function severityLabel(severity: IncidentSeverity): string {
  if (severity === "remote_warning") return "Remote Warning";
  if (severity === "in_person_warning") return "In-Person Warning";
  return "Citation";
}

export default function IncidentTableForm({
  onSubmit,
  locations,
  editData,
  submissionError,
  title,
}: IncidentTableFormProps) {
  const [formData, setFormData] = useState<IncidentTableFormValues>({
    location_id: editData?.location_id ?? 0,
    incident_date: editData?.incident_datetime ?? new Date(),
    incident_time: editData?.incident_datetime
      ? format(editData.incident_datetime, "HH:mm")
      : "",
    severity: editData?.severity ?? "in_person_warning",
    description: editData?.description ?? "",
    reference_id: editData?.reference_id ?? null,
  });
  const locationService = new LocationService();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const address = useMemo(() => {
    if (formData.location_id <= 0) return "";
    return (
      locations.find((loc) => loc.id === formData.location_id)?.label ?? ""
    );
  }, [formData.location_id, locations]);

  const initialAddressSelection: AutocompleteResult | null =
    address && formData?.location_id
      ? {
          formatted_address: address,
          google_place_id: formData.location_id.toString(),
        }
      : null;

  const updateField = <K extends keyof IncidentTableFormValues>(
    field: K,
    value: IncidentTableFormValues[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = incidentTableFormSchema.safeParse(formData);
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
      const { incident_date, incident_time, ...rest } = result.data;
      const [hours, minutes] = incident_time.split(":").map(Number);
      const incident_datetime = new Date(incident_date);
      incident_datetime.setHours(hours, minutes, 0, 0);

      await onSubmit({
        ...rest,
        incident_datetime,
        description: result.data.description.trim(),
        reference_id: result.data.reference_id?.trim() || null,
      });
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
          <Field data-invalid={!!errors.location_id}>
            <FieldLabel>Location</FieldLabel>
            <AddressSearch
              value={address}
              initialSelection={initialAddressSelection}
              onSelect={handleAddressSelect}
              locationService={locationService}
              placeholder="Search for the location address..."
              className="w-full"
              error={errors.address}
              chapelHillOnly
            />
            {errors.location_id && (
              <FieldError>{errors.location_id}</FieldError>
            )}
          </Field>

          {/* <Field data-invalid={!!errors.incident_datetime}>
            <FieldLabel>Date and Time</FieldLabel>
            <Input
              type="datetime-local"
              value={toLocalDatetimeString(formData.incident_datetime)}
              onChange={(e) =>
                updateField("incident_datetime", new Date(e.target.value))
              }
            />
            {errors.incident_datetime && (
              <FieldError>{errors.incident_datetime}</FieldError>
            )}
          </Field> */}
          <div className="grid grid-cols-2 gap-4">
            <Field data-invalid={!!errors.incident_date}>
              <FieldLabel htmlFor="incident-date">Incident Date</FieldLabel>
              <DatePicker
                id="incident-date"
                dateFormat="MM/dd/yy"
                value={formData.incident_date ?? null}
                onChange={(date) => updateField("incident_date", date as Date)}
              />
              {errors.incident_date && (
                <FieldError>{errors.incident_date}</FieldError>
              )}
            </Field>

            <Field data-invalid={!!errors.incident_time}>
              <FieldLabel htmlFor="incident-time">Incident Time</FieldLabel>
              <Input
                id="incident-time"
                type="time"
                value={formData.incident_time}
                onChange={(e) => updateField("incident_time", e.target.value)}
                aria-invalid={!!errors.incident_time}
              />
              {errors.incident_time && (
                <FieldError>{errors.incident_time}</FieldError>
              )}
            </Field>
          </div>

          <Field data-invalid={!!errors.severity}>
            <FieldLabel>Severity</FieldLabel>
            <Select
              value={formData.severity}
              onValueChange={(value) =>
                updateField("severity", value as IncidentSeverity)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                {incidentSeverityValues.map((severity) => (
                  <SelectItem key={severity} value={severity}>
                    {severityLabel(severity)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.severity && <FieldError>{errors.severity}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.reference_id}>
            <FieldLabel>Reference ID</FieldLabel>
            <Input
              value={formData.reference_id ?? ""}
              onChange={(e) => updateField("reference_id", e.target.value)}
              placeholder="Optional"
            />
            <FieldDescription>
              Add a ticket or report ID if one exists.
            </FieldDescription>
            {errors.reference_id && (
              <FieldError>{errors.reference_id}</FieldError>
            )}
          </Field>

          <Field data-invalid={!!errors.description}>
            <FieldLabel>Description</FieldLabel>
            <textarea
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="What happened?"
              className="w-full min-h-24 px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-vertical"
            />
            {errors.description && (
              <FieldError>{errors.description}</FieldError>
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
