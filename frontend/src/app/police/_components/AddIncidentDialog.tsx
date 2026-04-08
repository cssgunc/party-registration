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
import { useSnackbar } from "@/contexts/SnackbarContext";
import { useCreateIncident } from "@/lib/api/incident/incident.queries";
import { IncidentSeverity } from "@/lib/api/location/location.types";
import { PartyDto } from "@/lib/api/party/party.types";
import { format } from "date-fns";
import { ClockIcon } from "lucide-react";
import { useState } from "react";
import * as z from "zod";

const incidentSeverityValues: IncidentSeverity[] = [
  "remote_warning",
  "in_person_warning",
  "citation",
];

const addIncidentSchema = z.object({
  severity: z.enum(incidentSeverityValues),
  partyDate: z.date({ message: "Date is required" }),
  partyTime: z.string().min(1, "Time is required"),
  description: z.string(),
});

type AddIncidentFormValues = z.infer<typeof addIncidentSchema>;

export interface AddIncidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incidentType: IncidentSeverity;
  party: PartyDto | null;
}

const getDisplayAddress = (party: PartyDto | null): string => {
  if (!party) return "";
  const { street_number, street_name, city } = party.location;
  const street = [street_number, street_name].filter(Boolean).join(" ");
  return city
    ? street
      ? `${street}, ${city}`
      : city
    : party.location.formatted_address;
};

export default function AddIncidentDialog({
  open,
  onOpenChange,
  incidentType,
  party,
}: AddIncidentDialogProps) {
  const [formData, setFormData] = useState<AddIncidentFormValues>({
    severity: incidentType,
    partyDate: party?.party_datetime ?? new Date(),
    partyTime: party ? format(party.party_datetime, "HH:mm") : "",
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { openSnackbar } = useSnackbar();

  const updateField = <K extends keyof AddIncidentFormValues>(
    field: K,
    value: AddIncidentFormValues[K]
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

  const createMutation = useCreateIncident({
    onSuccess: () => {
      openSnackbar("Incident created successfully", "success");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      openSnackbar(error.message || "Failed to create incident", "error");
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const result = addIncidentSchema.safeParse(formData);

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

    if (!party) return;

    const { partyDate, partyTime, severity, description } = result.data;
    const [hours, minutes] = partyTime.split(":").map(Number);
    const incident_datetime = new Date(partyDate);
    incident_datetime.setHours(hours ?? 0, minutes ?? 0, 0, 0);

    setErrors({});
    createMutation.mutate({
      location_place_id: party.location.google_place_id,
      incident_datetime,
      description,
      severity,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card rounded-2xl card-shadow border-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center content-bold text-foreground">
            Add Incident
            {party ? ` at ${getDisplayAddress(party)}` : ""}
          </DialogTitle>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="selected-address">Selected Address</Label>
              <Input
                id="selected-address"
                value={getDisplayAddress(party)}
                readOnly
                className="h-8 bg-card border-border text-foreground content-bold"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="incident-type">Incident Type</Label>
              <Select
                value={formData.severity}
                onValueChange={(v) =>
                  updateField("severity", v as IncidentSeverity)
                }
              >
                <SelectTrigger
                  id="incident-type"
                  className="h-8 border-border bg-card content"
                >
                  <SelectValue placeholder="Enter Incident Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote_warning">Remote Warning</SelectItem>
                  <SelectItem value="in_person_warning">
                    In-Person Warning
                  </SelectItem>
                  <SelectItem value="citation">Citation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="party-date">Date</Label>
              <DatePicker
                id="party-date"
                dateFormat="MM/dd/yy"
                value={formData.partyDate}
                onChange={(date) =>
                  updateField("partyDate", date ?? new Date())
                }
                className="h-8 rounded-md border-border border-0"
              />
              {errors.partyDate && (
                <p className="text-sm text-destructive">{errors.partyDate}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="party-time">Time</Label>
              <div
                className={`flex h-8 items-center gap-2 rounded-md bg-card input-shadow border px-3 ${errors.partyTime ? "border-destructive" : "border-border"}`}
              >
                <ClockIcon className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  id="party-time"
                  type="time"
                  value={formData.partyTime}
                  onChange={(e) => updateField("partyTime", e.target.value)}
                  className="flex-1 h-auto border-0 bg-transparent p-0 content shadow-none focus-visible:ring-0 [color-scheme:light]"
                />
              </div>
              {errors.partyTime && (
                <p className="text-sm text-destructive">{errors.partyTime}</p>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="incident-description">Description (Optional)</Label>
            <Textarea
              id="incident-description"
              className="min-h-24 bg-card rounded-md border-border"
              value={formData.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
            />
          </div>

          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-secondary rounded-md text-primary-foreground content-bold px-8"
            >
              {createMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
