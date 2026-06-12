"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSnackbar } from "@/contexts/SnackbarContext";
import { useDeleteParty } from "@/lib/api/party/party.queries";
import { PartyDto } from "@/lib/api/party/party.types";
import { format } from "date-fns";

interface DeletePartyDialogProps {
  party: PartyDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeletePartyDialog({
  party,
  open,
  onOpenChange,
}: DeletePartyDialogProps) {
  const { openSnackbar } = useSnackbar();
  const deletePartyMutation = useDeleteParty();

  const handleCancel = async () => {
    try {
      await deletePartyMutation.mutateAsync(party.id);
      openSnackbar("Party cancelled successfully", "success");
      onOpenChange(false);
    } catch {
      openSnackbar("Failed to cancel party", "error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Party</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel the party on{" "}
            {format(party.party_datetime, "PPP")} at{" "}
            {format(party.party_datetime, "p")}?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deletePartyMutation.isPending}
          >
            Back
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={deletePartyMutation.isPending}
          >
            {deletePartyMutation.isPending ? "Cancelling..." : "Cancel Party"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
