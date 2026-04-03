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
import { IncidentSeverity } from "@/lib/api/location/location.types";
import { PartyDto } from "@/lib/api/party/party.types";
import { format } from "date-fns";
import { ClockIcon } from "lucide-react";
import { useState } from "react";

export interface AddIncidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incidentType: IncidentSeverity;
  party: PartyDto | null;
}

type IncidentFormValues = {
  severity: IncidentSeverity;
  partyDate: Date | null;
  partyTime: string;
  description: string;
};

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
  const [formData, setFormData] = useState<IncidentFormValues>({
    severity: incidentType,
    partyDate: party?.party_datetime ?? null,
    partyTime: party ? format(party.party_datetime, "HH:mm") : "",
    description: "",
  });

  const updateField = <K extends keyof IncidentFormValues>(
    field: K,
    value: IncidentFormValues[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white rounded-2xl shadow-[0px_4px_4px_0px_rgba(111,178,220,0.25)] border-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center text-sm font-medium text-black">
            Add Incident
            {party ? ` at ${getDisplayAddress(party)}` : ""}
          </DialogTitle>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="selected-address">Selected Address</Label>
              <Input
                id="selected-address"
                value={getDisplayAddress(party)}
                readOnly
                className="h-8 bg-white border-zinc-300 text-black text-sm font-medium"
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
                  className="h-8 border-zinc-300 bg-white text-sm"
                >
                  <SelectValue placeholder="Enter Incident Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="complaint">Complaint</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
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
                onChange={(date) => updateField("partyDate", date)}
                className="h-8 rounded-md border-zinc-300 border-0"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="party-time">Time</Label>
              <div className="flex h-8 items-center gap-2 rounded-md bg-white input-shadow border border-zinc-300 px-3">
                <ClockIcon className="size-4 shrink-0 text-neutral-500" />
                <input
                  id="party-time"
                  type="time"
                  value={formData.partyTime}
                  onChange={(e) => updateField("partyTime", e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none [color-scheme:light]"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="incident-description">Description (Optional)</Label>
            <Textarea
              id="incident-description"
              className="min-h-24 bg-white rounded-md border-zinc-300"
              value={formData.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
            />
          </div>

          <div className="flex justify-center">
            <Button
              type="submit"
              className="bg-sky-950 rounded-md text-white text-sm font-medium px-8"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
