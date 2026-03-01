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
  const deletePartyMutation = useDeleteParty();

  const handleDelete = async () => {
    try {
      await deletePartyMutation.mutateAsync(party.id);
      onOpenChange(false);
    } catch {
      alert("Failed to delete party");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Party</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the party on{" "}
            {format(party.party_datetime, "PPP")} at{" "}
            {format(party.party_datetime, "p")}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deletePartyMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deletePartyMutation.isPending}
          >
            {deletePartyMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
