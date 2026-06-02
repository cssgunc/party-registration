"use client";

import AddressSearch from "@/components/AddressSearch";
import DatePicker from "@/components/DatePicker";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldSet } from "@/components/ui/field";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  INCIDENT_SEVERITY_LABELS,
  IncidentCreateDto,
  IncidentDto,
  IncidentSeverity,
} from "@/lib/api/incident/incident.types";
import { LocationService } from "@/lib/api/location/location.service";
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
  incident_datetime: z.date({
    message: "Incident date is required",
  }),
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
  const locationService = new LocationService();

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
  const isSubmitting = form.formState.isSubmitting;

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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleValid)}>
        <FieldGroup>
          <FieldSet>
            <FormField
              control={form.control}
              name="location_place_id"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <AddressSearch
                      value={
                        field.value === editData?.location?.google_place_id
                          ? (editData?.location?.formatted_address ?? "")
                          : ""
                      }
                      initialSelection={initialAddressSelection}
                      onSelect={(address) =>
                        field.onChange(address?.google_place_id || "")
                      }
                      locationService={locationService}
                      placeholder="Search for the location address..."
                      className="w-full"
                      error={fieldState.error?.message}
                      chapelHillOnly
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="incident_datetime"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Incident Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        dateFormat="MM/dd/yy"
                        value={field.value ?? null}
                        onChange={field.onChange}
                        aria-invalid={fieldState.invalid}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="incident_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Incident Time</FormLabel>
                    <FormControl>
                      <Input {...field} type="time" autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="severity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Severity</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {incidentSeverityValues.map((severity) => (
                        <SelectItem key={severity} value={severity}>
                          {INCIDENT_SEVERITY_LABELS[severity]}
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
                      placeholder="Optional"
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormDescription>
                    Add a ticket or report ID if one exists.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Optional"
                      className=" w-full min-h-24 px-3 py-2 rounded-md border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-vertical shadow-xs input-shadow transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 "
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              {submissionError && (
                <div
                  className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                  role="alert"
                >
                  {submissionError}
                </div>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Save"}
              </Button>
            </div>
          </FieldSet>
        </FieldGroup>
      </form>
    </Form>
  );
}
