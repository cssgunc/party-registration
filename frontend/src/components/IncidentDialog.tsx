"use client";

import { FormShell } from "@/components/form/FormShell";
import {
  DateField,
  SelectField,
  TextField,
  TextareaField,
} from "@/components/form/fields";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  INCIDENT_SEVERITIES,
  INCIDENT_SEVERITY_LABELS,
  IncidentCreateDto,
  IncidentSeverity,
  NestedIncidentDto,
} from "@/lib/api/incident/incident.types";
import { LocationDto } from "@/lib/api/location/location.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import * as z from "zod";

const incidentSchema = z.object({
  severity: z.enum(INCIDENT_SEVERITIES),
  date: z.date({ message: "Date is required" }),
  time: z.string().min(1, "Time is required"),
  description: z.string(),
  reference_id: z.string().optional(),
});

type IncidentFormValues = z.infer<typeof incidentSchema>;

export interface IncidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "create" | "edit";
  location: LocationDto | null;
  /** Overrides location.google_place_id for incident creation (used for unregistered locations) */
  locationPlaceId?: string;
  /** Fallback address string when location is null (used for unregistered locations) */
  formattedAddress?: string;
  incident?: NestedIncidentDto;
  defaultSeverity?: IncidentSeverity;
  onSubmit: (data: IncidentCreateDto) => void;
  isSubmitting?: boolean;
}

export default function IncidentDialog({
  open,
  onOpenChange,
  mode = "create",
  location,
  locationPlaceId,
  formattedAddress,
  incident,
  defaultSeverity = "in_person_warning",
  onSubmit,
  isSubmitting = false,
}: IncidentDialogProps) {
  const defaultDatetime = incident?.incident_datetime ?? new Date();

  const form = useForm<IncidentFormValues>({
    resolver: zodResolver(incidentSchema),
    mode: "onBlur",
    defaultValues: {
      severity: incident?.severity ?? defaultSeverity,
      date: defaultDatetime,
      time: format(defaultDatetime, "HH:mm"),
      description: incident?.description ?? "",
      reference_id: incident?.reference_id ?? undefined,
    },
  });

  const handleValid = (data: IncidentFormValues) => {
    const { date, time, severity, description, reference_id } = data;
    const [hours, minutes] = time.split(":").map(Number);
    const incident_datetime = new Date(date);
    incident_datetime.setHours(hours ?? 0, minutes ?? 0, 0, 0);

    onSubmit({
      location_place_id: locationPlaceId ?? location?.google_place_id ?? "",
      incident_datetime,
      description,
      severity,
      reference_id: reference_id || null,
    });
  };

  const severityLabel = INCIDENT_SEVERITY_LABELS[form.watch("severity")];
  const title =
    mode === "edit" ? `Edit ${severityLabel}` : `Add ${severityLabel}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            <p className="text-base flex items-center justify-center gap-2">
              {title}
            </p>
          </DialogTitle>
        </DialogHeader>

        <FormShell
          form={form}
          onSubmit={handleValid}
          submitLabel="Save Changes"
          pendingLabel="Saving changes..."
          pending={isSubmitting}
          submitClassName="self-center"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="incident-address">Selected Address</Label>
            <Input
              id="incident-address"
              value={location?.formatted_address || formattedAddress || ""}
              disabled
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SelectField
              control={form.control}
              name="severity"
              label="Incident Type"
              triggerClassName="w-full"
              placeholder="Enter incident type"
              options={INCIDENT_SEVERITIES.map((s) => ({
                value: s,
                label: INCIDENT_SEVERITY_LABELS[s],
              }))}
            />

            <TextField
              control={form.control}
              name="reference_id"
              label="Reference ID"
              placeholder="Optional"
            />

            <DateField
              control={form.control}
              name="date"
              label="Date"
              placeholder="Pick a date"
            />

            <TextField
              control={form.control}
              name="time"
              label="Incident Time"
              type="time"
            />
          </div>

          <TextareaField
            control={form.control}
            name="description"
            label="Description"
            rows={4}
            textareaClassName="shadow-xs input-shadow transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:ring-destructive/20"
            description="Optional details about the incident."
          />
        </FormShell>
      </DialogContent>
    </Dialog>
  );
}
