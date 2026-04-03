"use client";

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
import { useState } from "react";
import * as z from "zod";

const incidentSeverityValues: IncidentSeverity[] = [
  "remote_warning",
  "in_person_warning",
  "citation",
];

const incidentTableFormSchema = z.object({
  location_id: z.number().int().positive("Location is required"),
  incident_datetime: z.date(),
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

function toLocalDatetimeString(date: Date) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - tzOffset);
  return local.toISOString().slice(0, 16);
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
    incident_datetime: editData?.incident_datetime ?? new Date(),
    severity: editData?.severity ?? "in_person_warning",
    description: editData?.description ?? "",
    reference_id: editData?.reference_id ?? null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await onSubmit({
        ...result.data,
        description: result.data.description.trim(),
        reference_id: result.data.reference_id?.trim() || null,
      });
    } finally {
      setIsSubmitting(false);
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
            <Select
              value={
                formData.location_id > 0 ? String(formData.location_id) : ""
              }
              onValueChange={(value) =>
                updateField("location_id", Number(value))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={String(location.id)}>
                    {location.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.location_id && (
              <FieldError>{errors.location_id}</FieldError>
            )}
          </Field>

          <Field data-invalid={!!errors.incident_datetime}>
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
          </Field>

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
            <Input
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="What happened?"
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
