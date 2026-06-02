"use client";

import AddressSearch from "@/components/AddressSearch";
import DatePicker from "@/components/DatePicker";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldSet } from "@/components/ui/field";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
}

export default function LocationTableForm({
  onSubmit,
  editData,
  submissionError,
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
    defaultValues: {
      address: editData?.address ?? "",
      placeId: editData?.placeId ?? "",
      holdExpiration: editData?.holdExpiration ?? null,
    },
  });
  const isSubmitting = form.formState.isSubmitting;

  const handleAddressSelect = (address: AutocompleteResult | null) => {
    form.setValue("address", address?.formatted_address || "", {
      shouldValidate: true,
    });
    form.setValue("placeId", address?.google_place_id || "", {
      shouldValidate: true,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <FieldSet>
            <FormField
              control={form.control}
              name="address"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <AddressSearch
                      value={field.value}
                      initialSelection={initialAddressSelection}
                      onSelect={handleAddressSelect}
                      placeholder="Search for the location address..."
                      className="w-full"
                      error={fieldState.error?.message}
                      chapelHillOnly
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="holdExpiration"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    Hold Expiration
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <Info className="h-3.5 w-3.5 cursor-pointer text-muted-foreground ml-1" />
                      </HoverCardTrigger>
                      <HoverCardContent className="max-w-64">
                        A location has an active hold when a hold expiration
                        date is set and has not yet passed. An active hold
                        prevents students from registering parties at this
                        location.
                      </HoverCardContent>
                    </HoverCard>
                  </FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      aria-invalid={fieldState.invalid}
                      disabled={(date) =>
                        !isAfter(
                          startOfDay(date),
                          addBusinessDays(startOfDay(new Date()), 1)
                        )
                      }
                      forwardDate={true}
                      clearable
                    />
                  </FormControl>
                  <FormDescription>
                    Leave blank if there is no hold on this location.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3 *:w-full">
              {submissionError && (
                <div
                  className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                  role="alert"
                >
                  {submissionError}
                </div>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Save Changes"}
              </Button>
            </div>
          </FieldSet>
        </FieldGroup>
      </form>
    </Form>
  );
}
