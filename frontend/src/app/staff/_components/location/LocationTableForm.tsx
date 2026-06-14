"use client";

import { FormShell } from "@/components/form/FormShell";
import { AddressField, DateField } from "@/components/form/fields";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { AutocompleteResult } from "@/lib/api/location/location.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { addBusinessDays, isAfter, startOfDay } from "date-fns";
import { Info } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";

export const locationTableFormSchema = z.object({
  address: z.string().min(1, "Address is required"),
  placeId: z
    .string()
    .min(1, "Please select an address from the search results"),
  holdExpiration: z.date().nullable(),
});

type LocationTableFormValues = z.infer<typeof locationTableFormSchema>;

interface LocationTableFormProps {
  onSubmit: (data: LocationTableFormValues) => void | Promise<void>;
  editData?: LocationTableFormValues;
  submissionError?: string | null;
  isPending?: boolean;
}

export default function LocationTableForm({
  onSubmit,
  editData,
  submissionError,
  isPending,
}: LocationTableFormProps) {
  const initialAddressSelection: AutocompleteResult | null =
    editData?.address && editData?.placeId
      ? {
          formatted_address: editData.address,
          google_place_id: editData.placeId,
        }
      : null;

  const form = useForm<
    z.input<typeof locationTableFormSchema>,
    unknown,
    LocationTableFormValues
  >({
    resolver: zodResolver(locationTableFormSchema),
    mode: "onBlur",
    defaultValues: {
      address: editData?.address ?? "",
      placeId: editData?.placeId ?? "",
      holdExpiration: editData?.holdExpiration ?? null,
    },
  });

  return (
    <FormShell
      form={form}
      onSubmit={onSubmit}
      submitLabel="Save Changes"
      submissionError={submissionError}
      pending={isPending}
    >
      <AddressField
        control={form.control}
        name="address"
        label="Address"
        placeholder="Search for the location address..."
        chapelHillOnly
        initialSelection={initialAddressSelection}
        onSelect={(address) =>
          form.setValue("placeId", address?.google_place_id || "", {
            shouldValidate: true,
          })
        }
      />

      <DateField
        control={form.control}
        name="holdExpiration"
        labelClassName="flex items-center gap-1"
        label={
          <>
            Hold Expiration
            <HoverCard>
              <HoverCardTrigger asChild>
                <Info className="h-3.5 w-3.5 cursor-pointer text-muted-foreground ml-1" />
              </HoverCardTrigger>
              <HoverCardContent className="max-w-64">
                A location has an active hold when a hold expiration date is set
                and has not yet passed. An active hold prevents students from
                registering parties at this location.
              </HoverCardContent>
            </HoverCard>
          </>
        }
        description="Leave blank if there is no hold on this location."
        forwardDate={true}
        clearable
        disabled={(date) =>
          !isAfter(startOfDay(date), addBusinessDays(startOfDay(new Date()), 1))
        }
      />
    </FormShell>
  );
}
