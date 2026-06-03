"use client";

import { FormShell } from "@/components/form/FormShell";
import {
  AddressField,
  DateField,
  SelectField,
  TextField,
  TextareaField,
} from "@/components/form/fields";
import {
  INCIDENT_SEVERITY_LABELS,
  IncidentCreateDto,
  IncidentDto,
  IncidentSeverity,
} from "@/lib/api/incident/incident.types";
import { AutocompleteResult } from "@/lib/api/location/location.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import * as z from "zod";

const incidentSeverityValues: IncidentSeverity[] = [
  "remote_warning",
  "in_person_warning",
  "citation",
];

const incidentTableFormSchema = z.object({
  location_place_id: z.string().min(1, "Location is required"),
  incident_datetime: z.date({ message: "Incident date is required" }),
  incident_time: z.string().min(1, "Incident time is required"),
  severity: z.enum(incidentSeverityValues),
  description: z.string(),
  reference_id: z.string().nullable().optional(),
});

type IncidentTableFormValues = z.infer<typeof incidentTableFormSchema>;

interface IncidentTableFormProps {
  onSubmit: (data: IncidentCreateDto) => void | Promise<void>;
  editData?: IncidentDto;
  submissionError?: string | null;
}

export default function IncidentTableForm({
  onSubmit,
  editData,
  submissionError,
}: IncidentTableFormProps) {
  const initialAddressSelection: AutocompleteResult | null = editData?.location
    ? {
        formatted_address: editData.location.formatted_address,
        google_place_id: editData.location.google_place_id,
      }
    : null;

  const form = useForm<IncidentTableFormValues>({
    resolver: zodResolver(incidentTableFormSchema),
    defaultValues: {
      location_place_id: editData?.location?.google_place_id ?? "",
      incident_datetime: editData?.incident_datetime ?? new Date(),
      incident_time: editData?.incident_datetime
        ? format(editData.incident_datetime, "HH:mm")
        : "",
      severity: editData?.severity ?? "in_person_warning",
      description: editData?.description ?? "",
      reference_id: editData?.reference_id ?? null,
    },
  });

  const handleValid = (data: IncidentTableFormValues) => {
    const [hours, minutes] = data.incident_time.split(":").map(Number);
    const combined_datetime = new Date(data.incident_datetime);
    combined_datetime.setHours(hours, minutes, 0, 0);

    return onSubmit({
      location_place_id: data.location_place_id,
      incident_datetime: combined_datetime,
      description: data.description,
      severity: data.severity,
      reference_id: data.reference_id || null,
    });
  };

  return (
    <FormShell
      form={form}
      onSubmit={handleValid}
      submitLabel="Save"
      submissionError={submissionError}
    >
      <AddressField
        control={form.control}
        name="location_place_id"
        label="Location"
        placeholder="Search for the location address..."
        chapelHillOnly
        initialSelection={initialAddressSelection}
        getStoredValue={(address) => address?.google_place_id || ""}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DateField
          control={form.control}
          name="incident_datetime"
          label="Incident Date"
          dateFormat="MM/dd/yy"
        />
        <TextField
          control={form.control}
          name="incident_time"
          label="Incident Time"
          type="time"
          autoComplete="off"
        />
      </div>

      <SelectField
        control={form.control}
        name="severity"
        label="Severity"
        placeholder="Select severity"
        options={incidentSeverityValues.map((severity) => ({
          value: severity,
          label: INCIDENT_SEVERITY_LABELS[severity],
        }))}
      />

      <TextField
        control={form.control}
        name="reference_id"
        label="Reference ID"
        placeholder="Optional"
        autoComplete="off"
        description="Add a ticket or report ID if one exists."
      />

      <TextareaField
        control={form.control}
        name="description"
        label="Description"
        placeholder="Optional"
        textareaClassName=" w-full min-h-24 px-3 py-2 rounded-md border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-vertical shadow-xs input-shadow transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 "
      />
    </FormShell>
  );
}
