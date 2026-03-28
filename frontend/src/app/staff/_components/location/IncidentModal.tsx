"use client";

import DatePicker from "@/components/DatePicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
}

export default function IncidentModal({
  open,
  onOpenChange,
  mode,
  incident,
  onSubmit,
  isSubmitting = false,
}: IncidentModalProps) {
  const form = useForm<IncidentCreateDto>({
    defaultValues: {
      incident_datetime: incident?.incident_datetime ?? new Date(),
      description: incident?.description ?? "",
      severity: incident?.severity ?? ("complaint" as IncidentSeverity),
    },
  });

  const handleSubmit = (values: IncidentCreateDto) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Incident" : "Edit Incident"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Provide information to create a new incident."
              : "Update the incident details below."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="incident_datetime"
              render={() => (
                <FormItem>
                  <FormLabel>Date & Time</FormLabel>
                  <FormControl>
                    <FormField
                      control={form.control}
                      name="incident_datetime"
                      render={({ field }) => {
                        const date = field.value
                          ? new Date(field.value)
                          : new Date();

                        return (
                          <FormItem className="flex flex-row">
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

                            <FormMessage />
                          </FormItem>
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
              name="severity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Severity</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          [
                            "complaint",
                            "warning",
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

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
