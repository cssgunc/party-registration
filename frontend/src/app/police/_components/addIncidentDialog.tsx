import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PartyDto } from "@/lib/api/party/party.types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
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

  const shortAddress = party?.location.formatted_address ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[619px] bg-card">
        <DialogHeader>
          <DialogTitle className="text-center content-bold">
            Editing incident at {shortAddress}
          </DialogTitle>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="selected-address">
                Selected Address
              </FieldLabel>
              <Input
                id="selected-address"
                value={shortAddress}
                readOnly
                className="bg-white"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="incident-type">Incident Type</FieldLabel>
              <Input
                id="incident-type"
                value={title}
                readOnly
                className="bg-white"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="party-date">Date</FieldLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="party-date"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.partyDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4 opacity-50" />
                    {formData.partyDate ? (
                      format(formData.partyDate, "MM/dd/yy")
                    ) : (
                      <span>Pick a date</span>
                    )}
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
              <FieldLabel htmlFor="party-time">Time</FieldLabel>
              <Input
                id="party-time"
                type="time"
                placeholder="Enter Time..."
                value={formData.partyTime}
                onChange={(e) => updateField("partyTime", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-2">
            <FieldLabel htmlFor="incident-description">{title}</FieldLabel>
            <textarea
              id="incident-description"
              className="min-h-16 rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] resize-none"
              value={formData.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
            />
          </div>

          <DialogFooter className="justify-center sm:justify-center">
            <DialogClose asChild>
              <Button
                type="submit"
                className="bg-secondary text-primary-foreground hover:bg-secondary/90"
              >
                Save Changes
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
