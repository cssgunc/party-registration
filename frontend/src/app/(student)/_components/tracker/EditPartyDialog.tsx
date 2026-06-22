"use client";

import PartyRegistrationForm, {
  PartyFormInitialValues,
  PartyFormValues,
  partyFormValuesToDto,
} from "@/app/(student)/_components/PartyRegistrationForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSnackbar } from "@/contexts/SnackbarContext";
import { useUpdateParty } from "@/lib/api/party/party.queries";
import {
  PartyStudentDto,
  getPartyValidationError,
} from "@/lib/api/party/party.types";
import { useCurrentStudent } from "@/lib/api/student/student.queries";
import { getErrorMessage } from "@/lib/errors";
import { format } from "date-fns";
import { useState } from "react";

interface EditPartyDialogProps {
  party: PartyStudentDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPartyDialog({
  party,
  open,
  onOpenChange,
}: EditPartyDialogProps) {
  const { openSnackbar } = useSnackbar();
  const updatePartyMutation = useUpdateParty();
  const studentQuery = useCurrentStudent();
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const partyDate = new Date(party.party_datetime);
  const initialValues: PartyFormInitialValues = {
    location: {
      formatted_address: party.location.formatted_address,
      google_place_id: party.location.google_place_id,
    },
    partyDate,
    partyTime: format(partyDate, "HH:mm"),
    secondContactFirstName: party.contact_two.first_name,
    secondContactLastName: party.contact_two.last_name,
    phoneNumber: party.contact_two.phone_number,
    contactPreference: party.contact_two.contact_preference,
    contactTwoEmail: party.contact_two.email,
  };

  const handleSubmit = async (values: PartyFormValues) => {
    setSubmissionError(null);
    try {
      const partyData = partyFormValuesToDto(values);
      await updatePartyMutation.mutateAsync({
        partyId: party.id,
        data: partyData,
      });
      openSnackbar("Party updated successfully", "success");
      onOpenChange(false);
    } catch (error) {
      const validationError = getPartyValidationError(error);
      if (validationError) {
        setSubmissionError(validationError.message);
      } else {
        openSnackbar(getErrorMessage(error), "error");
      }
    }
  };

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setSubmissionError(null);
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Party</DialogTitle>
          <DialogDescription className="sr-only">
            Edit the details of your registered party.
          </DialogDescription>
        </DialogHeader>
        <PartyRegistrationForm
          onSubmit={handleSubmit}
          initialValues={initialValues}
          student={studentQuery.data}
          mode="edit"
          submissionError={submissionError}
        />
      </DialogContent>
    </Dialog>
  );
}
