import DatePicker from "@/components/DatePicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PartyDto } from "@/lib/api/party/party.types";
import { format } from "date-fns";
import { useState } from "react";

export interface AddIncidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incidentType: "complaint" | "warning" | "citation";
  party: PartyDto | null;
}

export default function AddIncidentDialog({
  open,
  onOpenChange,
  incidentType,
  party,
}: AddIncidentDialogProps) {
  const title = incidentType.charAt(0).toUpperCase() + incidentType.slice(1);

  type IncidentFormValues = {
    partyDate: Date | null;
    partyTime: string;
    description: string;
  };

  const getInitialValues = (
    currentParty: PartyDto | null
  ): IncidentFormValues =>
    currentParty
      ? {
          partyDate: currentParty.party_datetime,
          partyTime: format(currentParty.party_datetime, "HH:mm"),
          description: "",
        }
      : {
          partyDate: null,
          partyTime: "",
          description: "",
        };

  const [formData, setFormData] = useState<IncidentFormValues>(() =>
    getInitialValues(party)
  );

  const updateField = <K extends keyof IncidentFormValues>(
    field: K,
    value: IncidentFormValues[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add {title}</DialogTitle>
          <DialogDescription>
            Record a {incidentType} for this location.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="party-date">Party Date</FieldLabel>
              <DatePicker
                id="party-date"
                dateFormat="MM/dd/yy"
                value={formData.partyDate}
                onChange={(date) => updateField("partyDate", date)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="party-time">Party Time</FieldLabel>
              <Input
                id="party-time"
                type="time"
                value={formData.partyTime}
                onChange={(e) => updateField("partyTime", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="incident-description">
              Incident description (optional)
            </Label>
            <textarea
              id="incident-description"
              className="min-h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              value={formData.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button type="submit">Save</Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
