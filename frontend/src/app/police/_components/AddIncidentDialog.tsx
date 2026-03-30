import DatePicker from "@/components/DatePicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { useEffect, useState } from "react";

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

export default function AddIncidentDialog({
  open,
  onOpenChange,
  incidentType,
  party,
}: AddIncidentDialogProps) {
  const getInitialValues = (
    currentParty: PartyDto | null
  ): IncidentFormValues => ({
    severity: incidentType,
    partyDate: currentParty?.party_datetime ?? null,
    partyTime: currentParty ? format(currentParty.party_datetime, "HH:mm") : "",
    description: "",
  });

  const [formData, setFormData] = useState<IncidentFormValues>(() =>
    getInitialValues(party)
  );

  useEffect(() => {
    if (open) {
      setFormData(getInitialValues(party));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, party, incidentType]);

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
            Add incident
            {party ? ` at ${party.location.formatted_address}` : ""}
          </DialogTitle>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label
                className="text-black text-sm font-medium"
                htmlFor="selected-address"
              >
                Selected Address
              </label>
              <Input
                id="selected-address"
                value={party?.location.formatted_address ?? ""}
                readOnly
                className="h-8 border-0 bg-white outline-1 outline-slate-300 shadow-[0px_4px_4px_0px_rgba(111,178,220,0.10)] text-black text-sm font-medium"
              />
            </div>

            <div className="grid gap-2">
              <label
                className="text-black text-sm font-medium"
                htmlFor="incident-type"
              >
                Incident Type
              </label>
              <Select
                value={formData.severity}
                onValueChange={(v) =>
                  updateField("severity", v as IncidentSeverity)
                }
              >
                <SelectTrigger
                  id="incident-type"
                  className="h-8 border-0 bg-white outline-1 outline-slate-300 shadow-[0px_4px_4px_0px_rgba(111,178,220,0.10)] text-sm"
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
              <label
                className="text-black text-sm font-medium"
                htmlFor="party-date"
              >
                Date
              </label>
              <DatePicker
                id="party-date"
                dateFormat="MM/dd/yy"
                value={formData.partyDate}
                onChange={(date) => updateField("partyDate", date)}
                className="h-8 rounded-md outline-1 outline-slate-300 border-0"
              />
            </div>

            <div className="grid gap-2">
              <label
                className="text-black text-sm font-medium"
                htmlFor="party-time"
              >
                Time
              </label>
              <div className="flex h-8 items-center gap-2 rounded-md bg-white shadow-[0px_4px_4px_0px_rgba(111,178,220,0.10)] outline-1 outline-slate-300 px-3">
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
            <label
              className="text-black text-sm font-medium"
              htmlFor="incident-description"
            >
              Complaint
            </label>
            <Textarea
              id="incident-description"
              className="min-h-24 bg-white rounded-md border-0 outline-1 outline-slate-300"
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
