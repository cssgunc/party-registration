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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  IncidentCreateDto,
  IncidentDto,
  IncidentSeverity,
  LocationDto,
} from "@/lib/api/location/location.types";
import { useForm } from "react-hook-form";

type Mode = "create" | "edit";

interface IncidentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  incident?: IncidentDto;
  onSubmit: (data: IncidentCreateDto) => void;
  isSubmitting?: boolean;
  location: LocationDto;
}

export default function IncidentModal({
  open,
  onOpenChange,
  mode,
  incident,
  onSubmit,
  isSubmitting = false,
  location,
}: IncidentModalProps) {
  const form = useForm<IncidentCreateDto>({
    defaultValues: {
      incident_datetime: incident?.incident_datetime ?? new Date(),
      description: incident?.description ?? "",
      severity: incident?.severity ?? ("in_person_warning" as IncidentSeverity),
    },
  });

  const handleSubmit = (values: IncidentCreateDto) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card">
        <DialogHeader>
          <DialogTitle>
            <p className="flex items-center justify-center gap-2">
              {mode === "create" ? "Creating Incident" : "Editing Incident"} at{" "}
              {location.street_number} {location.street_name} Chapel Hill
            </p>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <FormLabel className="pb-2">Address</FormLabel>
                <Input
                  type="text"
                  disabled
                  value={`${location.street_number} ${location.street_name} Chapel Hill`}
                />
              </div>

              <div className="col-span-1">
                <FormField
                  control={form.control}
                  name="severity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Incident Type</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Enter incident type" />
                          </SelectTrigger>
                          <SelectContent>
                            {(
                              [
                                "in_person_warning",
                                "remote_warning",
                                "citation",
                              ] as IncidentSeverity[]
                            ).map((s) => (
                              <SelectItem key={s} value={s}>
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="incident_datetime"
                render={() => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <FormField
                        control={form.control}
                        name="incident_datetime"
                        render={({ field }) => {
                          const date = field.value
                            ? new Date(field.value)
                            : new Date();

                          return (
                            <FormControl>
                              <DatePicker
                                value={date}
                                onChange={(newDate) => {
                                  if (!newDate) return;

                                  const updated = new Date(date);
                                  updated.setFullYear(
                                    newDate.getFullYear(),
                                    newDate.getMonth(),
                                    newDate.getDate()
                                  );
                                  field.onChange(updated);
                                }}
                                placeholder="Pick a date"
                              />
                            </FormControl>
                          );
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="incident_datetime"
                render={() => (
                  <FormItem>
                    <FormLabel>Incident Time</FormLabel>
                    <FormControl>
                      <FormField
                        control={form.control}
                        name="incident_datetime"
                        render={({ field }) => {
                          const date = field.value
                            ? new Date(field.value)
                            : new Date();

                          return (
                            <FormControl>
                              <Input
                                type="time"
                                value={date.toTimeString().slice(0, 5)}
                                onChange={(e) => {
                                  const [hours, minutes] =
                                    e.target.value.split(":");
                                  const updated = new Date(date);
                                  updated.setHours(
                                    Number(hours),
                                    Number(minutes)
                                  );
                                  field.onChange(updated);
                                }}
                              />
                            </FormControl>
                          );
                        }}
                      />
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
                    <Textarea {...field} rows={4} />
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
                {isSubmitting ? "Saving changes..." : "Save changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
