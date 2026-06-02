"use client";

import DatePicker from "@/components/DatePicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  INCIDENT_SEVERITY_LABELS,
  IncidentCreateDto,
  IncidentSeverity,
  NestedIncidentDto,
} from "@/lib/api/incident/incident.types";
import { LocationDto } from "@/lib/api/location/location.types";
import { cn } from "@/lib/utils";
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
      reference_id: reference_id ?? null,
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

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleValid)}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="incident-address">Selected Address</Label>
              <Input
                id="incident-address"
                value={location?.formatted_address || formattedAddress || ""}
                disabled
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Incident Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Enter incident type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INCIDENT_SEVERITIES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {INCIDENT_SEVERITY_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reference_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference ID</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value || undefined)
                        }
                        placeholder="Optional"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={(date) => field.onChange(date ?? new Date())}
                        aria-invalid={fieldState.invalid}
                        placeholder="Pick a date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Incident Time</FormLabel>
                    <FormControl>
                      <Input {...field} type="time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      className={cn(
                        "shadow-xs input-shadow transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:ring-destructive/20"
                      )}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional details about the incident.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-center gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving changes..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
