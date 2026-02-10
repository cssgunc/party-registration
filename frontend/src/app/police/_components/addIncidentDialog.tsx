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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PartyDto } from "@/lib/api/party/party.types";
import { format } from "date-fns";

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
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="incident-date">Date </Label>
              <Input
                id="incident-date"
                type="date"
                defaultValue={
                  party ? format(party.party_datetime, "yyyy-MM-dd") : ""
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="incident-time"> Time</Label>
              <Input id="incident-time" type="time" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="incident-description">
              Incident description (optional)
            </Label>
            <textarea
              id="incident-description"
              className="min-h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
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
