"use client";

import PartyRegistrationForm, {
  PartyFormInitialValues,
  PartyFormValues,
} from "@/app/student/_components/PartyRegistrationForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LocationService } from "@/lib/api/location/location.service";
import { useUpdateParty } from "@/lib/api/party/party.queries";
import { PartyDto, StudentCreatePartyDto } from "@/lib/api/party/party.types";
import { useCurrentStudent } from "@/lib/api/student/student.queries";
import getMockClient from "@/lib/network/mockClient";
import { format } from "date-fns";

interface EditPartyDialogProps {
  party: PartyDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPartyDialog({
  party,
  open,
  onOpenChange,
}: EditPartyDialogProps) {
  const updatePartyMutation = useUpdateParty();
  const studentQuery = useCurrentStudent();

  const partyDate = new Date(party.party_datetime);
  const initialValues: PartyFormInitialValues = {
    address: party.location.formatted_address,
    placeId: party.location.google_place_id,
    partyDate,
    partyTime: format(partyDate, "HH:mm"),
    secondContactFirstName: party.contact_two.first_name,
    secondContactLastName: party.contact_two.last_name,
    phoneNumber: party.contact_two.phone_number,
    contactPreference: party.contact_two.contact_preference,
    contactTwoEmail: party.contact_two.email,
  };

  const formToData = (
    values: PartyFormValues,
    placeId: string
  ): StudentCreatePartyDto => {
    const [hours, minutes] = values.partyTime.split(":");
    const partyDateTime = new Date(values.partyDate);
    partyDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    return {
      type: "student",
      party_datetime: partyDateTime,
      google_place_id: placeId,
      contact_two: {
        email: values.contactTwoEmail,
        first_name: values.secondContactFirstName,
        last_name: values.secondContactLastName,
        phone_number: values.phoneNumber.replace(/\D/g, ""),
        contact_preference: values.contactPreference,
      },
    };
  };

  const handleSubmit = async (values: PartyFormValues, placeId: string) => {
    try {
      const partyData = formToData(values, placeId);
      await updatePartyMutation.mutateAsync({
        partyId: party.id,
        data: partyData,
      });
      onOpenChange(false);
    } catch {
      alert("Failed to update party");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Party</DialogTitle>
        </DialogHeader>
        <PartyRegistrationForm
          onSubmit={handleSubmit}
          locationService={new LocationService(getMockClient("student"))}
          initialValues={initialValues}
          studentEmail={studentQuery.data?.email}
          studentPhoneNumber={studentQuery.data?.phone_number}
          mode="edit"
        />
      </DialogContent>
    </Dialog>
  );
}
