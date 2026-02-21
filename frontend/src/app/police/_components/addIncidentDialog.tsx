import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PartyDto } from "@/lib/api/party/party.types";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    setFormData(getInitialValues(party));
  }, [party]);

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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="party-date"
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${
                      !formData.partyDate && "text-muted-foreground"
                    }`}
                  >
                    {formData.partyDate ? (
                      format(formData.partyDate, "MM/dd/yy")
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.partyDate ?? undefined}
                    onSelect={(date) => updateField("partyDate", date as Date)}
                  />
                </PopoverContent>
              </Popover>
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
