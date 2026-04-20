"use client";

import DatePicker from "@/components/DatePicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  INCIDENT_SEVERITIES,
  IncidentCreateDto,
  IncidentDto,
  IncidentSeverity,
} from "@/lib/api/incident/incident.types";
import { LocationDto } from "@/lib/api/location/location.types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useState } from "react";
import * as z from "zod";

const incidentSchema = z.object({
  severity: z.enum(INCIDENT_SEVERITIES),
  date: z.date({ message: "Date is required" }),
  time: z.string().min(1, "Time is required"),
  description: z.string(),
  reference_id: z.string().optional(),
});

type IncidentFormValues = z.infer<typeof incidentSchema>;

const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  remote_warning: "Remote Warning",
  in_person_warning: "In-Person Warning",
  citation: "Citation",
};

export interface IncidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "create" | "edit";
  location: LocationDto | null;
  /** Overrides location.google_place_id for incident creation (used for unregistered locations) */
  locationPlaceId?: string;
  /** Fallback address string when location is null (used for unregistered locations) */
  formattedAddress?: string;
  incident?: IncidentDto;
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

  const [formData, setFormData] = useState<IncidentFormValues>({
    severity: incident?.severity ?? defaultSeverity,
    date: defaultDatetime,
    time: format(defaultDatetime, "HH:mm"),
    description: incident?.description ?? "",
    reference_id: incident?.reference_id ?? undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = <K extends keyof IncidentFormValues>(
    field: K,
    value: IncidentFormValues[K]
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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const result = incidentSchema.safeParse(formData);

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

    const { date, time, severity, description, reference_id } = result.data;
    const [hours, minutes] = time.split(":").map(Number);
    const incident_datetime = new Date(date);
    incident_datetime.setHours(hours ?? 0, minutes ?? 0, 0, 0);

    setErrors({});
    onSubmit({
      location_place_id: locationPlaceId ?? location?.google_place_id ?? "",
      incident_datetime,
      description,
      severity,
      reference_id: reference_id ?? null,
    });
  };

  const title = mode === "edit" ? "Edit Incident" : "Add Incident";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card">
        <DialogHeader>
          <DialogTitle>
            <p className="text-base flex items-center justify-center gap-2">
              {title}
            </p>
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="incident-address">Selected Address</Label>
            <Input
              id="incident-address"
              value={location?.formatted_address || formattedAddress || ""}
              disabled
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="incident-type">Incident Type</Label>
              <Select
                value={formData.severity}
                onValueChange={(v) =>
                  updateField("severity", v as IncidentSeverity)
                }
              >
                <SelectTrigger id="incident-type" className="w-full">
                  <SelectValue placeholder="Enter incident type" />
                </SelectTrigger>
                <SelectContent>
                  {INCIDENT_SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SEVERITY_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="incident-reference-id">Reference ID</Label>
              <Input
                id="incident-reference-id"
                value={formData.reference_id ?? ""}
                onChange={(e) =>
                  updateField("reference_id", e.target.value || undefined)
                }
                placeholder="Optional"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="incident-date">Date</Label>
              <DatePicker
                id="incident-date"
                value={formData.date}
                onChange={(date) => updateField("date", date ?? new Date())}
                placeholder="Pick a date"
              />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="incident-time">Incident Time</Label>
              <Input
                id="incident-time"
                type="time"
                value={formData.time}
                onChange={(e) => updateField("time", e.target.value)}
              />
              {errors.time && (
                <p className="text-sm text-destructive">{errors.time}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="incident-description">Description</Label>
            <Textarea
              id="incident-description"
              rows={4}
              value={formData.description}
              className={cn(
                "shadow-xs input-shadow transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:ring-destructive/20"
              )}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
            />
            <p className="text-sm text-muted-foreground">
              Optional details about the incident.
            </p>
          </div>

          <div className="flex justify-center gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving changes..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
