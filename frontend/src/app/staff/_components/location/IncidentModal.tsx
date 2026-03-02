"use client";

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
import { useEffect } from "react";
import { useForm } from "react-hook-form";

function toLocalDatetimeString(date: Date) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - tzOffset);
  return local.toISOString().slice(0, 16);
}

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

  useEffect(() => {
    if (incident) {
      form.reset({
        incident_datetime: incident.incident_datetime,
        description: incident.description,
        severity: incident.severity,
      });
    } else {
      form.reset({
        incident_datetime: new Date(),
        description: "",
        severity: "complaint",
      });
    }
  }, [incident, form]);

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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date & Time</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      value={
                        field.value
                          ? toLocalDatetimeString(new Date(field.value))
                          : ""
                      }
                      onChange={(e) => field.onChange(new Date(e.target.value))}
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
